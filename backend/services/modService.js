const pool = require('../db/pool');

// Fixed catalog of mod types and their stat bonuses. Bonuses from mods of the
// same statKey stack additively (e.g. turbo +15% BHP + supercharger +20% BHP
// = +35% BHP total), then are applied once to the car's base stat — rather
// than each mod compounding on the previous mod's already-boosted value.
const MOD_CATALOG = {
    turbo: { statKey: 'bhp', bonusPercent: 15, label: 'Turbocharger' },
    supercharger: { statKey: 'bhp', bonusPercent: 20, label: 'Supercharger' },
    exhaust: { statKey: 'bhp', bonusPercent: 8, label: 'Performance Exhaust' },
    lowered_suspension: { statKey: 'handling', bonusPercent: 10, label: 'Lowered Suspension' },
    weight_reduction: { statKey: 'acceleration', bonusPercent: 12, label: 'Weight Reduction' },
    race_tires: { statKey: 'grip', bonusPercent: 15, label: 'Race Tires' },
    cosmetic: { statKey: null, bonusPercent: 0, label: 'Cosmetic' }
};

const MOD_TYPES = Object.keys(MOD_CATALOG);

// zero_to_sixty is seconds-to-60 (lower is better), so an "acceleration"
// bonus reduces it rather than increasing it like the other stats.
const INVERTED_STAT_KEYS = new Set(['acceleration']);

function calculateModStatBonus(modType) {
    const entry = MOD_CATALOG[modType];
    if (!entry) return 1;
    return INVERTED_STAT_KEYS.has(entry.statKey) ? 1 - entry.bonusPercent / 100 : 1 + entry.bonusPercent / 100;
}

function round(value, dp) {
    const factor = 10 ** dp;
    return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function calculateCarFinalStats(baseCar, mods) {
    const totalBonusPercent = { bhp: 0, handling: 0, acceleration: 0, grip: 0 };

    for (const mod of mods) {
        const entry = MOD_CATALOG[mod.mod_type];
        if (entry && entry.statKey) {
            totalBonusPercent[entry.statKey] += entry.bonusPercent;
        }
    }

    const baseBhp = Number(baseCar.bhp) || 0;
    const baseZeroToSixty = Number(baseCar.zero_to_sixty) || 0;
    const baseHandling = Number(baseCar.handling_score) || 0;
    const baseGrip = Number(baseCar.grip_score) || 0;

    // (base * (100 + pct)) / 100 rather than base * (1 + pct / 100) — the
    // latter drifts under binary floating point (e.g. 50 * 1.15 evaluates
    // to 57.499999999999986, one under the true 57.5) and rounds down.
    return {
        bhp: Math.round((baseBhp * (100 + totalBonusPercent.bhp)) / 100),
        zero_to_sixty: round((baseZeroToSixty * (100 - totalBonusPercent.acceleration)) / 100, 2),
        handling_score: clamp(Math.round((baseHandling * (100 + totalBonusPercent.handling)) / 100), 0, 100),
        grip_score: clamp(Math.round((baseGrip * (100 + totalBonusPercent.grip)) / 100), 0, 100),
        weight_kg: Number(baseCar.weight_kg) || 0,
        top_speed_mph: Number(baseCar.top_speed_mph) || 0,
        bonusPercent: totalBonusPercent
    };
}

async function getCarOwnerId(carId) {
    const result = await pool.query(`SELECT user_id FROM cars WHERE id = $1`, [carId]);
    return result.rows[0] ? result.rows[0].user_id : null;
}

async function listModsForCar(carId) {
    const result = await pool.query(`SELECT * FROM mods WHERE car_id = $1 ORDER BY created_at DESC`, [carId]);
    return result.rows;
}

async function listModsForCarOwnedBy(userId, carId) {
    const ownerId = await getCarOwnerId(carId);
    if (!ownerId) throw httpError(404, 'Car not found');
    if (ownerId !== userId) throw httpError(403, 'You do not own this car');
    return listModsForCar(carId);
}

async function addModForOwner(userId, carId, { modType, description, photoUrl }) {
    if (!MOD_CATALOG[modType]) {
        throw httpError(400, `modType must be one of: ${MOD_TYPES.join(', ')}`);
    }
    const ownerId = await getCarOwnerId(carId);
    if (!ownerId) throw httpError(404, 'Car not found');
    if (ownerId !== userId) throw httpError(403, 'You do not own this car');

    const result = await pool.query(
        `INSERT INTO mods (car_id, mod_type, description, photo_url)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [carId, modType, description || null, photoUrl || null]
    );
    return result.rows[0];
}

async function deleteModForOwner(userId, modId) {
    const result = await pool.query(
        `SELECT mods.id, cars.user_id AS owner_id FROM mods
         JOIN cars ON cars.id = mods.car_id
         WHERE mods.id = $1`,
        [modId]
    );
    const row = result.rows[0];
    if (!row) throw httpError(404, 'Mod not found');
    if (row.owner_id !== userId) throw httpError(403, 'You do not own this car');

    await pool.query(`DELETE FROM mods WHERE id = $1`, [modId]);
}

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

module.exports = {
    MOD_CATALOG,
    MOD_TYPES,
    calculateModStatBonus,
    calculateCarFinalStats,
    listModsForCar,
    listModsForCarOwnedBy,
    addModForOwner,
    deleteModForOwner
};
