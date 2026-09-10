const pool = require('../db/pool');
const { normalize, isValidUkRegPlate } = require('./regPlateService');

async function listCarsForUser(userId) {
    const result = await pool.query(
        `SELECT * FROM cars WHERE user_id = $1 ORDER BY created_at DESC`,
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

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

module.exports = { listCarsForUser, listPublicCars, getCarById, createCar, updateCar, deleteCar };
