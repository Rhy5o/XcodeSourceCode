// Shared style constants so every screen/component doesn't repeat the same
// hex literals — mirrors the color values frontend/styles/globals.css uses,
// so the mobile app reads as the same product as the web app.
export const colors = {
    bg: '#0f1115',
    surface: '#171a21',
    surfaceAlt: '#1f232c',
    border: '#2a2f3a',
    text: '#f4f5f7',
    muted: '#9aa2b1',
    accent: '#ff4d4f',
    accent2: '#2fd36b',
    white: '#ffffff'
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
};

// WCAG-ish minimum touch target used throughout, same 44px floor as the
// web app's Stage 8 mobile-responsiveness pass.
export const MIN_TOUCH_TARGET = 44;

export default { colors, spacing, MIN_TOUCH_TARGET };
