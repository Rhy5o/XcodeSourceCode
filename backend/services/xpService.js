const pool = require('../db/pool');
const seasonService = require('./seasonService');

async function resolveSeasonNumber(season) {
    if (season === undefined || season === null || season === 'current') {
        return seasonService.getCurrentSeason();
    }
    const parsed = Number(season);
    if (!Number.isInteger(parsed) || parsed < 1) {
        const err = new Error('season must be "current" or a positive integer');
        err.status = 400;
        throw err;
    }
    return parsed;
}

async function getLeaderboard({ season = 'current', limit = 25, page = 1 } = {}) {
    const seasonNumber = await resolveSeasonNumber(season);
    const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    const [totalResult, rowsResult] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS count FROM user_xp WHERE season_number = $1`, [seasonNumber]),
        pool.query(
            `SELECT u.id AS user_id, u.username, u.reg_plate, x.total_xp, x.wins, x.losses,
                    RANK() OVER (ORDER BY x.total_xp DESC, x.wins DESC) AS rank
             FROM user_xp x
             JOIN users u ON u.id = x.user_id
             WHERE x.season_number = $1
             ORDER BY x.total_xp DESC, x.wins DESC
             LIMIT $2 OFFSET $3`,
            [seasonNumber, safeLimit, offset]
        )
    ]);

    const total = totalResult.rows[0].count;
    return {
        season: seasonNumber,
        leaderboard: rowsResult.rows,
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit))
    };
}

async function getUserSeasonStats(userId, season = 'current') {
    const seasonNumber = await resolveSeasonNumber(season);
    const result = await pool.query(
        `SELECT total_xp, wins, losses, rank FROM (
             SELECT user_id, total_xp, wins, losses,
                    RANK() OVER (ORDER BY total_xp DESC, wins DESC) AS rank
             FROM user_xp WHERE season_number = $1
         ) ranked
         WHERE user_id = $2`,
        [seasonNumber, userId]
    );
    return result.rows[0] || { total_xp: 0, wins: 0, losses: 0, rank: null };
}

module.exports = { getLeaderboard, getUserSeasonStats, resolveSeasonNumber };
