const pool = require('../db/pool');

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

async function addComment(carId, userId, commentText) {
    if (!commentText || !commentText.trim()) {
        throw httpError(400, 'comment_text is required');
    }
    const carResult = await pool.query(`SELECT id FROM cars WHERE id = $1`, [carId]);
    if (!carResult.rows[0]) throw httpError(404, 'Car not found');

    const result = await pool.query(
        `INSERT INTO car_comments (car_id, user_id, comment_text)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [carId, userId, commentText.trim()]
    );
    const commentResult = await pool.query(
        `SELECT car_comments.*, users.username
         FROM car_comments JOIN users ON users.id = car_comments.user_id
         WHERE car_comments.id = $1`,
        [result.rows[0].id]
    );
    return commentResult.rows[0];
}

async function getComments(carId) {
    const result = await pool.query(
        `SELECT car_comments.*, users.username
         FROM car_comments
         JOIN users ON users.id = car_comments.user_id
         WHERE car_comments.car_id = $1
         ORDER BY car_comments.created_at ASC`,
        [carId]
    );
    return result.rows;
}

async function deleteComment(commentId, requesterId) {
    const result = await pool.query(
        `SELECT car_comments.user_id AS author_id, cars.user_id AS car_owner_id
         FROM car_comments
         JOIN cars ON cars.id = car_comments.car_id
         WHERE car_comments.id = $1`,
        [commentId]
    );
    const row = result.rows[0];
    if (!row) throw httpError(404, 'Comment not found');
    if (row.author_id !== requesterId && row.car_owner_id !== requesterId) {
        throw httpError(403, 'Only the comment author or the car owner can delete this comment');
    }
    await pool.query(`DELETE FROM car_comments WHERE id = $1`, [commentId]);
}

module.exports = { addComment, getComments, deleteComment };
