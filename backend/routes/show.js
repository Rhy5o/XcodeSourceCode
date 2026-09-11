const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { rateLimitGoOnline } = require('../middleware/antiCheat');
const pool = require('../db/pool');
const raceEngine = require('../services/raceEngine');

const router = express.Router();

const MATCH_INTERVAL_MINUTES = Number(process.env.MATCH_INTERVAL_MINUTES) || 5;

// Seconds until the next wall-clock mark node-cron's `*/N * * * *` will fire
// on (epoch is itself a multiple of any N <= 60, so this lines up with cron).
function secondsUntilNextCycle(intervalMinutes) {
    const msInInterval = intervalMinutes * 60 * 1000;
    const msIntoInterval = Date.now() % msInInterval;
    return Math.round((msInInterval - msIntoInterval) / 1000);
}

router.get('/status', requireAuth, async (req, res, next) => {
    try {
        const userResult = await pool.query(`SELECT is_online FROM users WHERE id = $1`, [req.user.id]);
        const user = userResult.rows[0];
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Heartbeat: an open, polling /show tab keeps last_activity fresh so
        // the user doesn't fall out of the online window while watching.
        if (user.is_online) {
            await pool.query(`UPDATE users SET last_activity = now() WHERE id = $1`, [req.user.id]);
        }

        const carResult = await pool.query(
            `SELECT id FROM cars WHERE user_id = $1 AND is_active = true`,
            [req.user.id]
        );
        const isCarAtTheShow = carResult.rows.length > 0;

        const lastMatchResult = await raceEngine.getLastMatchResultForUser(req.user.id);

        res.json({
            isUserOnline: user.is_online,
            isCarAtTheShow,
            lastMatchResult,
            nextRaceIn: secondsUntilNextCycle(MATCH_INTERVAL_MINUTES)
        });
    } catch (err) {
        next(err);
    }
});

router.put('/go-online', requireAuth, rateLimitGoOnline, async (req, res, next) => {
    try {
        const carResult = await pool.query(
            `SELECT id FROM cars WHERE user_id = $1 AND is_active = true`,
            [req.user.id]
        );
        if (carResult.rows.length === 0) {
            return res.status(400).json({ error: 'Activate a car in your garage before going online' });
        }

        await pool.query(`UPDATE users SET is_online = true, last_activity = now() WHERE id = $1`, [req.user.id]);
        res.json({ isUserOnline: true });
    } catch (err) {
        next(err);
    }
});

router.put('/go-offline', requireAuth, async (req, res, next) => {
    try {
        await pool.query(`UPDATE users SET is_online = false WHERE id = $1`, [req.user.id]);
        res.json({ isUserOnline: false });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
