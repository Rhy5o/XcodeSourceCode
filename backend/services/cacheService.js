const { createClient } = require('redis');
const env = require('../config/env');
const logger = require('../monitoring/logger');

const client = createClient({ url: env.REDIS_URL });
let connected = false;

// Hit/miss counters for the admin stats page (item 14) — reset only on
// process restart, which is fine for a "cache hit rate right now" gauge.
const stats = { hits: 0, misses: 0 };

client.on('error', (err) => {
    if (connected) {
        // Only log the transition, not every retry attempt — the client
        // reconnects on its own and would otherwise spam the log.
        logger.logSuspiciousActivity('redis_connection_lost', { message: err.message });
    }
    connected = false;
});
client.on('connect', () => {
    connected = true;
});

// Connecting is fire-and-forget at module load: every get/set below checks
// `connected` first and falls back to "cache miss" if Redis isn't up, so a
// dead cache degrades the app to "always hits the DB," never a crash.
client.connect().catch((err) => {
    logger.logSuspiciousActivity('redis_connect_failed', { message: err.message });
});

async function get(key) {
    if (!connected) return null;
    try {
        const raw = await client.get(key);
        if (raw) {
            stats.hits += 1;
            return JSON.parse(raw);
        }
        stats.misses += 1;
        return null;
    } catch (err) {
        logger.logSuspiciousActivity('redis_get_failed', { key, message: err.message });
        return null;
    }
}

function getStats() {
    const total = stats.hits + stats.misses;
    const hitRate = total === 0 ? 0 : Math.round((stats.hits / total) * 1000) / 10;
    return { hits: stats.hits, misses: stats.misses, hitRate };
}

async function set(key, value, ttlSeconds) {
    if (!connected) return;
    try {
        await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch (err) {
        logger.logSuspiciousActivity('redis_set_failed', { key, message: err.message });
    }
}

async function del(keyOrPattern) {
    if (!connected) return;
    try {
        if (keyOrPattern.includes('*')) {
            const keys = await client.keys(keyOrPattern);
            if (keys.length > 0) await client.del(keys);
        } else {
            await client.del(keyOrPattern);
        }
    } catch (err) {
        logger.logSuspiciousActivity('redis_del_failed', { keyOrPattern, message: err.message });
    }
}

/**
 * Cache-aside helper: return the cached value if present, otherwise compute
 * it via `loader`, cache it, and return it. `loader` always runs on a miss
 * or when Redis itself is unavailable, so callers never see a cache outage
 * as an error — only as a slower response.
 */
async function getOrSet(key, ttlSeconds, loader) {
    const cached = await get(key);
    if (cached !== null) return cached;

    const value = await loader();
    await set(key, value, ttlSeconds);
    return value;
}

function isConnected() {
    return connected;
}

// The redis client's open TCP connection keeps Node's event loop alive
// indefinitely (by design, for a long-running server) — a test process
// needs to explicitly close it in its own teardown or `node --test` will
// hang after the last test finishes instead of exiting.
async function close() {
    if (connected) {
        await client.quit();
    }
}

// --- Domain-specific helpers -------------------------------------------

function leaderboardKey(season, page, limit) {
    return `leaderboard:${season}:${page}:${limit}`;
}

async function getLeaderboard(season, page, limit, loader) {
    return getOrSet(leaderboardKey(season, page, limit), env.LEADERBOARD_CACHE_TTL_SECONDS, loader);
}

async function invalidateLeaderboard() {
    // All pages/seasons share the prefix; a race can change any season's
    // current-page standings (well, always the current season in practice),
    // so the simplest correct invalidation is to drop every cached page.
    await del('leaderboard:*');
}

async function getUserProfile(userId, loader) {
    return getOrSet(`profile:${userId}`, env.USER_PROFILE_CACHE_TTL_SECONDS, loader);
}

async function invalidateUserProfile(userId) {
    await del(`profile:${userId}`);
}

async function getClanStats(clanId, loader) {
    return getOrSet(`clan_stats:${clanId}`, env.CLAN_STATS_CACHE_TTL_SECONDS, loader);
}

async function invalidateClanStats(clanId) {
    await del(`clan_stats:${clanId}`);
}

async function getFollowerList(userId, kind, loader) {
    return getOrSet(`${kind}:${userId}`, env.FOLLOWER_LIST_CACHE_TTL_SECONDS, loader);
}

async function invalidateFollowerLists(userId) {
    await del(`followers:${userId}`);
    await del(`following:${userId}`);
}

module.exports = {
    get,
    set,
    del,
    getOrSet,
    isConnected,
    getStats,
    close,
    getLeaderboard,
    invalidateLeaderboard,
    getUserProfile,
    invalidateUserProfile,
    getClanStats,
    invalidateClanStats,
    getFollowerList,
    invalidateFollowerLists
};
