const pool = require('../db/pool');
const modService = require('./modService');
const seasonService = require('./seasonService');
const cacheService = require('./cacheService');
const logger = require('../monitoring/logger');
const { checkXpDelta } = require('../middleware/antiCheat');

const XP_PER_WIN = 50;
const XP_PER_LOSS = 0; // "Winners get XP. Losers get 0 XP."

// Weighted composite score: 0-60 = 40%, BHP = 30%, handling = 20%, grip = 10%.
const RACE_WEIGHTS = { acceleration: 0.4, bhp: 0.3, handling: 0.2, grip: 0.1 };

function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

/**
 * Users who are online (explicit go-online toggle, not gone stale) and have
 * an active car — there's nothing to race without one.
 */
async function getOnlineUsers(lastActiveMinutes = 5) {
    const result = await pool.query(
        `SELECT users.id AS user_id, users.username, cars.id AS car_id
         FROM users
         JOIN cars ON cars.user_id = users.id AND cars.is_active = true
         WHERE users.is_online = true
           AND users.last_activity IS NOT NULL
           AND users.last_activity > now() - ($1 || ' minutes')::interval
         ORDER BY users.last_activity DESC`,
        [lastActiveMinutes]
    );
    return result.rows;
}

/**
 * Randomly pairs online users for a round. Odd one out sits out this cycle.
 */
function createMatches(onlineUsers) {
    const shuffled = shuffle(onlineUsers);
    const pairs = [];
    for (let i = 0; i + 1 < shuffled.length; i += 2) {
        pairs.push([shuffled[i], shuffled[i + 1]]);
    }
    return pairs;
}

function normalShare(a, b) {
    if (a + b === 0) return 0.5;
    return a / (a + b);
}

// zero_to_sixty is seconds (lower is better), so car1's "goodness share" of
// this stat is car2's raw time relative to the combined total.
function invertedShare(a, b) {
    if (a + b === 0) return 0.5;
    return b / (a + b);
}

/**
 * Compares two cars' final (base + mods) stats using the weighted formula.
 * Returns { result: 'car1' | 'car2' | 'draw', car1Score } where car1Score is
 * car1's share of the composite (0-1); car2's is implicitly 1 - car1Score.
 */
function determineWinner(car1Stats, car2Stats) {
    const bhpShare = normalShare(car1Stats.bhp, car2Stats.bhp);
    const handlingShare = normalShare(car1Stats.handling_score, car2Stats.handling_score);
    const gripShare = normalShare(car1Stats.grip_score, car2Stats.grip_score);
    const accelerationShare = invertedShare(car1Stats.zero_to_sixty, car2Stats.zero_to_sixty);

    const car1Score =
        accelerationShare * RACE_WEIGHTS.acceleration +
        bhpShare * RACE_WEIGHTS.bhp +
        handlingShare * RACE_WEIGHTS.handling +
        gripShare * RACE_WEIGHTS.grip;

    let result = 'draw';
    if (Math.abs(car1Score - 0.5) > 1e-9) {
        result = car1Score > 0.5 ? 'car1' : 'car2';
    }
    return { result, car1Score };
}

async function getCarFinalStats(carId) {
    const carResult = await pool.query(`SELECT * FROM cars WHERE id = $1`, [carId]);
    const car = carResult.rows[0];
    if (!car) return null;
    const mods = await modService.listModsForCar(carId);
    return modService.calculateCarFinalStats(car, mods);
}

