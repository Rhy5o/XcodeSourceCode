const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

async function apiFetch(path, options = {}) {
    const token = getToken();
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = {
        // Omit Content-Type for FormData bodies — the browser sets it
        // itself, including the multipart boundary, which we can't supply.
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    const contentType = res.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await res.json() : null;

    if (!res.ok) {
        throw new Error((body && body.error) || `Request failed with status ${res.status}`);
    }
    return body;
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
    compareStats: (car1Id, car2Id) => apiFetch(`/api/cars/compare?car1=${car1Id}&car2=${car2Id}`)
};

export { getToken, setToken, getUser, setUser, logout, API_URL };
