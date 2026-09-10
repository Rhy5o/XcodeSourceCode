const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { normalize, isValidUkRegPlate } = require('./regPlateService');

const SALT_ROUNDS = 10;

async function signup({ username, email, password, regPlate }) {
    if (!username || !email || !password || !regPlate) {
        throw httpError(400, 'username, email, password and regPlate are required');
    }
    if (password.length < 8) {
        throw httpError(400, 'Password must be at least 8 characters');
    }
    if (!isValidUkRegPlate(regPlate)) {
        throw httpError(400, 'regPlate is not a recognised UK registration plate');
    }

    const normalizedPlate = normalize(regPlate);
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    try {
        const result = await pool.query(
            `INSERT INTO users (username, email, password_hash, reg_plate)
             VALUES ($1, $2, $3, $4)
             RETURNING id, username, email, reg_plate, created_at`,
            [username, email.toLowerCase(), passwordHash, normalizedPlate]
        );
        const user = result.rows[0];

        await pool.query(
            `INSERT INTO user_xp (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
            [user.id]
        );

        return { user, token: issueToken(user) };
    } catch (err) {
        if (err.code === '23505') {
            throw httpError(409, 'Username, email or registration plate already in use');
        }
        throw err;
    }
}

async function login({ email, password }) {
    if (!email || !password) {
        throw httpError(400, 'email and password are required');
    }

    const result = await pool.query(
        `SELECT id, username, email, password_hash, reg_plate FROM users WHERE email = $1`,
        [email.toLowerCase()]
    );
    const user = result.rows[0];
    if (!user) {
        throw httpError(401, 'Invalid email or password');
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
        throw httpError(401, 'Invalid email or password');
    }

    delete user.password_hash;
    return { user, token: issueToken(user) };
}

function issueToken(user) {
    return jwt.sign(
        { sub: user.id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

module.exports = { signup, login };
