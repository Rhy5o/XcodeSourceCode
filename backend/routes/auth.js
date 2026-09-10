const express = require('express');
const authService = require('../services/authService');

const router = express.Router();

router.post('/signup', async (req, res, next) => {
    try {
        const { username, email, password, regPlate } = req.body;
        const { user, token } = await authService.signup({ username, email, password, regPlate });
        res.status(201).json({ user, token });
    } catch (err) {
        next(err);
    }
});

router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const { user, token } = await authService.login({ email, password });
        res.json({ user, token });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
