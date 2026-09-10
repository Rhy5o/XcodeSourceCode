const express = require('express');
const { requireAuth } = require('../middleware/auth');
const clanService = require('../services/clanService');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const { q, sort, page, limit } = req.query;
        const result = await clanService.listClans({ q, sort, page, limit });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

router.post('/', requireAuth, async (req, res, next) => {
    try {
        const { name, description } = req.body;
        const clan = await clanService.createClan(name, description, req.user.id);
        res.status(201).json({ clan });
    } catch (err) {
        next(err);
    }
});

router.get('/:clanId', async (req, res, next) => {
    try {
        const clan = await clanService.getClan(req.params.clanId);
        if (!clan) return res.status(404).json({ error: 'Clan not found' });

        const [members, stats] = await Promise.all([
            clanService.getClanMembers(req.params.clanId),
            clanService.getClanStats(req.params.clanId)
        ]);

        res.json({ clan, members, stats });
    } catch (err) {
        next(err);
    }
});

router.get('/:clanId/leaderboard', async (req, res, next) => {
    try {
        const leaderboard = await clanService.getClanLeaderboard(req.params.clanId);
        res.json({ leaderboard });
    } catch (err) {
        next(err);
    }
});

router.put('/:clanId/join', requireAuth, async (req, res, next) => {
    try {
        await clanService.joinClan(req.user.id, req.params.clanId);
        res.json({ joined: true });
    } catch (err) {
        next(err);
    }
});

router.delete('/:clanId/leave', requireAuth, async (req, res, next) => {
    try {
        await clanService.leaveClan(req.user.id, req.params.clanId);
        res.json({ joined: false });
    } catch (err) {
        next(err);
    }
});

// Not in the original Stage 7 route list, but the frontend's "leader kicks
// a member" button (item 16) needs somewhere to call.
router.delete('/:clanId/members/:userId', requireAuth, async (req, res, next) => {
    try {
        await clanService.kickMember(req.user.id, req.params.clanId, req.params.userId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
});

module.exports = router;
