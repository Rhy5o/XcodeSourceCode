const test = require('node:test');
const assert = require('node:assert/strict');
const { generateCarSVG, deriveColor } = require('../services/svgCarRenderer');

function parseNumberAttr(svg, tag, attr) {
    const regex = new RegExp(`<${tag}[^>]*\\b${attr}="([\\d.]+)"`);
    const match = svg.match(regex);
    return match ? Number(match[1]) : null;
}

test('generateCarSVG: returns a well-formed SVG document', () => {
    const svg = generateCarSVG('BMW', 'M3 Competition', '#C62828', []);
    assert.match(svg, /^<svg viewBox="0 0 400 200" xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg, /<\/svg>$/);
    assert.equal((svg.match(/<svg/g) || []).length, 1);
    assert.equal((svg.match(/<\/svg>/g) || []).length, 1);
});

test('generateCarSVG: explicit color is used verbatim for the body fill', () => {
    const svg = generateCarSVG('BMW', 'M3', '#123456', []);
    assert.match(svg, /fill="#123456"/);
});

test('generateCarSVG: no color falls back to a deterministic derived color', () => {
    const a = generateCarSVG('BMW', 'M3 Competition', null, []);
    const b = generateCarSVG('BMW', 'M3 Competition', undefined, []);
    assert.equal(a, b);
    assert.equal(deriveColor('BMW', 'M3 Competition'), deriveColor('BMW', 'M3 Competition'));
});

test('generateCarSVG: different make/model can derive different colors', () => {
    // Not guaranteed for every pair (small palette), but this specific pair
    // is known to land on different palette entries — regression check that
    // deriveColor doesn't collapse to one constant color for everything.
    assert.notEqual(deriveColor('BMW', 'M3 Competition'), deriveColor('Ford', 'Focus RS'));
});

test('generateCarSVG: rejects an unsafe color value rather than embedding it', () => {
    const malicious = 'red" onload="alert(1)';
    const svg = generateCarSVG('BMW', 'M3', malicious, []);
    assert.ok(!svg.includes('onload'));
    assert.ok(!svg.includes(malicious));
});

test('generateCarSVG: escapes make/model in the accessible title', () => {
    const svg = generateCarSVG('<script>evil</script>', 'Model', '#ff0000', []);
    assert.ok(!svg.includes('<script>evil</script>'));
    assert.match(svg, /&lt;script&gt;evil&lt;\/script&gt;/);
});

test('generateCarSVG: draws exactly two wheels (front + rear)', () => {
    const svg = generateCarSVG('BMW', 'M3', '#C62828', []);
    // Each wheel is an outer tire circle — count fill="#1A1A1A" tire circles.
    const tireCount = (svg.match(/fill="#1A1A1A"/g) || []).length;
    assert.equal(tireCount, 2);
});

