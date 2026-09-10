// Mock stand-in for the real DVLA Vehicle Enquiry Service API
// (https://developer-portal.driver-vehicle-licensing.api.gov.uk/).
// Swap `lookupByRegPlate` for a real HTTP call to that API later —
// callers only depend on the shape of the object it resolves to.

const { normalize, isValidUkRegPlate } = require('./regPlateService');

const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric'];

const MAKES = {
    BMW: ['M3 Competition', 'M4', '335i', '120d'],
    Audi: ['RS3', 'S3', 'A4 Avant', 'TT'],
    Ford: ['Fiesta ST', 'Focus RS', 'Mustang GT'],
    Volkswagen: ['Golf GTI', 'Golf R', 'Polo GTI'],
    Nissan: ['Skyline GT-R', '370Z', 'Juke Nismo'],
    Toyota: ['GR Yaris', 'Supra', 'GT86'],
    Honda: ['Civic Type R', 'S2000', 'NSX'],
    Subaru: ['Impreza WRX STI', 'BRZ']
};
const MAKE_NAMES = Object.keys(MAKES);

// A handful of curated plates so demos/tests can rely on stable, realistic data.
const MOCK_CATALOG = {
    AB12CDE: { make: 'BMW', model: 'M3 Competition', bhp: 503, acceleration0to60: 3.8, weight: 1730, engineSize: '3.0L', fuelType: 'Petrol' },
    LN64XYZ: { make: 'Ford', model: 'Focus RS', bhp: 345, acceleration0to60: 4.7, weight: 1575, engineSize: '2.3L', fuelType: 'Petrol' },
    YY19ABC: { make: 'Nissan', model: 'Skyline GT-R', bhp: 280, acceleration0to60: 4.9, weight: 1560, engineSize: '2.6L', fuelType: 'Petrol' }
};

// Small deterministic PRNG (mulberry32) seeded from the reg plate string,
// so the same plate always resolves to the same mock vehicle.
function seededRandom(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
        h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
    }
    return function next() {
        h |= 0;
        h = (h + 0x6d2b79f5) | 0;
        let t = Math.imul(h ^ (h >>> 15), 1 | h);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function pick(rand, list) {
    return list[Math.floor(rand() * list.length)];
}

function round(value, dp) {
    const factor = 10 ** dp;
    return Math.round(value * factor) / factor;
}

function generateFromPlate(plate) {
    const rand = seededRandom(plate);
    const make = pick(rand, MAKE_NAMES);
    const model = pick(rand, MAKES[make]);

    return {
        make,
        model,
        bhp: Math.round(150 + rand() * 500), // 150-650 bhp
        acceleration0to60: round(2.8 + rand() * 5.5, 1), // 2.8s - 8.3s
        weight: Math.round(1100 + rand() * 900), // 1100kg - 2000kg
        engineSize: `${round(1.0 + rand() * 3.0, 1)}L`,
        fuelType: pick(rand, FUEL_TYPES)
    };
}

/**
 * Looks up vehicle data for a UK registration plate. In production this
 * would call the real DVLA API; for now it returns deterministic mock data
 * so the same plate always yields the same "vehicle".
 */
async function lookupByRegPlate(regPlate) {
    if (!isValidUkRegPlate(regPlate)) {
        const err = new Error('regPlate is not a recognised UK registration plate');
        err.status = 400;
        throw err;
    }

    const plate = normalize(regPlate);
    const data = MOCK_CATALOG[plate] || generateFromPlate(plate);

    return { regPlate: plate, ...data, source: 'mock-dvla' };
}

module.exports = { lookupByRegPlate };
