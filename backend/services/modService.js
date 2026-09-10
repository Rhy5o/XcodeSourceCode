const pool = require('../db/pool');

async function listModsForCar(carId) {
    const result = await pool.query(
        `SELECT * FROM mods WHERE car_id = $1 ORDER BY created_at DESC`,
        [carId]
    );
    return result.rows;
}

async function addMod(userId, carId, data) {
    const carResult = await pool.query(`SELECT user_id FROM cars WHERE id = $1`, [carId]);
    const car = carResult.rows[0];
    if (!car) throw httpError(404, 'Car not found');
    if (car.user_id !== userId) throw httpError(403, 'You do not own this car');

    const { name, category, bhpDelta, weightDeltaKg, description, imageUrl } = data;
    if (!name || !category) {
        throw httpError(400, 'name and category are required');
    }

    const modResult = await pool.query(
        `INSERT INTO mods (car_id, name, category, bhp_delta, weight_delta_kg, description, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [carId, name, category, bhpDelta || 0, weightDeltaKg || 0, description || null, imageUrl || null]
    );

    // Applying a mod updates the car's live stats so it's reflected in matches.
    await pool.query(
        `UPDATE cars SET bhp = bhp + $1, weight_kg = weight_kg + $2, updated_at = now() WHERE id = $3`,
        [bhpDelta || 0, weightDeltaKg || 0, carId]
    );

    return modResult.rows[0];
}

async function deleteMod(userId, modId) {
    const result = await pool.query(
        `SELECT mods.*, cars.user_id AS owner_id FROM mods JOIN cars ON cars.id = mods.car_id WHERE mods.id = $1`,
        [modId]
    );
    const mod = result.rows[0];
    if (!mod) throw httpError(404, 'Mod not found');
    if (mod.owner_id !== userId) throw httpError(403, 'You do not own this car');

    await pool.query(
        `UPDATE cars SET bhp = bhp - $1, weight_kg = weight_kg - $2, updated_at = now() WHERE id = $3`,
        [mod.bhp_delta, mod.weight_delta_kg, mod.car_id]
    );
    await pool.query(`DELETE FROM mods WHERE id = $1`, [modId]);
}

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

module.exports = { listModsForCar, addMod, deleteMod };
