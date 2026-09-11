# Load Test Results — 100 Concurrent Users

## What was run

```bash
cd backend
npm run loadtest        # artillery.yml: 100 virtual users arrive over 10s,
                         # each signs up, registers a car, goes online,
                         # polls status, and hits the leaderboard
npm run loadtest:race   # directly triggers one race cycle against
                         # whichever users are online afterward, timing it
                         # and checking the pg Pool for leaked connections
```

Run against a single local backend instance (Node, no clustering), local
Postgres, local Redis — not a production-scale environment, but enough to
exercise every code path a real race cycle touches under concurrent load.

## Results

### HTTP load (100 users: signup → register car → go online → status → leaderboard)

| Metric | Value |
| --- | --- |
| Virtual users created / completed | 100 / 100 |
| Virtual users failed | 0 |
| Total requests | 500 (5 per user) |
| Response codes | 300× 200, 200× 201 — no 4xx/5xx |
| Mean response time | 21.6ms |
| Median (p50) | 2ms |
| p95 | 83.9ms |
| p99 | 96.6ms |
| Max | 273ms |

All 500 requests succeeded. Both `ensure` thresholds configured in
`artillery.yml` (p95 < 1000ms, error rate < 1%) passed comfortably — actual
p95 was ~12x under budget.

### Race cycle (100 online users → 50 matches)

Triggered directly via `raceEngine.runRaceCycle()` (same call the cron
scheduler makes) against the 100 users the load test left online:

| Metric | Value |
| --- | --- |
| Online users | 100 |
| Matches created | 50 |
| Cycle duration | 355ms |
| DB pool before | 0 total / 0 idle / 0 waiting |
| DB pool after | 4 total / 4 idle / 0 waiting |

Every connection the cycle opened (one per concurrent `getCarFinalStats` /
`storeMatchResult` / `upsertXp` query) was released back to the pool —
`waiting: 0` both before and after means no request was ever stuck queueing
for a client, and `idle === total` after the cycle confirms nothing was
left checked out. A follow-up `pg_stat_activity` check a few seconds later
showed connection count back to just the operator's own psql session,
confirming pg's own idle-connection reaping is working as expected on top
of that — **no connection leak**.

A nice side effect of running the HTTP load test and the scheduler's own
5-minute cron tick at the same wall-clock moment: the real scheduler fired
mid-load-test (`cycle complete: 29 online, 14 match(es)`) with zero errors
logged, incidentally proving the race engine handles a concurrent cron
tick landing during live HTTP traffic without contention issues.

## Bottlenecks & scaling notes

Nothing here is a bug — these are the components that would need attention
before running at a much larger scale than this test (100 concurrent
users, single instance):

1. **bcrypt hashing on signup** (`SALT_ROUNDS = 10` in `authService.js`) is
   deliberately CPU-bound and synchronous-ish per request. It wasn't the
   bottleneck at this scale (p95 still under 100ms including it), but it's
   the first thing that would show up under a much heavier signup burst —
   bcrypt cost doesn't parallelize across a single Node process's event
   loop the way I/O-bound work does.
2. **In-memory rate limiter** (`middleware/antiCheat.js`'s `lastGoOnlineAt`
   `Map`) is correct for one instance but doesn't share state across
   processes — already flagged in that file's comments as needing to move
   to Redis (`INCR` + `EXPIRE`) before this app ever runs more than one
   backend instance behind a load balancer.
3. **pg Pool has no explicit `max`** (`db/pool.js`), so it falls back to
   the client library's default of 10. That was never exhausted here (peak
   observed was 4), but a much larger fleet of concurrent race cycles
   would want an explicit, tuned `max` alongside Postgres's own
   `max_connections`.
4. **Redis is a single instance** with no replica — the app already
   degrades gracefully to "always hit the DB" if it's unreachable
   (`cacheService.js`), so this is a performance-under-load concern rather
   than a correctness one, but a Redis outage under heavy load would push
   every leaderboard/profile read straight to Postgres at once.

None of these needed a code change to pass this test — noted here for
whoever scales this past a single small instance.
