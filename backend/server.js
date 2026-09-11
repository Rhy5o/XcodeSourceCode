const env = require('./config/env'); // validates required vars and exits early if any are missing
const crypto = require('crypto');
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
const socialRoutes = require('./routes/social');
const clanRoutes = require('./routes/clans');
const { startScheduler } = require('./services/schedulerService');
const healthCheckJob = require('./jobs/healthCheck');
const logger = require('./monitoring/logger');

const app = express();

app.use(cors({ origin: env.FRONTEND_ORIGIN }));
app.use(express.json());

app.get('/health', async (req, res) => {
    const status = await healthCheckJob.runHealthCheck();
    res.status(status.healthy ? 200 : 503).json({ uptime: process.uptime(), ...status });
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
app.use('/api/social', socialRoutes);
app.use('/api/clans', clanRoutes);

app.use((req, res) => {
    const errorId = crypto.randomUUID();
    logger.logInfo('404 not found', { errorId, method: req.method, path: req.originalUrl });
    res.status(404).json({ error: 'Not found', errorId });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    const errorId = crypto.randomUUID();
    const status = err.status || 500;

    // Full stack trace always goes to the log; the client only ever gets a
    // generic message + an errorId to quote when reporting the problem —
    // never the raw error message for a 500 (it can leak internals like
    // query fragments), though a deliberate 4xx (err.status set, e.g. a
    // validation error) is safe and useful to show as-is.
    logger.logError(err, { errorId, method: req.method, path: req.originalUrl, status });

    const message = status < 500 ? err.message : 'Internal server error';
    res.status(status).json({ error: message, errorId });
});

if (require.main === module) {
    app.listen(env.PORT, () => {
        console.log(`Backend API listening on http://localhost:${env.PORT}`);
    });

    startScheduler(env.MATCH_INTERVAL_MINUTES);
    healthCheckJob.startHealthCheckJob(env.HEALTH_CHECK_INTERVAL_MINUTES);
}

module.exports = app;
