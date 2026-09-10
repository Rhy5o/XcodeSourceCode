const pool = require('../db/pool');

async function getLeaderboard(limit = 50) {
    const result = await pool.query(
        `SELECT u.id AS user_id, u.username, u.reg_plate, x.total_xp, x.wins, x.losses
         FROM user_xp x
         JOIN users u ON u.id = x.user_id
         ORDER BY x.total_xp DESC, x.wins DESC
         LIMIT $1`,
        [limit]
    );
    return result.rows;
}

module.exports = { getLeaderboard };
