// Run via `npm test`, which passes --test-force-exit: this suite spins up
// a real server and makes real fetch() calls against it, and fetch's
// client-side keep-alive sockets (correct behavior for a long-running app)
// otherwise keep node --test's process alive after the last test finishes
// even though everything actually closes cleanly (server.close/pool.end/
// cacheService.close all complete). --test-force-exit is Node's own
// purpose-built answer to exactly this.
const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');
const pool = require('../db/pool');
const raceEngine = require('../services/raceEngine');
const cacheService = require('../services/cacheService');

let server;
let baseUrl;
const runId = Date.now();
const createdEmails = [];

test.before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://localhost:${server.address().port}`;
});

test.after(async () => {
    if (createdEmails.length > 0) {
        await pool.query(`DELETE FROM users WHERE email = ANY($1::text[])`, [createdEmails]);
    }
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
    await cacheService.close();
});

async function api(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    const body = await res.json().catch(() => null);
    return { status: res.status, body };
}

async function signupUser(suffix, regPlate) {
    const email = `int_${suffix}_${runId}@example.com`;
    createdEmails.push(email);
    const { status, body } = await api('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ username: `int_${suffix}_${runId}`, email, password: 'password123', regPlate })
    });
    assert.equal(status, 201, `signup failed: ${JSON.stringify(body)}`);
    return { token: body.token, userId: body.user.id, username: body.user.username };
}

async function registerCar(token, regPlate) {
    const { status, body } = await api('/api/cars/register', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ regPlate })
    });
    assert.equal(status, 201, `car registration failed: ${JSON.stringify(body)}`);
    return body.car;
}

// --- Full flow: signup -> register car -> go online -> race -> check XP ---

test('full flow: signup, register car, go online, race, XP awarded to the winner', async () => {
    const winner = await signupUser('winner', 'ZW01AAA'); // random plate -> deterministic mock car via seeded hash
    const loser = await signupUser('loser', 'ZL02BBB');

    await registerCar(winner.token, 'ZW01AAA');
    await registerCar(loser.token, 'ZL02BBB');

    const onlineWinner = await api('/api/show/go-online', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${winner.token}` }
    });
    assert.equal(onlineWinner.status, 200);
    const onlineLoser = await api('/api/show/go-online', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${loser.token}` }
    });
    assert.equal(onlineLoser.status, 200);

    // "Online" is shared, global state — anyone else online right now
    // (e.g. left over from manual testing against this same dev database)
    // would also enter this race cycle and could get paired with one of
    // our two test users instead of them pairing with each other, which
    // would make the assertions below flaky depending on what else happens
    // to be running. Force a clean slate for this cycle.
    await pool.query(`UPDATE users SET is_online = false WHERE id NOT IN ($1, $2)`, [
        winner.userId,
        loser.userId
    ]);

    // Drive the race deterministically rather than waiting on the real
    // cron — this calls the exact same function schedulerService invokes.
    const summary = await raceEngine.runRaceCycle(5);
    assert.equal(summary.onlineUserCount, 2, 'only our two test users should be in this cycle');
    assert.equal(summary.matchesCreated, 1, 'exactly one match should have been created');

    const winnerProfile = await api(`/api/users/${winner.userId}/profile`);
    const loserProfile = await api(`/api/users/${loser.userId}/profile`);
    assert.equal(winnerProfile.status, 200);
    assert.equal(loserProfile.status, 200);

    // Exactly one of the two should have won (the race is deterministic
    // given their stats, so we don't assert *which* one — just that XP
    // flowed to exactly one side and not both).
    const winnerWon = winnerProfile.body.currentSeason.wins === 1;
    const loserWon = loserProfile.body.currentSeason.wins === 1;
    assert.notEqual(winnerWon, loserWon, 'exactly one side should have won this 1v1 race');

    const actualWinner = winnerWon ? winnerProfile.body : loserProfile.body;
    assert.equal(actualWinner.currentSeason.total_xp, 50, 'winner should have exactly XP_PER_WIN');
});

test('go-online is rate limited to once per window', async () => {
    const user = await signupUser('ratelimit', 'ZR03CCC');
    await registerCar(user.token, 'ZR03CCC');

    const first = await api('/api/show/go-online', { method: 'PUT', headers: { Authorization: `Bearer ${user.token}` } });
    assert.equal(first.status, 200);

    const second = await api('/api/show/go-online', { method: 'PUT', headers: { Authorization: `Bearer ${user.token}` } });
    assert.equal(second.status, 429);
});

// --- Clan creation + member join ---

test('clan creation and member join updates member_count and stats', async () => {
    const leader = await signupUser('leader', 'ZC04DDD');
    const member = await signupUser('member', 'ZC05EEE');

    const created = await api('/api/clans', {
        method: 'POST',
        headers: { Authorization: `Bearer ${leader.token}` },
        body: JSON.stringify({ name: `Integration Clan ${runId}`, description: 'test' })
    });
    assert.equal(created.status, 201);
    const clanId = created.body.clan.id;
    assert.equal(created.body.clan.member_count, 1);

    const joined = await api(`/api/clans/${clanId}/join`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${member.token}` }
    });
    assert.equal(joined.status, 200);

    const detail = await api(`/api/clans/${clanId}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.clan.member_count, 2);
    assert.equal(detail.body.stats.member_count, 2);

    const memberIds = detail.body.members.map((m) => m.user_id).sort();
    assert.deepEqual(memberIds, [leader.userId, member.userId].sort());
});

// --- Follow / unfollow ---

test('follow then unfollow updates isFollowing and follower counts', async () => {
    const follower = await signupUser('follower', 'ZF06FFF');
    const target = await signupUser('target', 'ZF07GGG');

    const follow = await api(`/api/social/follow/${target.userId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${follower.token}` }
    });
    assert.equal(follow.status, 201);

    const profileAfterFollow = await api(`/api/users/${target.userId}/profile`, {
        headers: { Authorization: `Bearer ${follower.token}` }
    });
    assert.equal(profileAfterFollow.body.viewerIsFollowing, true);
    assert.equal(profileAfterFollow.body.followersCount, 1);

    const unfollow = await api(`/api/social/follow/${target.userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${follower.token}` }
    });
    assert.equal(unfollow.status, 200);

    const profileAfterUnfollow = await api(`/api/users/${target.userId}/profile`, {
        headers: { Authorization: `Bearer ${follower.token}` }
    });
    assert.equal(profileAfterUnfollow.body.viewerIsFollowing, false);
    assert.equal(profileAfterUnfollow.body.followersCount, 0);
});

// --- Comments ---

test('comment: add, list, and delete by the car owner', async () => {
    const carOwner = await signupUser('carowner', 'ZM08HHH');
    const commenter = await signupUser('commenter', 'ZM09III');
    const car = await registerCar(carOwner.token, 'ZM08HHH');

    const added = await api(`/api/cars/${car.id}/comments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${commenter.token}` },
        body: JSON.stringify({ comment_text: 'Integration test comment' })
    });
    assert.equal(added.status, 201);
    const commentId = added.body.comment.id;

    const listed = await api(`/api/cars/${car.id}/comments`);
    assert.equal(listed.status, 200);
    assert.ok(listed.body.comments.some((c) => c.id === commentId));

    // The car owner didn't write this comment, but can still moderate it.
    const deleted = await api(`/api/cars/${car.id}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${carOwner.token}` }
    });
    assert.equal(deleted.status, 204);

    const listedAfterDelete = await api(`/api/cars/${car.id}/comments`);
    assert.ok(!listedAfterDelete.body.comments.some((c) => c.id === commentId));
});

