// UK registration plate validation & normalisation.
// Supports current format (AB12 CDE) and older formats (A123 BCD, ABC 123A, etc).

const CURRENT_FORMAT = /^[A-Z]{2}[0-9]{2}[A-Z]{3}$/; // e.g. AB12CDE
const PREFIX_FORMAT = /^[A-Z][0-9]{1,3}[A-Z]{3}$/; // e.g. A123BCD
const SUFFIX_FORMAT = /^[A-Z]{3}[0-9]{1,3}[A-Z]$/; // e.g. ABC123A
const DATELESS_FORMAT = /^[A-Z]{1,3}[0-9]{1,4}$|^[0-9]{1,4}[A-Z]{1,3}$/;

function normalize(plate) {
    return String(plate || '')
        .toUpperCase()
        .replace(/\s+/g, '')
        .trim();
}

function isValidUkRegPlate(plate) {
    const normalized = normalize(plate);
    if (!normalized || normalized.length < 2 || normalized.length > 7) {
        return false;
    }
    return (
        CURRENT_FORMAT.test(normalized) ||
        PREFIX_FORMAT.test(normalized) ||
        SUFFIX_FORMAT.test(normalized) ||
        DATELESS_FORMAT.test(normalized)
    );
}

module.exports = { normalize, isValidUkRegPlate };
