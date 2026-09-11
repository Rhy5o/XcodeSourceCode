require('dotenv').config();

const REQUIRED_VARS = ['DATABASE_URL', 'JWT_SECRET', 'ADMIN_SECRET'];

const DEFAULTS = {
    PORT: '3001',
    NODE_ENV: 'development',
    JWT_EXPIRES_IN: '7d',
    FRONTEND_ORIGIN: 'http://localhost:3000',
    MATCH_INTERVAL_MINUTES: '5',
    REDIS_URL: 'redis://localhost:6379',
    LEADERBOARD_CACHE_TTL_SECONDS: '30',
    USER_PROFILE_CACHE_TTL_SECONDS: '300',
    CLAN_STATS_CACHE_TTL_SECONDS: '300',
    FOLLOWER_LIST_CACHE_TTL_SECONDS: '600',
    GO_ONLINE_RATE_LIMIT_SECONDS: '5',
    HEALTH_CHECK_INTERVAL_MINUTES: '1'
};

function loadEnv() {
    const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        // Fail loudly and immediately — a server that starts without these
        // would silently sign tokens with an undefined secret, or crash on
        // the first DB query instead of on boot where it's obvious why.
        console.error(`FATAL: missing required environment variable(s): ${missing.join(', ')}`);
        console.error('Copy backend/.env.example to backend/.env and fill these in.');
        process.exit(1);
    }

    const env = { ...process.env };
    for (const [key, value] of Object.entries(DEFAULTS)) {
        if (!env[key]) env[key] = value;
    }

    return {
        PORT: Number(env.PORT),
        NODE_ENV: env.NODE_ENV,
        DATABASE_URL: env.DATABASE_URL,
        JWT_SECRET: env.JWT_SECRET,
        JWT_EXPIRES_IN: env.JWT_EXPIRES_IN,
        FRONTEND_ORIGIN: env.FRONTEND_ORIGIN,
        MATCH_INTERVAL_MINUTES: Number(env.MATCH_INTERVAL_MINUTES),
        ADMIN_SECRET: env.ADMIN_SECRET,
        REDIS_URL: env.REDIS_URL,
        LEADERBOARD_CACHE_TTL_SECONDS: Number(env.LEADERBOARD_CACHE_TTL_SECONDS),
        USER_PROFILE_CACHE_TTL_SECONDS: Number(env.USER_PROFILE_CACHE_TTL_SECONDS),
        CLAN_STATS_CACHE_TTL_SECONDS: Number(env.CLAN_STATS_CACHE_TTL_SECONDS),
        FOLLOWER_LIST_CACHE_TTL_SECONDS: Number(env.FOLLOWER_LIST_CACHE_TTL_SECONDS),
        GO_ONLINE_RATE_LIMIT_SECONDS: Number(env.GO_ONLINE_RATE_LIMIT_SECONDS),
        HEALTH_CHECK_INTERVAL_MINUTES: Number(env.HEALTH_CHECK_INTERVAL_MINUTES)
    };
}

module.exports = loadEnv();
