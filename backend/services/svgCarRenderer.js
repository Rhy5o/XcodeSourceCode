// Renders a stylized 2D side-view car as an SVG string — no image library,
// no file storage, just a template built from a handful of geometry
// constants that shift based on which mods are installed. Pure function:
// same (make, model, color, mods) always produces the same SVG string, so
// callers can cache/hash the output if they want to (this module itself
// never touches the filesystem or a DB).

// Same seeded-PRNG pattern as dvlaService.js's mock vehicle generator, so
// the same make/model always derives the same color when the caller
// doesn't supply one — mulberry32, seeded from a string hash.
function seededRandom(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
        h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
    }
    return function next() {
        h |= 0;
        h = (h + 0x6d2b79f5) | 0;
        let t = Math.imul(h ^ (h >>> 15), 1 | h);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// A curated palette of real-sounding car colors rather than random RGB —
// keeps derived-from-make/model cars looking like plausible paint jobs.
const COLOR_PALETTE = [
    '#C62828', // Racing Red
    '#1565C0', // Ocean Blue
    '#2E7D32', // British Racing Green
    '#F9A825', // Sunflower Yellow
    '#6A1B9A', // Deep Purple
    '#EF6C00', // Sunset Orange
    '#B0BEC5', // Arctic Silver
    '#263238', // Jet Black
    '#FAFAFA', // Pearl White
    '#0D47A1' // Midnight Blue
];

function deriveColor(make, model) {
    const rand = seededRandom(`${make || ''}|${model || ''}`);
    return COLOR_PALETTE[Math.floor(rand() * COLOR_PALETTE.length)];
}

// Only a hex color or a plain CSS color keyword is accepted — `color` can
// arrive from a public, unauthenticated query string (see routes/cars.js),
// so anything else (e.g. an attempt to break out of the fill="..."
// attribute) is rejected in favor of the derived color rather than ever
// being written into the SVG.
const SAFE_HEX = /^#[0-9a-fA-F]{3,8}$/;
const SAFE_KEYWORD = /^[a-zA-Z]{3,20}$/;
function sanitizeColor(color, make, model) {
    if (typeof color === 'string' && (SAFE_HEX.test(color) || SAFE_KEYWORD.test(color))) {
        return color;
    }
    return deriveColor(make, model);
}

function escapeXml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => {
        switch (ch) {
            case '&':
                return '&amp;';
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
            case '"':
                return '&quot;';
            default:
                return '&apos;';
        }
    });
}

// The mods table's real mod_type values (see modService.js's MOD_CATALOG)
// are turbo/supercharger/exhaust/lowered_suspension/weight_reduction/
// race_tires/cosmetic — "racing_tires" and "spoiler" aren't mod types any
// car can actually have today, but are accepted as aliases/extra types
// since the spec calls for them explicitly; harmless to support now and
// ready if the catalog grows a literal spoiler mod later.
const BOOST_TYPES = new Set(['turbo', 'supercharger', 'exhaust']);
const RACE_TIRE_TYPES = new Set(['race_tires', 'racing_tires']);

// Accepts mods as an array of mod_type strings, or an array of mod rows
// ({ mod_type, description }) straight from the `mods` table — whichever
// shape the caller already has on hand.
function normalizeMods(mods) {
    if (!Array.isArray(mods)) return [];
    return mods
        .map((m) => (typeof m === 'string' ? { mod_type: m, description: '' } : { mod_type: m?.mod_type, description: m?.description || '' }))
        .filter((m) => !!m.mod_type);
}

