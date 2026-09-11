const pool = require('../db/pool');
const cacheService = require('./cacheService');
const healthCheckJob = require('../jobs/healthCheck');
const { XP_PER_WIN } = require('./raceEngine');

async function getUsersOnlineNow() {
    const result = await pool.query(`SELECT COUNT(*)::int AS count FROM users WHERE is_online = true`);
    return result.rows[0].count;
}

async function getRacesThisHour() {
    const result = await pool.query(
        `SELECT COUNT(*)::int AS total, COUNT(winner_id)::int AS decisive
         FROM matches
         WHERE "timestamp" >= now() - interval '1 hour'`
    );
    return result.rows[0];
}

// All-time, not scoped to "this hour" like racesThisHour — a useful gauge
// of the overall meta, not just the last 60 minutes' noise.
async function getMostCommonWinningCar() {
    const result = await pool.query(
        `SELECT cars.make, cars.model, COUNT(*)::int AS wins
         FROM matches
         JOIN cars ON cars.id = matches.winner_id
         GROUP BY cars.make, cars.model
         ORDER BY wins DESC
         LIMIT 1`
    );
    return result.rows[0] || null;
}

async function getDbLatencyMs() {
    const start = Date.now();
    await pool.query('SELECT 1');
    return Date.now() - start;
}

// Only winners earn XP (XP_PER_LOSS is 0), so the average XP awarded per
// race this hour is just XP_PER_WIN scaled by the share of races that had a
// winner (draws award nothing) — no need for a separate per-race XP log.
async function getAdminStats() {
    const [usersOnlineNow, racesThisHour, mostCommonCar, dbLatencyMs, health] = await Promise.all([
        getUsersOnlineNow(),
        getRacesThisHour(),
        getMostCommonWinningCar(),
        getDbLatencyMs(),
        healthCheckJob.runHealthCheck()
    ]);

    const avgXpPerRace =
        racesThisHour.total > 0 ? Math.round(((racesThisHour.decisive * XP_PER_WIN) / racesThisHour.total) * 100) / 100 : 0;

    return {
        timestamp: new Date().toISOString(),
        usersOnlineNow,
        racesThisHour: racesThisHour.total,
        avgXpPerRace,
        mostCommonWinningCar: mostCommonCar ? `${mostCommonCar.make} ${mostCommonCar.model}` : null,
        systemHealth: {
            healthy: health.healthy,
            database: health.database,
            redis: health.redis,
            scheduler: health.scheduler,
            dbLatencyMs,
            cache: cacheService.getStats()
        }
    };
}

module.exports = { getAdminStats };
