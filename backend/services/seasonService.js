const pool = require('../db/pool');
const cacheService = require('./cacheService');

async function getCurrentSeason() {
    const result = await pool.query(`SELECT current_season FROM game_state WHERE id = true`);
    return result.rows[0].current_season;
}

/**
 * Advances the current season, archiving the season that just ended: its
 * user_xp rows move to user_xp_archive and are deleted from the live table,
 * so user_xp — read on essentially every request via the leaderboard —
 * doesn't grow without bound as seasons accumulate. Historical seasons stay
 * fully queryable; xpService just reads from whichever table actually holds
 * the requested season number.
 */
async function resetSeason() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const currentResult = await client.query(
            `SELECT current_season FROM game_state WHERE id = true FOR UPDATE`
        );
        const endedSeason = currentResult.rows[0].current_season;

        await client.query(
            `INSERT INTO user_xp_archive (user_id, season_number, total_xp, wins, losses, updated_at)
             SELECT user_id, season_number, total_xp, wins, losses, updated_at
             FROM user_xp
             WHERE season_number = $1
             ON CONFLICT (user_id, season_number) DO NOTHING`,
            [endedSeason]
        );
        await client.query(`DELETE FROM user_xp WHERE season_number = $1`, [endedSeason]);

        const nextResult = await client.query(
            `UPDATE game_state SET current_season = current_season + 1 WHERE id = true RETURNING current_season`
        );

        await client.query('COMMIT');

        await cacheService.invalidateLeaderboard();
        return nextResult.rows[0].current_season;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

module.exports = { getCurrentSeason, resetSeason };