function mix(hex, amount) {
    // Lightens (amount > 0) or darkens (amount < 0) a #rrggbb color by
    // nudging each channel toward white/black — used for the gradient
    // highlight and shading rather than needing a color library.
    const match = /^#([0-9a-fA-F]{6})$/.exec(hex);
    if (!match) return hex;
    const num = parseInt(match[1], 16);
    const channels = [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff].map((c) => {
        const target = amount > 0 ? 255 : 0;
        const next = Math.round(c + (target - c) * Math.abs(amount));
        return Math.max(0, Math.min(255, next));
    });
    return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Draws a stylized side-view car as an SVG string.
 *
 * @param {string} make
 * @param {string} model
 * @param {string|null|undefined} color - CSS color, or falsy to derive one
 *   deterministically from make/model.
 * @param {Array<string|{mod_type: string, description?: string}>} mods
 * @returns {string} a self-contained `<svg>...</svg>` document.
 */
function generateCarSVG(make, model, color, mods) {
    const normalizedMods = normalizeMods(mods);
    const modTypes = new Set(normalizedMods.map((m) => m.mod_type));
    const cosmeticMod = normalizedMods.find((m) => m.mod_type === 'cosmetic');

    const bodyColor = sanitizeColor(color, make, model);
    const isLowered = modTypes.has('lowered_suspension');
    const isSleek = modTypes.has('weight_reduction');
    const hasBoost = [...modTypes].some((t) => BOOST_TYPES.has(t));
    const hasSpoiler = modTypes.has('spoiler');
    const hasRaceTires = [...modTypes].some((t) => RACE_TIRE_TYPES.has(t));

    // --- Geometry -----------------------------------------------------
    // Base layout assumes a stock car; each mod nudges a handful of these
    // numbers rather than branching the whole drawing routine.
    const groundY = 178;
    const wheelR = hasRaceTires ? 30 : 25;
    const wheelCx = { front: 110, rear: 300 };
    const wheelCy = groundY - wheelR;

    // The body's bottom edge (rocker panel) must sit ABOVE the wheel's own
    // center so the wheel reads as a wheel and not a hidden circle behind
    // the body — it only covers a small arch over the wheel's top. Lowered
    // suspension tightens that arch (closer to the wheel's center) for a
    // tucked, stanced look, while still leaving most of the tire visible.
    const wheelTopY = wheelCy - wheelR;
    const fenderCoverage = isLowered ? Math.round(wheelR * 0.85) : Math.round(wheelR * 0.55);
    const bodyBottomY = wheelTopY + fenderCoverage;

    // Weight reduction: a flatter, lower roofline reads as a sleeker,
    // thinned-out profile rather than a boxier stock cabin.
    const roofY = isSleek ? 78 : 63;
    const hoodY = bodyBottomY - 45;
    const trunkY = bodyBottomY - 42;

    const frontX = 45;
    const rearX = 365;
    const cabinFrontX = 150;
    const cabinRearX = 265;

    const bodyPath = [
        `M ${frontX} ${bodyBottomY}`,
        `C ${frontX - 8} ${bodyBottomY - 14}, ${frontX + 6} ${hoodY + 6}, ${frontX + 22} ${hoodY}`,
        `L ${cabinFrontX - 15} ${hoodY}`,
        `C ${cabinFrontX} ${roofY + 6}, ${cabinFrontX + 10} ${roofY}, ${cabinFrontX + 20} ${roofY}`,
        `L ${cabinRearX - 20} ${roofY}`,
        `C ${cabinRearX - 10} ${roofY}, ${cabinRearX} ${roofY + 6}, ${cabinRearX + 15} ${trunkY}`,
        `L ${rearX - 24} ${trunkY}`,
        `C ${rearX - 8} ${trunkY}, ${rearX} ${trunkY + 8}, ${rearX} ${bodyBottomY - 10}`,
        `C ${rearX} ${bodyBottomY - 2}, ${rearX - 4} ${bodyBottomY}, ${rearX - 12} ${bodyBottomY}`,
        `L ${frontX} ${bodyBottomY}`,
        'Z'
    ].join(' ');

    // --- Paint / cosmetic --------------------------------------------
    const desc = (cosmeticMod?.description || '').toLowerCase();
    const wantsMatte = desc.includes('matte');
    const wantsStripe = desc.includes('stripe');
    // Metallic is the default cosmetic treatment when a cosmetic mod is
    // present but its description doesn't name a specific style.
    const wantsMetallic = !!cosmeticMod && !wantsMatte && (desc.includes('metallic') || !wantsStripe);

    const gradientId = 'bodyPaint';
    let bodyFill = bodyColor;
    let defs = '';
    if (wantsMetallic) {
        defs += `<linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${mix(normalizeHex(bodyColor), 0.35)}"/>
            <stop offset="55%" stop-color="${bodyColor}"/>
            <stop offset="100%" stop-color="${mix(normalizeHex(bodyColor), -0.25)}"/>
        </linearGradient>`;
        bodyFill = `url(#${gradientId})`;
    } else if (wantsMatte) {
        // Matte: flatten toward a mid-tone (no gloss highlight/shadow) —
        // approximated by blending the color partway toward mid-grey.
        bodyFill = mix(mix(normalizeHex(bodyColor), -0.15), 0.1);
    }

    const stripeOverlay = wantsStripe
        ? `<path d="M ${cabinFrontX - 30} ${hoodY - 2} L ${frontX + 15} ${bodyBottomY - 4} L ${frontX + 26} ${bodyBottomY - 4} L ${cabinFrontX - 18} ${hoodY - 2} Z" fill="#FFFFFF" opacity="0.85"/>
           <rect x="${frontX + 10}" y="${hoodY - 6}" width="${rearX - frontX - 20}" height="6" fill="#FFFFFF" opacity="0.9"/>`
        : '';

    // --- Boost detailing (turbo/supercharger/exhaust) ------------------
    const boostDetail = hasBoost
        ? `<rect x="${frontX + 20}" y="${bodyBottomY - 22}" width="${rearX - frontX - 60}" height="5" fill="#FFC107" opacity="0.9" rx="2"/>
           <rect x="${frontX + 20}" y="${bodyBottomY - 14}" width="${rearX - frontX - 90}" height="3" fill="#FFC107" opacity="0.6" rx="1.5"/>
           <rect x="${rearX - 14}" y="${bodyBottomY - 10}" width="16" height="7" fill="#37474F" rx="2"/>
           <circle cx="${rearX + 4}" cy="${bodyBottomY - 6}" r="3" fill="#263238"/>`
        : '';

    // --- Spoiler --------------------------------------------------------
    // Mounted over the flat trunk-lid stretch of the body path (between
    // cabinRearX+15 and rearX-24), not at rearX itself — that's already
    // past where the path curves down into the rear bumper, which made an
    // earlier version of this look like a disconnected shape floating
    // beside the car instead of a wing sitting on the trunk.
    const spoilerX = cabinRearX + 30;
    const spoiler = hasSpoiler
        ? `<rect x="${spoilerX}" y="${trunkY - 24}" width="4" height="24" fill="#212121"/>
           <rect x="${spoilerX + 22}" y="${trunkY - 24}" width="4" height="24" fill="#212121"/>
           <rect x="${spoilerX - 6}" y="${trunkY - 28}" width="38" height="7" rx="2" fill="#212121"/>`
        : '';

    // --- Wheels ---------------------------------------------------------
    function wheel(cx) {
        const treadPattern = hasRaceTires
            ? Array.from({ length: 8 })
                  .map((_, i) => {
                      const angle = (i / 8) * Math.PI * 2;
                      const x1 = cx + Math.cos(angle) * (wheelR * 0.35);
                      const y1 = wheelCy + Math.sin(angle) * (wheelR * 0.35);
                      const x2 = cx + Math.cos(angle) * (wheelR * 0.78);
                      const y2 = wheelCy + Math.sin(angle) * (wheelR * 0.78);
                      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#B0BEC5" stroke-width="2"/>`;
                  })
                  .join('')
            : `<circle cx="${cx}" cy="${wheelCy}" r="${wheelR * 0.4}" fill="#B0BEC5"/>`;

        return `<circle cx="${cx}" cy="${wheelCy}" r="${wheelR}" fill="#1A1A1A"/>
                <circle cx="${cx}" cy="${wheelCy}" r="${wheelR * 0.62}" fill="#333333"/>
                ${treadPattern}`;
    }

    // --- Windows ---------------------------------------------------------
    const windowY = roofY + 8;
    const windowBottom = hoodY - 4;
    const windows = `<path d="M ${cabinFrontX - 6} ${windowBottom}
        L ${cabinFrontX + 18} ${windowY}
        L ${cabinRearX - 22} ${windowY}
        L ${cabinRearX + 6} ${windowBottom}
        Z" fill="#87CEEB" opacity="0.9"/>
        <line x1="${(cabinFrontX + cabinRearX) / 2}" y1="${windowY}" x2="${(cabinFrontX + cabinRearX) / 2}" y2="${windowBottom}" stroke="#37474F" stroke-width="2"/>`;

    const title = escapeXml(`${make || 'Custom'} ${model || 'Car'}`.trim());

    return `<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title}">
        <title>${title}</title>
        <defs>${defs}</defs>
        <!-- Ground shadow -->
        <ellipse cx="205" cy="${groundY + 6}" rx="170" ry="8" fill="#000000" opacity="0.18"/>
        <!-- Rear wheel (drawn first so the body overlaps its top half) -->
        ${wheel(wheelCx.rear)}
        <!-- Front wheel -->
        ${wheel(wheelCx.front)}
        <!-- Car body -->
        <path d="${bodyPath}" fill="${bodyFill}" stroke="${mix(normalizeHex(bodyColor), -0.4)}" stroke-width="1.5"/>
        ${stripeOverlay}
        <!-- Windows -->
        ${windows}
        ${boostDetail}
        ${spoiler}
    </svg>`.replace(/\n\s*/g, ' ').trim();
}

// mix() needs a real #rrggbb to blend — named keywords (accepted by
// sanitizeColor for the body fill) don't have a numeric form to mix, so
// this falls back to a neutral grey base for shading purposes only; the
// keyword itself is still used verbatim as the flat/gradient base color.
function normalizeHex(color) {
    return SAFE_HEX.test(color) && /^#([0-9a-fA-F]{6})$/.test(color) ? color : '#888888';
}

module.exports = { generateCarSVG, deriveColor };
