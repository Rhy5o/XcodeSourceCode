const express = require('express');
const { requireAuth } = require('../middleware/auth');
const xpService = require('../services/xpService');
const raceEngine = require('../services/raceEngine');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 50, 100);
        const leaderboard = await xpService.getLeaderboard(limit);
        res.json({ leaderboard });
    } catch (err) {
        next(err);
    }
});

router.get('/matches/mine', requireAuth, async (req, res, next) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 20, 100);
        const matches = await raceEngine.getMatchesForUser(req.user.id, limit);
        res.json({ matches });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
