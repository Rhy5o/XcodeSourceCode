const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');
const modService = require('../services/modService');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${crypto.randomUUID()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            return cb(new Error('Only JPEG, PNG, WEBP or GIF photos are allowed'));
        }
        cb(null, true);
    }
});

router.post('/', requireAuth, upload.single('photo'), async (req, res, next) => {
    try {
        const { carId, modType, description } = req.body;
        if (!carId) return res.status(400).json({ error: 'carId is required' });

        const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;
        const mod = await modService.addModForOwner(req.user.id, carId, { modType, description, photoUrl });
        res.status(201).json({ mod });
    } catch (err) {
        next(err);
    }
});

router.get('/catalog', (req, res) => {
    res.json({ catalog: modService.MOD_CATALOG });
});

router.get('/:carId', requireAuth, async (req, res, next) => {
    try {
        const mods = await modService.listModsForCarOwnedBy(req.user.id, req.params.carId);
        res.json({ mods });
    } catch (err) {
        next(err);
    }
});

router.delete('/:modId', requireAuth, async (req, res, next) => {
    try {
        await modService.deleteModForOwner(req.user.id, req.params.modId);
        res.status(204).send();
    } catch (err) {
        next(err);
    }
});

// Multer errors (bad file type, too large) arrive here rather than as a
// thrown app error, so translate them into the same 400 JSON shape.
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
    }
    if (err && err.message && err.message.includes('photos are allowed')) {
        return res.status(400).json({ error: err.message });
    }
    next(err);
});

module.exports = router;
