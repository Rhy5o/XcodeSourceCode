const pool = require('../db/pool');

const WIN_STREAK_TARGET = 10;
const MOD_COUNT_TARGET = 5;
const BHP_TARGET = 400;
const ZERO_TO_SIXTY_TARGET = 4;

async function getAllTimeStats(userId) {
    const result = await pool.query(
        `SELECT COALESCE(SUM(total_xp), 0)::int AS total_xp,
                COALESCE(SUM(wins), 0)::int AS wins,
                COALESCE(SUM(losses), 0)::int AS losses
         FROM user_xp WHERE user_id = $1`,
        [userId]
    );
    return result.rows[0];
}

async function getUserCars(userId) {
    const result = await pool.query(`SELECT id, bhp, zero_to_sixty FROM cars WHERE user_id = $1`, [userId]);
    return result.rows;
}

async function getMaxModCountOnASingleCar(userId) {
    const result = await pool.query(
        `SELECT COALESCE(MAX(mod_count), 0)::int AS max_mods
         FROM (
             SELECT COUNT(*) AS mod_count
             FROM mods
             JOIN cars ON cars.id = mods.car_id
             WHERE cars.user_id = $1
             GROUP BY mods.car_id
         ) counts`,
        [userId]
    );
    return result.rows[0].max_mods;
}

/**
 * Current win streak: fetch the user's most recent matches and count
 * consecutive wins from the top; a draw or loss breaks it. Lazily requires
 * raceEngine (which itself calls badgeService after awardXP) to avoid a
 * circular top-level require, same pattern as carService <-> modService.
 */
async function getCurrentWinStreak(userId, lookback = WIN_STREAK_TARGET) {
    const raceEngine = require('./raceEngine');
    const recentMatches = await raceEngine.getMatchesForUser(userId, lookback);

    let streak = 0;
    for (const match of recentMatches) {
        if (match.won) {
            streak += 1;
        } else {
            break;
        }
    }
    return streak;
}

async function evaluateBadgeCriteria(userId) {
    const [allTime, cars, maxMods, winStreak] = await Promise.all([
        getAllTimeStats(userId),
        getUserCars(userId),
        getMaxModCountOnASingleCar(userId),
        getCurrentWinStreak(userId)
    ]);

    const hasSpeedster = cars.some((car) => Number(car.zero_to_sixty) < ZERO_TO_SIXTY_TARGET);
    const hasPower = cars.some((car) => car.bhp > BHP_TARGET);

    return {
        first_blood: { earned: allTime.wins >= 1, progress: Math.min(allTime.wins, 1), target: 1 },
        century_club: { earned: allTime.wins >= 100, progress: Math.min(allTime.wins, 100), target: 100 },
        thousand_xp: { earned: allTime.total_xp >= 1000, progress: Math.min(allTime.total_xp, 1000), target: 1000 },
        undefeated: {
            earned: winStreak >= WIN_STREAK_TARGET,
            progress: Math.min(winStreak, WIN_STREAK_TARGET),
            target: WIN_STREAK_TARGET
        },
        speedster: { earned: hasSpeedster, progress: hasSpeedster ? 1 : 0, target: 1 },
        power: { earned: hasPower, progress: hasPower ? 1 : 0, target: 1 },
        modded_beast: {
            earned: maxMods >= MOD_COUNT_TARGET,
            progress: Math.min(maxMods, MOD_COUNT_TARGET),
            target: MOD_COUNT_TARGET
        }
    };
}

/**
 * Checks every badge's criteria for a user and awards any newly-earned
 * ones (idempotent — UNIQUE(user_id, badge_id) makes re-awarding a no-op).
 * Returns the badges newly awarded on this call.
 */
async function checkAndAwardBadges(userId) {
    const evaluation = await evaluateBadgeCriteria(userId);
    const earnedSlugs = Object.entries(evaluation)
        .filter(([, v]) => v.earned)
        .map(([slug]) => slug);

    if (earnedSlugs.length === 0) return [];

    const result = await pool.query(
        `INSERT INTO user_badges (user_id, badge_id)
         SELECT $1, badges.id FROM badges WHERE badges.slug = ANY($2::text[])
         ON CONFLICT (user_id, badge_id) DO NOTHING
         RETURNING badge_id`,
        [userId, earnedSlugs]
    );

    if (result.rows.length === 0) return [];

    const badgeIds = result.rows.map((row) => row.badge_id);
    const newBadges = await pool.query(`SELECT * FROM badges WHERE id = ANY($1::uuid[])`, [badgeIds]);
    return newBadges.rows;
}

async function getBadges(userId) {
    const result = await pool.query(
        `SELECT badges.*, user_badges.earned_at
         FROM user_badges
         JOIN badges ON badges.id = user_badges.badge_id
         WHERE user_badges.user_id = $1
         ORDER BY user_badges.earned_at DESC`,
        [userId]
    );
    return result.rows;
}

/**
 * Full catalog annotated with earned/locked + progress, for BadgeGrid's
 * "show locked badges greyed out with progress toward unlock" requirement.
 */
async function getBadgesWithProgress(userId) {
    const [catalogResult, earnedResult, evaluation] = await Promise.all([
        pool.query(`SELECT * FROM badges ORDER BY name`),
        pool.query(
            `SELECT badge_id, earned_at FROM user_badges WHERE user_id = $1`,
            [userId]
        ),
        evaluateBadgeCriteria(userId)
    ]);

    const earnedByBadgeId = new Map(earnedResult.rows.map((row) => [row.badge_id, row.earned_at]));

    return catalogResult.rows.map((badge) => {
        const earnedAt = earnedByBadgeId.get(badge.id) || null;
        const criteria = evaluation[badge.slug] || { progress: 0, target: 1 };
        return {
            ...badge,
            earned: earnedAt !== null,
            earnedAt,
            progress: criteria.progress,
            target: criteria.target
        };
    });
}

module.exports = {
    checkAndAwardBadges,
    getBadges,
    getBadgesWithProgress,
    getAllTimeStats,
    getCurrentWinStreak
};
