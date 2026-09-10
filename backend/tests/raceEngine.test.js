const test = require('node:test');
const assert = require('node:assert/strict');
const { determineWinner, createMatches } = require('../services/raceEngine');

test('determineWinner: higher BHP, better acceleration, equal handling/grip -> car1 wins', () => {
    const car1 = { bhp: 503, zero_to_sixty: 3.8, handling_score: 50, grip_score: 50 };
    const car2 = { bhp: 345, zero_to_sixty: 4.7, handling_score: 50, grip_score: 50 };

    const { result, car1Score } = determineWinner(car1, car2);
    assert.equal(result, 'car1');
    assert.ok(car1Score > 0.5);
});

test('determineWinner: symmetric — swapping cars swaps the winner', () => {
    const car1 = { bhp: 503, zero_to_sixty: 3.8, handling_score: 50, grip_score: 50 };
    const car2 = { bhp: 345, zero_to_sixty: 4.7, handling_score: 50, grip_score: 50 };

    const forward = determineWinner(car1, car2);
    const reversed = determineWinner(car2, car1);

    assert.equal(forward.result, 'car1');
    assert.equal(reversed.result, 'car2');
});

test('determineWinner: identical stats on every axis is a draw', () => {
    // car1Score is compared against 0.5, not asserted to equal it exactly —
    // summing four 0.1-0.4-weighted terms drifts by float epsilon (~1e-17),
    // which is exactly what determineWinner's own 1e-9 draw tolerance exists
    // to absorb.
    const car = { bhp: 400, zero_to_sixty: 5, handling_score: 60, grip_score: 55 };
    const { result, car1Score } = determineWinner({ ...car }, { ...car });
    assert.equal(result, 'draw');
    assert.ok(Math.abs(car1Score - 0.5) < 1e-9);
});

test('determineWinner: acceleration (40% weight) can outweigh a BHP disadvantage', () => {
    // car1 has much worse BHP but a decisive 0-60 advantage; with weights
    // 0-60=40%, BHP=30%, handling=20%, grip=10%, a big enough acceleration
    // edge should still be able to win it.
    const car1 = { bhp: 200, zero_to_sixty: 2.0, handling_score: 80, grip_score: 80 };
    const car2 = { bhp: 600, zero_to_sixty: 8.0, handling_score: 20, grip_score: 20 };

    const { result } = determineWinner(car1, car2);
    assert.equal(result, 'car1');
});

test('determineWinner: zero-value stats on both sides do not throw or NaN', () => {
    const car1 = { bhp: 0, zero_to_sixty: 0, handling_score: 0, grip_score: 0 };
    const car2 = { bhp: 0, zero_to_sixty: 0, handling_score: 0, grip_score: 0 };
    const { result, car1Score } = determineWinner(car1, car2);
    assert.equal(result, 'draw');
    assert.equal(Number.isNaN(car1Score), false);
});

test('createMatches: pairs an even number of users with none left over', () => {
    const users = [{ user_id: 'a' }, { user_id: 'b' }, { user_id: 'c' }, { user_id: 'd' }];
    const pairs = createMatches(users);
    assert.equal(pairs.length, 2);
    const paired = pairs.flat().map((u) => u.user_id).sort();
    assert.deepEqual(paired, ['a', 'b', 'c', 'd']);
});

test('createMatches: odd number of users leaves exactly one unpaired', () => {
    const users = [{ user_id: 'a' }, { user_id: 'b' }, { user_id: 'c' }];
    const pairs = createMatches(users);
    assert.equal(pairs.length, 1);
});

test('createMatches: a single online user produces no matches', () => {
    const pairs = createMatches([{ user_id: 'a' }]);
    assert.equal(pairs.length, 0);
});

test('createMatches: no online users produces no matches', () => {
    const pairs = createMatches([]);
    assert.equal(pairs.length, 0);
});
