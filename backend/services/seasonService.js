const pool = require('../db/pool');

async function getCurrentSeason() {
    const result = await pool.query(`SELECT current_season FROM game_state WHERE id = true`);
    return result.rows[0].current_season;
}

/**
 * Advances the current season. Nothing is deleted or zeroed — user_xp rows
 * are per (user, season), so once the pointer moves, the next award for any
 * user just inserts a fresh row under the new season number and the old
 * season's rows remain queryable as history via ?season=<n>.
 */
async function resetSeason() {
    const result = await pool.query(
        `UPDATE game_state SET current_season = current_season + 1 WHERE id = true RETURNING current_season`
    );
    return result.rows[0].current_season;
}

module.exports = { getCurrentSeason, resetSeason };
