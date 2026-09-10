require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const carRoutes = require('./routes/cars');
const modRoutes = require('./routes/mods');
const leaderboardRoutes = require('./routes/leaderboard');
const showRoutes = require('./routes/show');
const usersRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const { startScheduler } = require('./services/schedulerService');

const app = express();
const PORT = process.env.PORT || 3001;
const MATCH_INTERVAL_MINUTES = Number(process.env.MATCH_INTERVAL_MINUTES) || 5;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// Local disk storage for mod photos (temporary — will move to S3 later).
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/mods', modRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/show', showRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

let server;
if (require.main === module) {
    server = app.listen(PORT, () => {
        console.log(`Backend API listening on http://localhost:${PORT}`);
    });

    startScheduler(MATCH_INTERVAL_MINUTES);
}

module.exports = app;
