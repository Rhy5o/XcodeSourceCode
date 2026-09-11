// Companion to artillery.yml: the scheduler only ticks every
// MATCH_INTERVAL_MINUTES (5 min by default), far too slow to observe inside
// a load test run, so this triggers one race cycle directly against
// whatever's online after artillery.yml has run (same call the cron job
// itself makes), times it, and checks the pg Pool for leaked connections —
// the pool's totalCount should return to (near) its pre-cycle level once
// every query in the cycle has released its client back to the pool.
require('../config/env');
const pool = require('../db/pool');
const raceEngine = require('../services/raceEngine');
const cacheService = require('../services/cacheService');

async function main() {
    const before = { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount };

    const startedAt = Date.now();
    const summary = await raceEngine.runRaceCycle(5);
    const durationMs = Date.now() - startedAt;

    // Give any just-released clients a tick to settle back to idle.
    await new Promise((resolve) => setTimeout(resolve, 200));
    const after = { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount };

    console.log(JSON.stringify({ summary, durationMs, poolBefore: before, poolAfter: after }, null, 2));

    await cacheService.close();
    await pool.end();
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
