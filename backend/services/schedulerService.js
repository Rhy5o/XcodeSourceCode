const cron = require('node-cron');
const raceEngine = require('./raceEngine');

let task = null;

function startScheduler(intervalMinutes = 5) {
    if (task) return task;

    const cronExpression = `*/${intervalMinutes} * * * *`;

    task = cron.schedule(cronExpression, async () => {
        const startedAt = new Date().toISOString();
        console.log(`[race-scheduler] cycle starting at ${startedAt}`);
        try {
            const summary = await raceEngine.runRaceCycle(intervalMinutes);
            console.log(
                `[race-scheduler] cycle complete: ${summary.onlineUserCount} online user(s), ` +
                    `${summary.matchesCreated} match(es) created`
            );
        } catch (err) {
            console.error('[race-scheduler] cycle failed:', err.message);
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

module.exports = { startScheduler, stopScheduler };
