const express = require('express');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const carService = require('../services/carService');
const commentService = require('../services/commentService');
const { generateCarSVG } = require('../services/svgCarRenderer');

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

// Stage 7: every car became publicly viewable (see carService.getCarVisibility)
// so the social garage/comparison/comments features have something to show —
// this reverses Stage 3's owner-only lock on car detail. Uses optionalAuth so
// the response can include isOwner for the frontend to decide whether to show
// management controls, without requiring a login to view at all.
router.get('/compare', async (req, res, next) => {
    try {
        const { car1, car2 } = req.query;
        if (!car1 || !car2) return res.status(400).json({ error: 'car1 and car2 query params are required' });

        const comparison = await carService.compareStats(car1, car2);
        if (!comparison) return res.status(404).json({ error: 'One or both cars not found' });
        res.json(comparison);
    } catch (err) {
        next(err);
    }
});

router.get('/:carId', optionalAuth, async (req, res, next) => {
    try {
        const result = await carService.getCarWithMods(req.params.carId);
        if (!result) return res.status(404).json({ error: 'Car not found' });
        res.json({ ...result, isOwner: !!req.user && result.car.user_id === req.user.id });
    } catch (err) {
        next(err);
    }
});

// Public (cars are viewable by anyone, same as GET /:carId above) — a pure
// render straight from the car's own make/model/mods, no file storage or
// DB write involved. `?color=` lets a caller preview a different paint
// job without persisting it (there's no color column on cars); omitted,
// the color is derived deterministically from make/model.
router.get('/:carId/svg', async (req, res, next) => {
    try {
        const result = await carService.getCarWithMods(req.params.carId);
        if (!result) return res.status(404).json({ error: 'Car not found' });

        const svg = generateCarSVG(result.car.make, result.car.model, req.query.color, result.mods);
        res.set('Content-Type', 'image/svg+xml');
        res.set('Cache-Control', 'public, max-age=300');
        res.send(svg);
    } catch (err) {
        next(err);
    }
});

router.post('/:carId/comments', requireAuth, async (req, res, next) => {
    try {
        const comment = await commentService.addComment(req.params.carId, req.user.id, req.body.comment_text);
        res.status(201).json({ comment });
    } catch (err) {
        next(err);
    }
});

router.get('/:carId/comments', async (req, res, next) => {
    try {
        const comments = await commentService.getComments(req.params.carId);
        res.json({ comments });
    } catch (err) {
        next(err);
    }
});

router.delete('/:carId/comments/:commentId', requireAuth, async (req, res, next) => {
    try {
        await commentService.deleteComment(req.params.commentId, req.user.id);
        res.status(204).send();
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
