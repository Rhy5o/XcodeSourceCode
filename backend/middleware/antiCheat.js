const crypto = require('crypto');
const env = require('../config/env');
const logger = require('../monitoring/logger');

// In-memory rate limit store: userId -> last request timestamp (ms). Fine
// for this app's single-process scale; if the backend ever runs multiple
// instances behind a load balancer, this would need to move to Redis
// (cacheService is already wired up and could back it).
const lastGoOnlineAt = new Map();

function rateLimitGoOnline(req, res, next) {
    const userId = req.user.id;
    const now = Date.now();
    const last = lastGoOnlineAt.get(userId);
    const windowMs = env.GO_ONLINE_RATE_LIMIT_SECONDS * 1000;

    if (last && now - last < windowMs) {
        logger.logSuspiciousActivity('go_online_rate_limit', { userId, msSinceLastAttempt: now - last });
        return res
            .status(429)
            .json({ error: `Please wait before going online again (max once per ${env.GO_ONLINE_RATE_LIMIT_SECONDS}s)` });
    }

    lastGoOnlineAt.set(userId, now);
    next();
}

// --- Signature verification ---------------------------------------------
// This app's racing is fully server-authoritative: raceEngine computes
// outcomes and awards XP itself on its cron cycle — the client never
// submits "I won, give me X XP" for the server to trust, so there's
// currently no client-submitted XP claim to verify a signature on. These
// two functions are a ready-to-use HMAC primitive for the day a client-
// submitted claim is introduced (e.g. syncing an offline race result),
// rather than wiring signature checks onto a fake endpoint just to have
// something to call.
function signPayload(payload) {
    const hmac = crypto.createHmac('sha256', env.JWT_SECRET);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
}

function verifySignature(payload, signature) {
    const expected = Buffer.from(signPayload(payload));
    const provided = Buffer.from(String(signature || ''));
    if (expected.length !== provided.length) return false;
    // Constant-time comparison — avoids leaking the correct signature one
    // byte at a time via response-time differences.
    return crypto.timingSafeEqual(expected, provided);
}

// --- XP injection detection ---------------------------------------------
// A defense-in-depth invariant check inside the server-authoritative XP
// path itself (see raceEngine.js's upsertXp): if a bug or future change
// ever tries to award far more XP than a single race should give, log it
// and clamp rather than silently trusting whatever value was computed.
const MAX_XP_PER_RACE = 200; // XP_PER_WIN is 50 — headroom for future bonus XP without false alarms

function checkXpDelta(userId, xpDelta) {
    if (xpDelta > MAX_XP_PER_RACE) {
        logger.logSuspiciousActivity('xp_injection_suspected', { userId, xpDelta, max: MAX_XP_PER_RACE });
        return MAX_XP_PER_RACE;
    }
    return xpDelta;
}

module.exports = { rateLimitGoOnline, signPayload, verifySignature, checkXpDelta };
