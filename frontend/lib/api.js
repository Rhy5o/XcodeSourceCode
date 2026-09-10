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
    const headers = {
        'Content-Type': 'application/json',
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
    getCar: (carId) => apiFetch(`/api/cars/${carId}`),
    createCar: (data) => apiFetch('/api/cars', { method: 'POST', body: JSON.stringify(data) }),
    addMod: (carId, data) => apiFetch(`/api/cars/${carId}/mods`, { method: 'POST', body: JSON.stringify(data) }),
    getLeaderboard: () => apiFetch('/api/leaderboard'),
    getMyMatches: () => apiFetch('/api/leaderboard/matches/mine')
};

export { getToken, setToken, getUser, setUser, logout, API_URL };
