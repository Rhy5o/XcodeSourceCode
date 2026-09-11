const cron = require('node-cron');
const pool = require('../db/pool');
const cacheService = require('../services/cacheService');
const schedulerService = require('../services/schedulerService');
const logger = require('../monitoring/logger');

let task = null;
let lastStatus = null;

async function checkDatabase() {
    try {
        await pool.query('SELECT 1');
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

function checkRedis() {
    // cacheService degrades gracefully when Redis is down (see its own
    // comments), so this isn't "is the app broken" — it's "is caching
    // actually helping right now," reported separately for that reason.
    return { ok: cacheService.isConnected() };
}

function checkScheduler() {
    return { ok: schedulerService.isRunning() };
}

async function runHealthCheck() {
    const [database, redis, scheduler] = await Promise.all([
        checkDatabase(),
        Promise.resolve(checkRedis()),
        Promise.resolve(checkScheduler())
    ]);

    const status = {
        timestamp: new Date().toISOString(),
        healthy: database.ok && scheduler.ok, // Redis is a soft dependency — not required for "healthy"
        database,
        redis,
        scheduler
    };

    lastStatus = status;
    return status;
}

function getLastHealthStatus() {
    return lastStatus;
}

function startHealthCheckJob(intervalMinutes = 1) {
    if (task) return task;

    const cronExpression = intervalMinutes === 1 ? '* * * * *' : `*/${intervalMinutes} * * * *`;
    task = cron.schedule(cronExpression, async () => {
        const status = await runHealthCheck();
        if (!status.healthy) {
            logger.logSuspiciousActivity('health_check_failed', status);
        }
    });

    return task;
}

function stopHealthCheckJob() {
    if (task) {
        task.stop();
        task = null;
    }
}

module.exports = { runHealthCheck, getLastHealthStatus, startHealthCheckJob, stopHealthCheckJob };
