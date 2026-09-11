const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const APP_LOG = path.join(LOG_DIR, 'app.log');
const SUSPICIOUS_LOG = path.join(LOG_DIR, 'suspicious.log');

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

function writeLine(filePath, entry) {
    fs.appendFile(filePath, `${JSON.stringify(entry)}\n`, (err) => {
        if (err) {
            console.error('Failed to write log file:', err.message);
        }
    });
}

/**
 * Single extension point for shipping logs to an external service (Sentry,
 * Datadog, etc.). No SDK is wired in — this app has no real credentials for
 * one yet, and pulling in e.g. @sentry/node's full dependency tree (it drags
 * in OpenTelemetry instrumentation for a dozen frameworks this app doesn't
 * use, including one with its own known vulnerability) isn't worth it for
 * an integration nobody can currently test. Set EXTERNAL_LOG_WEBHOOK_URL to
 * a plain HTTPS endpoint (e.g. a Sentry envelope endpoint, or your own
 * ingestion service) and entries get POSTed there too, no extra dependency
 * required.
 */
function forwardToExternalService(entry) {
    const url = process.env.EXTERNAL_LOG_WEBHOOK_URL;
    if (!url) return;

    const https = require('https');
    const payload = JSON.stringify(entry);
    try {
        const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
        req.on('error', () => {}); // best-effort — never let external logging break the request path
        req.write(payload);
        req.end();
    } catch (err) {
        console.error('Failed to forward log to external service:', err.message);
    }
}

function logRaceCycle({ startedAt, durationMs, onlineUserCount, matchesCreated, results }) {
    const entry = {
        type: 'race_cycle',
        timestamp: new Date().toISOString(),
        startedAt,
        durationMs,
        onlineUserCount,
        matchesCreated,
        winners: results.filter((r) => !r.draw).map((r) => r.winnerCarId)
    };
    console.log(`[race-scheduler] cycle complete: ${onlineUserCount} online, ${matchesCreated} match(es)`);
    writeLine(APP_LOG, entry);
    forwardToExternalService(entry);
}

function logSuspiciousActivity(kind, details = {}) {
    const entry = { type: 'suspicious_activity', kind, timestamp: new Date().toISOString(), ...details };
    console.warn(`[anti-cheat] ${kind}`, details);
    writeLine(SUSPICIOUS_LOG, entry);
    writeLine(APP_LOG, entry);
    forwardToExternalService(entry);
}

function logError(err, context = {}) {
    const entry = {
        type: 'error',
        timestamp: new Date().toISOString(),
        message: err.message,
        stack: err.stack,
        ...context
    };
    writeLine(APP_LOG, entry);
    forwardToExternalService(entry);
}

function logInfo(message, details = {}) {
    const entry = { type: 'info', message, timestamp: new Date().toISOString(), ...details };
    writeLine(APP_LOG, entry);
}

module.exports = { logRaceCycle, logSuspiciousActivity, logError, logInfo };
