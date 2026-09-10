const express = require('express');
const { requireAuth } = require('../middleware/auth');
const xpService = require('../services/xpService');
const matchService = require('../services/matchService');

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
        const matches = await matchService.getMatchesForUser(req.user.id);
        res.json({ matches });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
