const pool = require('../db/pool');
const seasonService = require('./seasonService');

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

async function getUserClanId(userId) {
    const result = await pool.query(`SELECT clan_id FROM clan_members WHERE user_id = $1`, [userId]);
    return result.rows[0] ? result.rows[0].clan_id : null;
}

async function createClan(name, description, leaderId) {
    if (!name || !name.trim()) {
        throw httpError(400, 'name is required');
    }
    const existingClanId = await getUserClanId(leaderId);
    if (existingClanId) {
        throw httpError(400, 'You must leave your current clan before creating a new one');
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const clanResult = await client.query(
            `INSERT INTO clans (name, description, leader_id, member_count)
             VALUES ($1, $2, $3, 1)
             RETURNING *`,
            [name.trim(), description || null, leaderId]
        );
        const clan = clanResult.rows[0];

        await client.query(
            `INSERT INTO clan_members (clan_id, user_id, role) VALUES ($1, $2, 'leader')`,
            [clan.id, leaderId]
        );
        await client.query('COMMIT');
        return clan;
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') throw httpError(409, 'A clan with that name already exists');
        throw err;
    } finally {
        client.release();
    }
}

async function joinClan(userId, clanId) {
    const clanResult = await pool.query(`SELECT id FROM clans WHERE id = $1`, [clanId]);
    if (!clanResult.rows[0]) throw httpError(404, 'Clan not found');

    const existingClanId = await getUserClanId(userId);
    if (existingClanId === clanId) throw httpError(400, 'You are already in this clan');
    if (existingClanId) throw httpError(400, 'You must leave your current clan before joining another');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`INSERT INTO clan_members (clan_id, user_id, role) VALUES ($1, $2, 'member')`, [
            clanId,
            userId
        ]);
        await client.query(`UPDATE clans SET member_count = member_count + 1 WHERE id = $1`, [clanId]);
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function leaveClan(userId, clanId) {
    const memberResult = await pool.query(
        `SELECT role FROM clan_members WHERE clan_id = $1 AND user_id = $2`,
        [clanId, userId]
    );
    const membership = memberResult.rows[0];
    if (!membership) throw httpError(404, 'You are not a member of this clan');
    if (membership.role === 'leader') {
        throw httpError(400, 'The leader cannot leave the clan — disband it or transfer leadership first');
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`DELETE FROM clan_members WHERE clan_id = $1 AND user_id = $2`, [clanId, userId]);
        await client.query(`UPDATE clans SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1`, [clanId]);
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// Not in the original Stage 7 route list, but item 16's "if user is leader:
// kick members" needs a backend action to call — added here rather than
// leaving the frontend button non-functional.
async function kickMember(leaderId, clanId, targetUserId) {
    const clanResult = await pool.query(`SELECT leader_id FROM clans WHERE id = $1`, [clanId]);
    const clan = clanResult.rows[0];
    if (!clan) throw httpError(404, 'Clan not found');
    if (clan.leader_id !== leaderId) throw httpError(403, 'Only the clan leader can remove members');
    if (targetUserId === leaderId) throw httpError(400, 'The leader cannot kick themselves');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const deleteResult = await client.query(
            `DELETE FROM clan_members WHERE clan_id = $1 AND user_id = $2 RETURNING id`,
            [clanId, targetUserId]
        );
        if (deleteResult.rows.length === 0) throw httpError(404, 'That user is not a member of this clan');
        await client.query(`UPDATE clans SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1`, [clanId]);
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function getClan(clanId) {
    const result = await pool.query(
        `SELECT clans.*, users.username AS leader_username
         FROM clans JOIN users ON users.id = clans.leader_id
         WHERE clans.id = $1`,
        [clanId]
    );
    return result.rows[0] || null;
}

async function listClans({ q, sort = 'members', page = 1, limit = 25 } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;
    const orderBy = sort === 'xp' ? 'total_xp' : 'clans.member_count';

    const seasonNumber = await seasonService.getCurrentSeason();
    const whereClause = q ? `WHERE clans.name ILIKE $1` : '';
    const params = q ? [`%${q}%`] : [];

    const totalResult = await pool.query(`SELECT COUNT(*)::int AS count FROM clans ${whereClause}`, params);

    const rowsResult = await pool.query(
        `SELECT clans.*, users.username AS leader_username,
                COALESCE(SUM(x.total_xp), 0)::int AS total_xp
         FROM clans
         JOIN users ON users.id = clans.leader_id
         LEFT JOIN clan_members cm ON cm.clan_id = clans.id
         LEFT JOIN user_xp x ON x.user_id = cm.user_id AND x.season_number = $${params.length + 1}
         ${whereClause}
         GROUP BY clans.id, users.username
         ORDER BY ${orderBy} DESC
         LIMIT $${params.length + 2} OFFSET $${params.length + 3}`,
        [...params, seasonNumber, safeLimit, offset]
    );

    return {
        clans: rowsResult.rows,
        page: safePage,
        limit: safeLimit,
        total: totalResult.rows[0].count,
        totalPages: Math.max(1, Math.ceil(totalResult.rows[0].count / safeLimit))
    };
}

async function getClanMembers(clanId) {
    const result = await pool.query(
        `SELECT users.id AS user_id, users.username, clan_members.role, clan_members.joined_at
         FROM clan_members
         JOIN users ON users.id = clan_members.user_id
         WHERE clan_members.clan_id = $1
         ORDER BY (clan_members.role = 'leader') DESC, clan_members.joined_at ASC`,
        [clanId]
    );
    return result.rows;
}

async function getClanLeaderboard(clanId) {
    const seasonNumber = await seasonService.getCurrentSeason();
    const result = await pool.query(
        `SELECT users.id AS user_id, users.username, clan_members.role,
                COALESCE(x.total_xp, 0) AS total_xp,
                COALESCE(x.wins, 0) AS wins,
                COALESCE(x.losses, 0) AS losses
         FROM clan_members
         JOIN users ON users.id = clan_members.user_id
         LEFT JOIN user_xp x ON x.user_id = users.id AND x.season_number = $2
         WHERE clan_members.clan_id = $1
         ORDER BY total_xp DESC, wins DESC`,
        [clanId, seasonNumber]
    );
    return result.rows;
}

async function getClanStats(clanId) {
    const seasonNumber = await seasonService.getCurrentSeason();
    const result = await pool.query(
        `SELECT
             COALESCE(SUM(x.total_xp), 0)::int AS total_xp,
             COALESCE(SUM(x.wins), 0)::int AS total_wins,
             COALESCE(SUM(x.losses), 0)::int AS total_losses,
             COUNT(cm.user_id)::int AS member_count
         FROM clan_members cm
         LEFT JOIN user_xp x ON x.user_id = cm.user_id AND x.season_number = $2
         WHERE cm.clan_id = $1`,
        [clanId, seasonNumber]
    );
    const stats = result.rows[0];

    const rankResult = await pool.query(
        `SELECT AVG(rank)::float AS avg_rank FROM (
             SELECT user_id, RANK() OVER (ORDER BY total_xp DESC, wins DESC) AS rank
             FROM user_xp WHERE season_number = $2
         ) ranked
         WHERE ranked.user_id IN (SELECT user_id FROM clan_members WHERE clan_id = $1)`,
        [clanId, seasonNumber]
    );
    const avgRank = rankResult.rows[0].avg_rank;

    return { ...stats, avgRank: avgRank !== null ? Math.round(avgRank * 10) / 10 : null };
}

module.exports = {
    createClan,
    joinClan,
    leaveClan,
    kickMember,
    getUserClanId,
    getClan,
    listClans,
    getClanMembers,
    getClanLeaderboard,
    getClanStats
};