test('generateCarSVG: lowered_suspension pulls the body bottom edge down (closer to the wheel center)', () => {
    const stock = generateCarSVG('BMW', 'M3', '#C62828', []);
    const lowered = generateCarSVG('BMW', 'M3', '#C62828', ['lowered_suspension']);
    const stockBodyBottom = parseNumberAttr(stock, 'ellipse', 'cy'); // ground shadow is a stable proxy for ground position, unaffected by ride height
    assert.ok(stockBodyBottom !== null);

    // Extract the first M x y of the body path (the body's bottom-left start point).
    const stockStartY = Number(stock.match(/<path d="M [\d.]+ ([\d.]+)/)[1]);
    const loweredStartY = Number(lowered.match(/<path d="M [\d.]+ ([\d.]+)/)[1]);
    assert.ok(loweredStartY > stockStartY, `expected lowered body bottom (${loweredStartY}) to sit lower than stock (${stockStartY})`);

    // And the body must never fully swallow the wheel: body-bottom stays
    // above the wheel's own center in both cases (this is the bug that was
    // caught during manual visual review — the wheel disappearing entirely).
    const wheelCy = parseNumberAttr(stock, 'circle', 'cy');
    assert.ok(stockStartY < wheelCy);
    assert.ok(loweredStartY < wheelCy);
});

test('generateCarSVG: weight_reduction flattens the roofline (lower cabin profile)', () => {
    const stock = generateCarSVG('BMW', 'M3', '#C62828', []);
    const sleek = generateCarSVG('BMW', 'M3', '#C62828', ['weight_reduction']);
    assert.notEqual(stock, sleek);
});

test('generateCarSVG: turbo/supercharger/exhaust all add boost detailing', () => {
    const none = generateCarSVG('BMW', 'M3', '#C62828', []);
    for (const modType of ['turbo', 'supercharger', 'exhaust']) {
        const svg = generateCarSVG('BMW', 'M3', '#C62828', [modType]);
        assert.notEqual(svg, none, `${modType} should change the SVG output`);
        assert.match(svg, /#FFC107/, `${modType} should add the boost stripe color`);
    }
});

test('generateCarSVG: spoiler adds a rear wing, anchored over the trunk (not past the body)', () => {
    const svg = generateCarSVG('BMW', 'M3', '#C62828', ['spoiler']);
    assert.match(svg, /#212121/);
    const rearX = Number(svg.match(/<circle cx="(\d+)" cy="\d+\.?\d*" r="\d+" fill="#1A1A1A"/)[1]);
    // Spoiler struts should sit well before the rear wheel's x position —
    // regression check for the earlier bug where the spoiler was anchored
    // past the body's rear curve and floated disconnected from the car.
    const spoilerXMatch = svg.match(/<rect x="([\d.]+)" y="[\d.]+" width="4" height="24"/);
    assert.ok(spoilerXMatch, 'expected to find a spoiler strut rect');
    assert.ok(Number(spoilerXMatch[1]) < rearX);
});

test('generateCarSVG: race_tires (and its racing_tires alias) produce a spoke tread pattern', () => {
    const withRaceTires = generateCarSVG('BMW', 'M3', '#C62828', ['race_tires']);
    const withAlias = generateCarSVG('BMW', 'M3', '#C62828', ['racing_tires']);
    const withoutMod = generateCarSVG('BMW', 'M3', '#C62828', []);

    // The window divider itself is one <line> even without race tires, so
    // compare counts rather than asserting zero without the mod.
    const baselineLineCount = (withoutMod.match(/<line /g) || []).length;
    for (const svg of [withRaceTires, withAlias]) {
        const lineCount = (svg.match(/<line /g) || []).length;
        assert.ok(lineCount - baselineLineCount >= 8, `expected at least 8 spoke lines for race tires, got ${lineCount - baselineLineCount}`);
    }
});

test('generateCarSVG: cosmetic mod applies a paint style based on its description', () => {
    const metallic = generateCarSVG('BMW', 'M3', '#C62828', [{ mod_type: 'cosmetic', description: 'metallic finish' }]);
    const matte = generateCarSVG('BMW', 'M3', '#C62828', [{ mod_type: 'cosmetic', description: 'matte wrap' }]);
    const stripes = generateCarSVG('BMW', 'M3', '#C62828', [{ mod_type: 'cosmetic', description: 'racing stripes' }]);
    const plain = generateCarSVG('BMW', 'M3', '#C62828', []);

    assert.match(metallic, /linearGradient/);
    assert.ok(!matte.includes('linearGradient'));
    assert.notEqual(matte, plain);
    assert.match(stripes, /opacity="0.85"|opacity="0.9"/);
    assert.notEqual(stripes, plain);
});

test('generateCarSVG: accepts mods as plain mod_type strings or as {mod_type, description} rows interchangeably', () => {
    const asStrings = generateCarSVG('BMW', 'M3', '#C62828', ['turbo', 'spoiler']);
    const asRows = generateCarSVG('BMW', 'M3', '#C62828', [
        { mod_type: 'turbo', description: null },
        { mod_type: 'spoiler', description: null }
    ]);
    assert.equal(asStrings, asRows);
});

test('generateCarSVG: tolerates missing/empty inputs without throwing', () => {
    assert.doesNotThrow(() => generateCarSVG(undefined, undefined, undefined, undefined));
    assert.doesNotThrow(() => generateCarSVG('', '', '', []));
    assert.doesNotThrow(() => generateCarSVG('BMW', 'M3', '#C62828', [null, {}, 42, 'unknown_mod_type']));
});

test('generateCarSVG: unknown mod types are ignored rather than crashing or changing the render', () => {
    const base = generateCarSVG('BMW', 'M3', '#C62828', []);
    const withUnknown = generateCarSVG('BMW', 'M3', '#C62828', ['nitrous_injection_kit']);
    assert.equal(base, withUnknown);
});
