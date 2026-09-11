const pool = require('../db/pool');
const seasonService = require('./seasonService');
const cacheService = require('./cacheService');

async function resolveSeason(season) {
    const currentSeason = await seasonService.getCurrentSeason();
    if (season === undefined || season === null || season === 'current') {
        return { seasonNumber: currentSeason, isCurrent: true };
    }
    const parsed = Number(season);
    if (!Number.isInteger(parsed) || parsed < 1) {
        const err = new Error('season must be "current" or a positive integer');
        err.status = 400;
        throw err;
    }
    return { seasonNumber: parsed, isCurrent: parsed === currentSeason };
}

async function resolveSeasonNumber(season) {
    return (await resolveSeason(season)).seasonNumber;
}

async function fetchLeaderboard(seasonNumber, isCurrent, safeLimit, offset) {
    const table = isCurrent ? 'user_xp' : 'user_xp_archive';
    const [totalResult, rowsResult] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS count FROM ${table} WHERE season_number = $1`, [seasonNumber]),
        pool.query(
            `SELECT u.id AS user_id, u.username, u.reg_plate, x.total_xp, x.wins, x.losses,
                    RANK() OVER (ORDER BY x.total_xp DESC, x.wins DESC) AS rank
             FROM ${table} x
             JOIN users u ON u.id = x.user_id
             WHERE x.season_number = $1
             ORDER BY x.total_xp DESC, x.wins DESC
             LIMIT $2 OFFSET $3`,
            [seasonNumber, safeLimit, offset]
        )
    ]);
    return { total: totalResult.rows[0].count, rows: rowsResult.rows };
}

async function getLeaderboard({ season = 'current', limit = 25, page = 1 } = {}) {
    const { seasonNumber, isCurrent } = await resolveSeason(season);
    const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    const loader = () => fetchLeaderboard(seasonNumber, isCurrent, safeLimit, offset);

    // Only the current season's leaderboard actually changes; archived
    // seasons are immutable history, so cache them for a full day instead
    // of the current season's short 30s TTL — there's nothing to invalidate.
    const { total, rows } = isCurrent
        ? await cacheService.getLeaderboard(seasonNumber, safePage, safeLimit, loader)
        : await cacheService.getOrSet(
              `leaderboard:archive:${seasonNumber}:${safePage}:${safeLimit}`,
              60 * 60 * 24,
              loader
          );

    return {
        season: seasonNumber,
        leaderboard: rows,
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit))
    };
}

async function getUserSeasonStats(userId, season = 'current') {
    const { seasonNumber, isCurrent } = await resolveSeason(season);
    const table = isCurrent ? 'user_xp' : 'user_xp_archive';
    const result = await pool.query(
        `SELECT total_xp, wins, losses, rank FROM (
             SELECT user_id, total_xp, wins, losses,
                    RANK() OVER (ORDER BY total_xp DESC, wins DESC) AS rank
             FROM ${table} WHERE season_number = $1
         ) ranked
         WHERE user_id = $2`,
        [seasonNumber, userId]
    );
    return result.rows[0] || { total_xp: 0, wins: 0, losses: 0, rank: null };
}

module.exports = { getLeaderboard, getUserSeasonStats, resolveSeasonNumber };
