const cron = require('node-cron');
const raceEngine = require('./raceEngine');
const logger = require('../monitoring/logger');

let task = null;

function startScheduler(intervalMinutes = 5) {
    if (task) return task;

    const cronExpression = `*/${intervalMinutes} * * * *`;

    task = cron.schedule(cronExpression, async () => {
        console.log(`[race-scheduler] cycle starting at ${new Date().toISOString()}`);
        try {
            // runRaceCycle logs its own summary (see raceEngine.js's call to
            // logger.logRaceCycle) — both console output and the app log file.
            await raceEngine.runRaceCycle(intervalMinutes);
        } catch (err) {
            console.error('[race-scheduler] cycle failed:', err.message);
            logger.logError(err, { context: 'race_cycle' });
        }
    });

    console.log('Race scheduler started, cycle every 5 minutes');
    return task;
}

function stopScheduler() {
    if (task) {
        task.stop();
        task = null;
    }
}

function isRunning() {
    return task !== null;
}

module.exports = { startScheduler, stopScheduler, isRunning };
