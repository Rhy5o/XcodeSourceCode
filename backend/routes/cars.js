const express = require('express');
const { requireAuth } = require('../middleware/auth');
const carService = require('../services/carService');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
    try {
        const cars = await carService.listCarsForUser(req.user.id);
        res.json({ cars });
    } catch (err) {
        next(err);
    }
});

router.get('/public/all', async (req, res, next) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 50, 100);
        const cars = await carService.listPublicCars(limit);
        res.json({ cars });
    } catch (err) {
        next(err);
    }
});

router.get('/garage', requireAuth, async (req, res, next) => {
    try {
        const cars = await carService.listCarsForUser(req.user.id);
        res.json({ cars });
    } catch (err) {
        next(err);
    }
});

router.post('/register', requireAuth, async (req, res, next) => {
    try {
        const { regPlate } = req.body;
        const car = await carService.registerCarFromDvla(req.user.id, regPlate);
        res.status(201).json({ car });
    } catch (err) {
        next(err);
    }
});

router.put('/:carId/activate', requireAuth, async (req, res, next) => {
    try {
        const car = await carService.activateCar(req.user.id, req.params.carId);
        res.json({ car });
    } catch (err) {
        next(err);
    }
});

router.get('/:carId', requireAuth, async (req, res, next) => {
    try {
        const result = await carService.getCarWithMods(req.params.carId);
        if (!result) return res.status(404).json({ error: 'Car not found' });
        if (result.car.user_id !== req.user.id) return res.status(403).json({ error: 'You do not own this car' });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

router.post('/', requireAuth, async (req, res, next) => {
    try {
        const car = await carService.createCar(req.user.id, req.body);
        res.status(201).json({ car });
    } catch (err) {
        next(err);
    }
});

router.put('/:carId', requireAuth, async (req, res, next) => {
    try {
        const car = await carService.updateCar(req.user.id, req.params.carId, req.body);
        res.json({ car });
    } catch (err) {
        next(err);
    }
});

router.delete('/:carId', requireAuth, async (req, res, next) => {
    try {
        await carService.deleteCar(req.user.id, req.params.carId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
});

module.exports = router;
