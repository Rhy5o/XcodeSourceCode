const pool = require('../db/pool');
const { normalize, isValidUkRegPlate } = require('./regPlateService');
const dvlaService = require('./dvlaService');

async function listCarsForUser(userId) {
    const result = await pool.query(
        `SELECT * FROM cars WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
    );
    return result.rows;
}

// Not in the original route list, but pages/users/[userId]/garage.js needs
// "all of a specific user's cars, publicly" (mod count + total stats per
// car) and the only existing "list cars for a user" route is self-only
// (GET /api/cars / /api/cars/garage, both scoped to req.user.id).
async function listCarsForUserPublic(userId) {
    const result = await pool.query(
        `SELECT cars.*, COALESCE(mod_counts.count, 0)::int AS mod_count
         FROM cars
         LEFT JOIN (
             SELECT car_id, COUNT(*) AS count FROM mods GROUP BY car_id
         ) mod_counts ON mod_counts.car_id = cars.id
         WHERE cars.user_id = $1
         ORDER BY cars.is_active DESC, cars.created_at DESC`,
        [userId]
    );
    return result.rows;
}

async function listPublicCars(limit = 50) {
    const result = await pool.query(
        `SELECT cars.*, users.username FROM cars
         JOIN users ON users.id = cars.user_id
         WHERE cars.is_active = true
         ORDER BY cars.created_at DESC
         LIMIT $1`,
        [limit]
    );
    return result.rows;
}

async function getCarById(carId) {
    const result = await pool.query(`SELECT * FROM cars WHERE id = $1`, [carId]);
    return result.rows[0] || null;
}

async function createCar(userId, data) {
    const { regPlate, make, model, year, bhp, topSpeedMph, zeroToSixty, weightKg, handlingScore, imageUrl } = data;

    if (!make || !model) {
        throw httpError(400, 'make and model are required');
    }
    if (regPlate && !isValidUkRegPlate(regPlate)) {
        throw httpError(400, 'regPlate is not a recognised UK registration plate');
    }

    const result = await pool.query(
        `INSERT INTO cars (user_id, reg_plate, make, model, year, bhp, top_speed_mph, zero_to_sixty, weight_kg, handling_score, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
            userId,
            regPlate ? normalize(regPlate) : null,
            make,
            model,
            year || null,
            bhp || 0,
            topSpeedMph || 0,
            zeroToSixty || 0,
            weightKg || 0,
            handlingScore ?? 50,
            imageUrl || null
        ]
    );
    return result.rows[0];
}

