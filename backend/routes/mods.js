const express = require('express');
const { requireAuth } = require('../middleware/auth');
const modService = require('../services/modService');

const router = express.Router();

router.delete('/:modId', requireAuth, async (req, res, next) => {
    try {
        await modService.deleteMod(req.user.id, req.params.modId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
});

module.exports = router;
