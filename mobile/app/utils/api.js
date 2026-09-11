import axios from 'axios';
import storage from './storage';

// EXPO_PUBLIC_-prefixed vars are inlined at build time by Expo (SDK 49+) —
// the same mechanism as web's NEXT_PUBLIC_API_URL. "localhost" only reaches
// the backend from a simulator running on the same machine as the dev
// server; a physical device needs the dev machine's LAN IP instead (e.g.
// http://192.168.1.23:3001) — see mobile/.env.example.
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

const client = axios.create({
    baseURL: API_URL,
    timeout: 15000
});

client.interceptors.request.use(async (config) => {
    const token = await storage.getJWT();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Set by RootNavigator so a 401 (expired/invalid token) can force the app
// back to the auth flow instead of every screen having to check for it.
let onUnauthorized = null;
function setOnUnauthorized(handler) {
    onUnauthorized = handler;
}

client.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response && error.response.status === 401) {
            await storage.clearSession();
            if (onUnauthorized) onUnauthorized();
        }
        const message = error.response?.data?.error || error.message || 'Something went wrong';
        return Promise.reject(new Error(message));
    }
);

async function request(method, url, data, config = {}) {
    const res = await client.request({ method, url, data, ...config });
    return res.data;
}

// Only exported as the default export (not also as a named `api` export) —
// having both under the same identifier trips import/no-named-as-default
// on every `import api from './api'` call site.
const api = {
    API_URL,
    setOnUnauthorized,

    // Auth
    login: (data) => request('post', '/api/auth/login', data),
    signup: (data) => request('post', '/api/auth/signup', data),

    // Cars / garage
    getGarage: () => request('get', '/api/cars/garage'),
    getUserGarage: (userId) => request('get', `/api/users/${userId}/garage`),
    getCarWithMods: (carId) => request('get', `/api/cars/${carId}`),
    registerCar: (regPlate) => request('post', '/api/cars/register', { regPlate }),
    activateCar: (carId) => request('put', `/api/cars/${carId}/activate`),
    getModCatalog: () => request('get', '/api/mods/catalog'),
    addMod: (carId, modType, description, photo) => {
        const formData = new FormData();
        formData.append('carId', carId);
        formData.append('modType', modType);
        if (description) formData.append('description', description);
        if (photo) {
            // React Native's fetch/axios FormData wants { uri, name, type }
            // rather than a browser File/Blob.
            formData.append('photo', { uri: photo.uri, name: photo.fileName || 'mod.jpg', type: photo.mimeType || 'image/jpeg' });
        }
        return request('post', '/api/mods', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    },

    // Show / racing
    getShowStatus: () => request('get', '/api/show/status'),
    goOnline: () => request('put', '/api/show/go-online'),
    goOffline: () => request('put', '/api/show/go-offline'),
    getMyMatches: () => request('get', '/api/leaderboard/matches/mine'),

    // Leaderboard
    getLeaderboard: (season = 'current', page = 1, limit = 100) =>
        request('get', `/api/leaderboard?season=${encodeURIComponent(season)}&page=${page}&limit=${limit}`),

    // Users / profile / social
    getUserProfile: (userId) => request('get', `/api/users/${userId}/profile`),
    getUserBadges: (userId) => request('get', `/api/users/${userId}/badges`),
    getUserMatches: (userId, limit = 10) => request('get', `/api/users/${userId}/matches?limit=${limit}`),
    followUser: (userId) => request('post', `/api/social/follow/${userId}`),
    unfollowUser: (userId) => request('delete', `/api/social/follow/${userId}`)
};

export { API_URL };
export default api;
