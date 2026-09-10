const pool = require('../db/pool');

const XP_PER_WIN = 50;
const XP_PER_LOSS = 10;
const XP_PER_LEVEL = 500;

async function getLeaderboard(limit = 50) {
    const result = await pool.query(
        `SELECT u.id AS user_id, u.username, u.reg_plate, x.xp, x.level, x.wins, x.losses
         FROM user_xp x
         JOIN users u ON u.id = x.user_id
         ORDER BY x.xp DESC, x.wins DESC
         LIMIT $1`,
        [limit]
    );
    return result.rows;
}

async function awardMatchResult(userId, didWin) {
    const xpGained = didWin ? XP_PER_WIN : XP_PER_LOSS;

    const result = await pool.query(
        `INSERT INTO user_xp (user_id, xp, wins, losses)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE
         SET xp = user_xp.xp + EXCLUDED.xp,
             wins = user_xp.wins + EXCLUDED.wins,
             losses = user_xp.losses + EXCLUDED.losses,
             updated_at = now()
         RETURNING *`,
        [userId, xpGained, didWin ? 1 : 0, didWin ? 0 : 1]
    );

    const row = result.rows[0];
    const level = Math.floor(row.xp / XP_PER_LEVEL) + 1;
    if (level !== row.level) {
        await pool.query(`UPDATE user_xp SET level = $1 WHERE user_id = $2`, [level, userId]);
        row.level = level;
    }
    return row;
}

module.exports = { getLeaderboard, awardMatchResult, XP_PER_WIN, XP_PER_LOSS };
