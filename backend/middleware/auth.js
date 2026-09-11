const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Missing authorization token' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: payload.sub, username: payload.username };
        next();
    } catch (_err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// For routes that are public but behave differently when the caller is
// known (e.g. a car detail page that's viewable by anyone but shows
// management controls to its owner) — sets req.user if a valid token is
// present, but never rejects the request when one isn't.
function optionalAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next();

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: payload.sub, username: payload.username };
    } catch (_err) {
        // Invalid/expired token on an optional-auth route: proceed as anonymous.
    }
    next();
}

module.exports = { requireAuth, optionalAuth };
