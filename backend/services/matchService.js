const pool = require('../db/pool');
const { awardMatchResult } = require('./xpService');

const COMPARABLE_STATS = ['bhp', 'top_speed_mph', 'zero_to_sixty', 'weight_kg', 'handling_score'];

// zero_to_sixty and weight_kg are "lower is better" stats.
const LOWER_IS_BETTER = new Set(['zero_to_sixty', 'weight_kg']);

function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

async function getOnlineActiveCars() {
    // In Stage 1 "online" is approximated by any active car with an owner;
    // presence tracking can be layered on in a later stage.
    const result = await pool.query(
        `SELECT id, user_id, bhp, top_speed_mph, zero_to_sixty, weight_kg, handling_score
         FROM cars WHERE is_active = true`
    );
    return result.rows;
}

function pickStat() {
    return COMPARABLE_STATS[Math.floor(Math.random() * COMPARABLE_STATS.length)];
}

function decideWinner(carA, carB, stat) {
    const a = Number(carA[stat]);
    const b = Number(carB[stat]);
    if (a === b) return null; // draw
    const aWins = LOWER_IS_BETTER.has(stat) ? a < b : a > b;
    return aWins ? carA : carB;
}

/**
 * Runs one "top trumps" matchmaking round: pairs up all currently active
 * cars, compares a random stat per pairing, records the match and awards XP.
 */
async function runMatchRound(intervalMinutes = 5) {
    const cars = shuffle(await getOnlineActiveCars());
    const results = [];

    for (let i = 0; i + 1 < cars.length; i += 2) {
        const carA = cars[i];
        const carB = cars[i + 1];
        const stat = pickStat();
        const winner = decideWinner(carA, carB, stat);

        const roundEndsAt = new Date(Date.now() + intervalMinutes * 60 * 1000);

        const insertResult = await pool.query(
            `INSERT INTO matches (car_a_id, car_b_id, user_a_id, user_b_id, stat_compared, winner_car_id, status, round_ends_at, completed_at)
             VALUES ($1, $2, $3, $4, $5, $6, 'completed', $7, now())
             RETURNING *`,
            [carA.id, carB.id, carA.user_id, carB.user_id, stat, winner ? winner.id : null, roundEndsAt]
        );

        if (winner) {
            const winnerIsA = winner.id === carA.id;
            await awardMatchResult(winnerIsA ? carA.user_id : carB.user_id, true);
            await awardMatchResult(winnerIsA ? carB.user_id : carA.user_id, false);
        }

        results.push(insertResult.rows[0]);
    }

    return results;
}

async function getMatchesForUser(userId, limit = 20) {
    const result = await pool.query(
        `SELECT * FROM matches WHERE user_a_id = $1 OR user_b_id = $1
         ORDER BY round_started_at DESC LIMIT $2`,
        [userId, limit]
    );
    return result.rows;
}

module.exports = { runMatchRound, getMatchesForUser, COMPARABLE_STATS };
