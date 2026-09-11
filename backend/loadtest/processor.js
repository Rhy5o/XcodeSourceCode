// Generates unique-per-virtual-user signup data. Each VU needs its own
// username/email (UNIQUE constraints) and a UK-format reg plate that
// regPlateService.isValidUkRegPlate() accepts (AA00AAA current format).
let counter = 0;

function randomLetters(n) {
    let out = '';
    for (let i = 0; i < n; i++) {
        out += String.fromCharCode(65 + Math.floor(Math.random() * 26));
    }
    return out;
}

function makeRegPlate(n) {
    const digits = String(n % 100).padStart(2, '0');
    return `${randomLetters(2)}${digits}${randomLetters(3)}`;
}

function generateUser(context, events, done) {
    const n = counter++;
    const stamp = Date.now();
    context.vars.username = `loadtest_${stamp}_${n}`.slice(0, 30);
    context.vars.email = `loadtest_${stamp}_${n}@example.com`;
    context.vars.regPlate = makeRegPlate(n);
    return done();
}

module.exports = { generateUser };
