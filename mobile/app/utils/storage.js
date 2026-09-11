import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
    JWT: 'car_racing_jwt',
    USER: 'car_racing_user',
    GARAGE_CACHE: 'car_racing_garage_cache'
};

async function saveJWT(token) {
    await AsyncStorage.setItem(KEYS.JWT, token);
}

async function getJWT() {
    return AsyncStorage.getItem(KEYS.JWT);
}

async function clearJWT() {
    await AsyncStorage.removeItem(KEYS.JWT);
}

async function saveUser(user) {
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
}

async function getUser() {
    const raw = await AsyncStorage.getItem(KEYS.USER);
    return raw ? JSON.parse(raw) : null;
}

async function clearUser() {
    await AsyncStorage.removeItem(KEYS.USER);
}

async function clearSession() {
    await AsyncStorage.multiRemove([KEYS.JWT, KEYS.USER]);
}

// Garage is cached so GarageScreen has something to show immediately when
// opened offline (per spec item 17: "used as fallback if network
// unavailable") — the screen still tries the network first and only falls
// back to this on failure.
async function cacheGarage(cars) {
    await AsyncStorage.setItem(KEYS.GARAGE_CACHE, JSON.stringify(cars));
}

async function getCachedGarage() {
    const raw = await AsyncStorage.getItem(KEYS.GARAGE_CACHE);
    return raw ? JSON.parse(raw) : null;
}

export default {
    saveJWT,
    getJWT,
    clearJWT,
    saveUser,
    getUser,
    clearUser,
    clearSession,
    cacheGarage,
    getCachedGarage
};
