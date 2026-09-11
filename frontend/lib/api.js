const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 500;

function getToken() {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('token');
}

function setToken(token) {
    if (typeof window === 'undefined') return;
    if (token) {
        window.localStorage.setItem('token', token);
    } else {
        window.localStorage.removeItem('token');
    }
}

function getUser() {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
}

function setUser(user) {
    if (typeof window === 'undefined') return;
    if (user) {
        window.localStorage.setItem('user', JSON.stringify(user));
    } else {
        window.localStorage.removeItem('user');
    }
}

function logout() {
    setToken(null);
    setUser(null);
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildApiError(message, { status, retryable = false, isNetworkError = false } = {}) {
    const err = new Error(message);
    err.status = status;
    err.retryable = retryable;
    err.isNetworkError = isNetworkError;
    return err;
}

/**
 * One HTTP attempt with a hard 30s timeout. Returns the parsed body on
 * success; throws a buildApiError() on any non-2xx response or network
 * failure, marked `retryable` for the cases apiFetch's retry loop should
 * retry (network failures and 5xx — never 4xx, since retrying a bad
 * request/auth error just repeats the same failure).
 */
async function attemptFetch(path, options) {
    const token = getToken();
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = {
        // Omit Content-Type for FormData bodies — the browser sets it
        // itself, including the multipart boundary, which we can't supply.
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res;
    try {
        res = await fetch(`${API_URL}${path}`, { ...options, headers, signal: controller.signal });
    } catch (err) {
        if (err.name === 'AbortError') {
            throw buildApiError('Request timed out. Please try again.', { retryable: true, isNetworkError: true });
        }
        throw buildApiError('Network error — check your connection and try again.', {
            retryable: true,
            isNetworkError: true
        });
    } finally {
        clearTimeout(timeoutId);
    }

    const contentType = res.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await res.json() : null;

    if (!res.ok) {
        const message = (body && body.error) || `Request failed with status ${res.status}`;
        throw buildApiError(message, { status: res.status, retryable: res.status >= 500 });
    }
    return body;
}

/**
 * Retries only idempotent requests (no explicit method, i.e. a plain GET) —
 * retrying a POST/PUT/DELETE automatically risks repeating a mutation
 * (double-follow, duplicate comment) if the first attempt actually
 * succeeded server-side but the response was lost. Backs off exponentially:
 * 500ms, 1000ms.
 */
async function apiFetch(path, options = {}) {
    const isIdempotent = !options.method || options.method.toUpperCase() === 'GET';
    let lastErr;

    for (let attempt = 0; attempt <= (isIdempotent ? MAX_RETRIES : 0); attempt++) {
        try {
            return await attemptFetch(path, options);
        } catch (err) {
            lastErr = err;
            const isLastAttempt = attempt === (isIdempotent ? MAX_RETRIES : 0);
            if (!err.retryable || isLastAttempt) throw err;
            await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
        }
    }
    throw lastErr;
}

export const api = {
    signup: (data) => apiFetch('/api/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
    login: (data) => apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    getCars: () => apiFetch('/api/cars'),
    getPublicCars: () => apiFetch('/api/cars/public/all'),
    getGarage: () => apiFetch('/api/cars/garage'),
    getCarWithMods: (carId) => apiFetch(`/api/cars/${carId}`),
    registerCar: (regPlate) => apiFetch('/api/cars/register', { method: 'POST', body: JSON.stringify({ regPlate }) }),
    activateCar: (carId) => apiFetch(`/api/cars/${carId}/activate`, { method: 'PUT' }),
    createCar: (data) => apiFetch('/api/cars', { method: 'POST', body: JSON.stringify(data) }),
    addMod: (carId, modType, description, file) => {
        const formData = new FormData();
        formData.append('carId', carId);
        formData.append('modType', modType);
        if (description) formData.append('description', description);
        if (file) formData.append('photo', file);
        return apiFetch('/api/mods', { method: 'POST', body: formData });
    },
    deleteMod: (modId) => apiFetch(`/api/mods/${modId}`, { method: 'DELETE' }),
    getModCatalog: () => apiFetch('/api/mods/catalog'),
    getLeaderboard: (season = 'current', page = 1, limit = 25) =>
        apiFetch(`/api/leaderboard?season=${encodeURIComponent(season)}&page=${page}&limit=${limit}`),
    getMyMatches: () => apiFetch('/api/leaderboard/matches/mine'),
    getShowStatus: () => apiFetch('/api/show/status'),
    goOnline: () => apiFetch('/api/show/go-online', { method: 'PUT' }),
    goOffline: () => apiFetch('/api/show/go-offline', { method: 'PUT' }),
    getUserProfile: (userId) => apiFetch(`/api/users/${userId}/profile`),
    getUserBadges: (userId) => apiFetch(`/api/users/${userId}/badges`),
    getUserMatches: (userId, limit = 10) => apiFetch(`/api/users/${userId}/matches?limit=${limit}`),
    searchUsers: (query) => apiFetch(`/api/users/search?q=${encodeURIComponent(query)}`),
    getUserGarage: (userId) => apiFetch(`/api/users/${userId}/garage`),

    // Social
    followUser: (userId) => apiFetch(`/api/social/follow/${userId}`, { method: 'POST' }),
    unfollowUser: (userId) => apiFetch(`/api/social/follow/${userId}`, { method: 'DELETE' }),
    getFollowers: (userId) => apiFetch(`/api/social/followers/${userId}`),
    getFollowing: (userId) => apiFetch(`/api/social/following/${userId}`),
    getFollowingFeed: () => apiFetch('/api/social/feed'),

    // Clans
    createClan: (name, description) =>
        apiFetch('/api/clans', { method: 'POST', body: JSON.stringify({ name, description }) }),
    listClans: ({ q, sort, page, limit } = {}) => {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (sort) params.set('sort', sort);
        if (page) params.set('page', page);
        if (limit) params.set('limit', limit);
        return apiFetch(`/api/clans?${params.toString()}`);
    },
    getClan: (clanId) => apiFetch(`/api/clans/${clanId}`),
    joinClan: (clanId) => apiFetch(`/api/clans/${clanId}/join`, { method: 'PUT' }),
    leaveClan: (clanId) => apiFetch(`/api/clans/${clanId}/leave`, { method: 'DELETE' }),
    getClanLeaderboard: (clanId) => apiFetch(`/api/clans/${clanId}/leaderboard`),
    kickClanMember: (clanId, userId) => apiFetch(`/api/clans/${clanId}/members/${userId}`, { method: 'DELETE' }),

    // Comments
    addComment: (carId, text) =>
        apiFetch(`/api/cars/${carId}/comments`, { method: 'POST', body: JSON.stringify({ comment_text: text }) }),
    getComments: (carId) => apiFetch(`/api/cars/${carId}/comments`),
    deleteComment: (carId, commentId) => apiFetch(`/api/cars/${carId}/comments/${commentId}`, { method: 'DELETE' }),

    // Comparison
    compareStats: (car1Id, car2Id) => apiFetch(`/api/cars/compare?car1=${car1Id}&car2=${car2Id}`),

    // Admin (internal only — gated server-side by the x-admin-secret header)
    getAdminStats: (adminSecret) => apiFetch('/api/admin/stats', { headers: { 'x-admin-secret': adminSecret } })
};

export { getToken, setToken, getUser, setUser, logout, API_URL };
