const express = require('express');
const pool = require('../db/pool');
const badgeService = require('../services/badgeService');
const xpService = require('../services/xpService');
const raceEngine = require('../services/raceEngine');
const socialService = require('../services/socialService');
const clanService = require('../services/clanService');
const carService = require('../services/carService');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Must come before /:userId/* routes so "search" isn't captured as a userId.
router.get('/search', async (req, res, next) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q) return res.json({ users: [] });

        const result = await pool.query(
            `SELECT id, username, reg_plate FROM users
             WHERE username ILIKE $1
             ORDER BY username
             LIMIT 20`,
            [`%${q}%`]
        );
        res.json({ users: result.rows });
    } catch (err) {
        next(err);
    }
});

router.get('/:userId/profile', optionalAuth, async (req, res, next) => {
    try {
        const { userId } = req.params;
        const userResult = await pool.query(`SELECT id, username, created_at FROM users WHERE id = $1`, [userId]);
        const user = userResult.rows[0];
        if (!user) return res.status(404).json({ error: 'User not found' });

        const [allTime, currentSeason, badges, topCars, followCounts, clanId, viewerIsFollowing] = await Promise.all([
            badgeService.getAllTimeStats(userId),
            xpService.getUserSeasonStats(userId, 'current'),
            badgeService.getBadges(userId),
            getTopCarsByWins(userId, 3),
            socialService.getFollowingCounts(userId),
            clanService.getUserClanId(userId),
            req.user ? socialService.isFollowing(req.user.id, userId) : false
        ]);

        const clan = clanId ? await clanService.getClan(clanId) : null;

        res.json({
            user,
            allTime: { ...allTime, winRate: winRate(allTime.wins, allTime.losses) },
            currentSeason: { ...currentSeason, winRate: winRate(currentSeason.wins, currentSeason.losses) },
            badges,
            topCars,
            followersCount: followCounts.followers_count,
            followingCount: followCounts.following_count,
            clan,
            isSelf: !!req.user && req.user.id === userId,
            viewerIsFollowing
        });
    } catch (err) {
        next(err);
    }
});

router.get('/:userId/badges', async (req, res, next) => {
    try {
        const { userId } = req.params;
        const userResult = await pool.query(`SELECT id FROM users WHERE id = $1`, [userId]);
        if (!userResult.rows[0]) return res.status(404).json({ error: 'User not found' });

        const badges = await badgeService.getBadgesWithProgress(userId);
        res.json({ badges });
    } catch (err) {
        next(err);
    }
});

// Not in the Stage 6 spec's route list, but pages/users/[userId].js needs a
// "recent matches" feed for an arbitrary (not-necessarily-self) user, and
// the only existing match-history route is /api/leaderboard/matches/mine
// (always the authenticated caller). Public — match history isn't private.
router.get('/:userId/matches', async (req, res, next) => {
    try {
        const { userId } = req.params;
        const userResult = await pool.query(`SELECT id FROM users WHERE id = $1`, [userId]);
        if (!userResult.rows[0]) return res.status(404).json({ error: 'User not found' });

        const limit = Math.min(Number(req.query.limit) || 10, 50);
        const matches = await raceEngine.getMatchesForUser(userId, limit);
        res.json({ matches });
    } catch (err) {
        next(err);
    }
});

// Not in the original route list — see the comment on
// carService.listCarsForUserPublic for why this was added.
router.get('/:userId/garage', async (req, res, next) => {
    try {
        const { userId } = req.params;
        const userResult = await pool.query(`SELECT id, username FROM users WHERE id = $1`, [userId]);
        if (!userResult.rows[0]) return res.status(404).json({ error: 'User not found' });

        const cars = await carService.listCarsForUserPublic(userId);
        res.json({ user: userResult.rows[0], cars });
    } catch (err) {
        next(err);
    }
});

function winRate(wins, losses) {
    const total = wins + losses;
    if (total === 0) return 0;
    return Math.round((wins / total) * 1000) / 10; // one decimal place, e.g. 66.7
}

// "Top cars by XP": individual cars don't carry their own XP (XP belongs to
// the user), so this ranks a user's cars by race wins attributed to that
// specific car — each win is worth the same 50 XP as raceEngine awards, so
// wins * XP_PER_WIN doubles as a stand-in "car XP" for display purposes.
async function getTopCarsByWins(userId, limit) {
    const result = await pool.query(
        `SELECT cars.id, cars.make, cars.model, cars.reg_plate, COUNT(matches.id)::int AS wins
         FROM cars
         LEFT JOIN matches ON matches.winner_id = cars.id
         WHERE cars.user_id = $1
         GROUP BY cars.id
         ORDER BY wins DESC, cars.created_at ASC
         LIMIT $2`,
        [userId, limit]
    );
    return result.rows.map((row) => ({ ...row, xp: row.wins * 50 }));
}

module.exports = router;