async function registerCarFromDvla(userId, regPlate) {
    if (!regPlate) {
        throw httpError(400, 'regPlate is required');
    }
    if (!isValidUkRegPlate(regPlate)) {
        throw httpError(400, 'regPlate is not a recognised UK registration plate');
    }

    const normalizedPlate = normalize(regPlate);
    const vehicle = await dvlaService.lookupByRegPlate(normalizedPlate);

    const countResult = await pool.query(`SELECT COUNT(*)::int AS count FROM cars WHERE user_id = $1`, [userId]);
    const isFirstCar = countResult.rows[0].count === 0;

    const result = await pool.query(
        `INSERT INTO cars (user_id, reg_plate, make, model, bhp, zero_to_sixty, weight_kg, engine_size, fuel_type, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
            userId,
            normalizedPlate,
            vehicle.make,
            vehicle.model,
            vehicle.bhp,
            vehicle.acceleration0to60,
            vehicle.weight,
            vehicle.engineSize,
            vehicle.fuelType,
            isFirstCar
        ]
    );
    return result.rows[0];
}

async function activateCar(userId, carId) {
    const car = await getCarById(carId);
    if (!car) throw httpError(404, 'Car not found');
    if (car.user_id !== userId) throw httpError(403, 'You do not own this car');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`UPDATE cars SET is_active = false, updated_at = now() WHERE user_id = $1`, [userId]);
        const result = await client.query(
            `UPDATE cars SET is_active = true, updated_at = now() WHERE id = $1 RETURNING *`,
            [carId]
        );
        await client.query('COMMIT');
        return result.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// Lazily requires modService (rather than importing it at module scope) so
// this file and modService.js can each depend on the other's exports
// without a circular-require load-order problem.
async function getCarWithMods(carId) {
    const modService = require('./modService');

    const car = await getCarById(carId);
    if (!car) return null;

    const mods = await modService.listModsForCar(carId);
    const finalStats = modService.calculateCarFinalStats(car, mods);
    return { car, mods, finalStats };
}

async function updateCar(userId, carId, data) {
    const car = await getCarById(carId);
    if (!car) throw httpError(404, 'Car not found');
    if (car.user_id !== userId) throw httpError(403, 'You do not own this car');

    const fields = {
        make: data.make ?? car.make,
        model: data.model ?? car.model,
        year: data.year ?? car.year,
        bhp: data.bhp ?? car.bhp,
        top_speed_mph: data.topSpeedMph ?? car.top_speed_mph,
        zero_to_sixty: data.zeroToSixty ?? car.zero_to_sixty,
        weight_kg: data.weightKg ?? car.weight_kg,
        handling_score: data.handlingScore ?? car.handling_score,
        image_url: data.imageUrl ?? car.image_url
    };

    const result = await pool.query(
        `UPDATE cars SET make=$1, model=$2, year=$3, bhp=$4, top_speed_mph=$5, zero_to_sixty=$6,
             weight_kg=$7, handling_score=$8, image_url=$9, updated_at=now()
         WHERE id = $10
         RETURNING *`,
        [
            fields.make,
            fields.model,
            fields.year,
            fields.bhp,
            fields.top_speed_mph,
            fields.zero_to_sixty,
            fields.weight_kg,
            fields.handling_score,
            fields.image_url,
            carId
        ]
    );
    return result.rows[0];
}

async function deleteCar(userId, carId) {
    const car = await getCarById(carId);
    if (!car) throw httpError(404, 'Car not found');
    if (car.user_id !== userId) throw httpError(403, 'You do not own this car');

    await pool.query(`DELETE FROM cars WHERE id = $1`, [carId]);
}

// Stage 7: every car is publicly viewable (no privacy column exists on
// cars/users), so this currently only guards against a nonexistent car —
// it's kept as a real function, rather than inlined everywhere it'd be
// used, so a future privacy toggle has one place to plug into.
async function getCarVisibility(carId, _requesterId) {
    const car = await getCarById(carId);
    if (!car) return false;
    return true; // public by default; car.user_id === _requesterId would be the owner-only case
}

/**
 * Detailed comparison of two cars: base stats, each mod's bonus, the final
 * (base + mods) stats, and a per-stat difference (car1 - car2, positive
 * meaning car1 is ahead — except 0-60, where lower is better, so its diff
 * is car2 - car1 to keep "positive = car1 ahead" consistent across rows).
 */
async function compareStats(car1Id, car2Id) {
    const [side1, side2] = await Promise.all([getCarWithMods(car1Id), getCarWithMods(car2Id)]);
    if (!side1 || !side2) return null;

    const diff = {
        bhp: side1.finalStats.bhp - side2.finalStats.bhp,
        zero_to_sixty: Math.round((side2.finalStats.zero_to_sixty - side1.finalStats.zero_to_sixty) * 100) / 100,
        weight_kg: side2.finalStats.weight_kg - side1.finalStats.weight_kg,
        handling_score: side1.finalStats.handling_score - side2.finalStats.handling_score,
        grip_score: side1.finalStats.grip_score - side2.finalStats.grip_score
    };

    return { car1: side1, car2: side2, diff };
}

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

module.exports = {
    listCarsForUser,
    listCarsForUserPublic,
    listPublicCars,
    getCarById,
    createCar,
    registerCarFromDvla,
    activateCar,
    getCarWithMods,
    getCarVisibility,
    compareStats,
    updateCar,
    deleteCar
};
