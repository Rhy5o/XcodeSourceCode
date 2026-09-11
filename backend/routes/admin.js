const express = require('express');
const seasonService = require('../services/seasonService');
const adminStatsService = require('../services/adminStatsService');

const router = express.Router();

// There's no admin-role system yet, so this is gated by a shared secret
// (ADMIN_SECRET in .env) rather than left open or bolted onto user auth.
function requireAdminSecret(req, res, next) {
    const provided = req.headers['x-admin-secret'];
    const expected = process.env.ADMIN_SECRET;
    if (!expected || provided !== expected) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
}

router.post('/season/reset', requireAdminSecret, async (req, res, next) => {
    try {
        const newSeason = await seasonService.resetSeason();
        res.json({ season: newSeason });
    } catch (err) {
        next(err);
    }
});

// Item 14: internal live stats for /admin/stats — users online, races this
// hour, average XP per race, most common winning car, cache/db health.
router.get('/stats', requireAdminSecret, async (req, res, next) => {
    try {
        const stats = await adminStatsService.getAdminStats();
        res.json(stats);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