async function storeMatchResult(car1Id, car2Id, winnerId, timestamp = new Date()) {
    const result = await pool.query(
        `INSERT INTO matches (car1_id, car2_id, winner_id, "timestamp")
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [car1Id, car2Id, winnerId, timestamp]
    );
    return result.rows[0];
}

async function upsertXp(userId, seasonNumber, xpDelta, isWin) {
    const safeXpDelta = checkXpDelta(userId, xpDelta);
    await pool.query(
        `INSERT INTO user_xp (user_id, season_number, total_xp, wins, losses)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, season_number) DO UPDATE
         SET total_xp = user_xp.total_xp + EXCLUDED.total_xp,
             wins = user_xp.wins + EXCLUDED.wins,
             losses = user_xp.losses + EXCLUDED.losses,
             updated_at = now()`,
        [userId, seasonNumber, safeXpDelta, isWin ? 1 : 0, isWin ? 0 : 1]
    );
    await cacheService.invalidateUserProfile(userId);
}

/**
 * Awards XP for one match: the winner gets XP_PER_WIN, each loser gets
 * XP_PER_LOSS (0), both against the current season. matchId isn't persisted
 * anywhere yet (no xp_awards audit table) but is accepted per spec for
 * future logging/idempotency use. Badge criteria are re-checked for the
 * winner afterward (Stage 6) — lazily required to avoid a circular
 * top-level require, since badgeService itself calls back into this module
 * for win-streak lookups.
 */
// eslint-disable-next-line no-unused-vars
async function awardXP(winnerUserId, loserUserIds, matchId) {
    const seasonNumber = await seasonService.getCurrentSeason();

    if (winnerUserId) {
        await upsertXp(winnerUserId, seasonNumber, XP_PER_WIN, true);
    }
    for (const loserUserId of loserUserIds) {
        await upsertXp(loserUserId, seasonNumber, XP_PER_LOSS, false);
    }

    if (winnerUserId) {
        const badgeService = require('./badgeService');
        await badgeService.checkAndAwardBadges(winnerUserId);
    }
}

/**
 * Runs one full race cycle: fetch online users, pair them, race each pair,
 * store the result, and award XP. Called by schedulerService on its cron
 * tick (or directly, e.g. from a test or an on-demand trigger).
 */
async function runRaceCycle(lastActiveMinutes = 5) {
    const startedAt = new Date();
    const onlineUsers = await getOnlineUsers(lastActiveMinutes);
    const pairs = createMatches(onlineUsers);
    const results = [];

    for (const [userA, userB] of pairs) {
        const [statsA, statsB] = await Promise.all([
            getCarFinalStats(userA.car_id),
            getCarFinalStats(userB.car_id)
        ]);

        const { result } = determineWinner(statsA, statsB);
        const winnerCarId = result === 'car1' ? userA.car_id : result === 'car2' ? userB.car_id : null;

        const match = await storeMatchResult(userA.car_id, userB.car_id, winnerCarId, new Date());

        if (winnerCarId) {
            const winnerIsA = winnerCarId === userA.car_id;
            const winnerUserId = winnerIsA ? userA.user_id : userB.user_id;
            const loserUserId = winnerIsA ? userB.user_id : userA.user_id;
            await awardXP(winnerUserId, [loserUserId], match.id);
        }

        results.push({
            matchId: match.id,
            userAId: userA.user_id,
            userBId: userB.user_id,
            winnerCarId,
            draw: !winnerCarId
        });
    }

    if (pairs.length > 0) {
        await cacheService.invalidateLeaderboard();
    }

    const summary = { onlineUserCount: onlineUsers.length, matchesCreated: pairs.length, results };
    logger.logRaceCycle({ startedAt: startedAt.toISOString(), durationMs: Date.now() - startedAt.getTime(), ...summary });
    return summary;
}

function mapMatchRow(row, userId) {
    const isCar1 = row.car1_user_id === userId;
    const myCarId = isCar1 ? row.car1_id : row.car2_id;
    const opponentMake = isCar1 ? row.car2_make : row.car1_make;
    const opponentModel = isCar1 ? row.car2_model : row.car1_model;
    const draw = !row.winner_id;
    const won = !draw && row.winner_id === myCarId;

    return {
        id: row.id,
        timestamp: row.timestamp,
        won,
        draw,
        xpEarned: won ? XP_PER_WIN : XP_PER_LOSS,
        opponentCar: `${opponentMake} ${opponentModel}`
    };
}

const MATCH_JOIN_SQL = `
    SELECT matches.*,
           c1.user_id AS car1_user_id, c1.make AS car1_make, c1.model AS car1_model,
           c2.user_id AS car2_user_id, c2.make AS car2_make, c2.model AS car2_model
    FROM matches
    JOIN cars c1 ON c1.id = matches.car1_id
    JOIN cars c2 ON c2.id = matches.car2_id
    WHERE c1.user_id = $1 OR c2.user_id = $1
    ORDER BY matches."timestamp" DESC
`;

async function getMatchesForUser(userId, limit = 10) {
    const result = await pool.query(`${MATCH_JOIN_SQL} LIMIT $2`, [userId, limit]);
    return result.rows.map((row) => mapMatchRow(row, userId));
}

async function getLastMatchResultForUser(userId) {
    const result = await pool.query(`${MATCH_JOIN_SQL} LIMIT 1`, [userId]);
    const row = result.rows[0];
    return row ? mapMatchRow(row, userId) : null;
}

module.exports = {
    XP_PER_WIN,
    XP_PER_LOSS,
    RACE_WEIGHTS,
    getOnlineUsers,
    createMatches,
    determineWinner,
    getCarFinalStats,
    storeMatchResult,
    awardXP,
    runRaceCycle,
    getMatchesForUser,
    getLastMatchResultForUser
};
