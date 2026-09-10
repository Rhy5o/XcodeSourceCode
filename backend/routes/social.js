const express = require('express');
const { requireAuth } = require('../middleware/auth');
const socialService = require('../services/socialService');

const router = express.Router();

router.get('/feed', requireAuth, async (req, res, next) => {
    try {
        const feed = await socialService.getFollowingFeed(req.user.id);
        res.json({ feed });
    } catch (err) {
        next(err);
    }
});

router.post('/follow/:userId', requireAuth, async (req, res, next) => {
    try {
        await socialService.followUser(req.user.id, req.params.userId);
        res.status(201).json({ following: true });
    } catch (err) {
        next(err);
    }
});

router.delete('/follow/:userId', requireAuth, async (req, res, next) => {
    try {
        await socialService.unfollowUser(req.user.id, req.params.userId);
        res.json({ following: false });
    } catch (err) {
        next(err);
    }
});

router.get('/followers/:userId', async (req, res, next) => {
    try {
        const followers = await socialService.getFollowers(req.params.userId);
        res.json({ followers });
    } catch (err) {
        next(err);
    }
});

router.get('/following/:userId', async (req, res, next) => {
    try {
        const following = await socialService.getFollowing(req.params.userId);
        res.json({ following });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
