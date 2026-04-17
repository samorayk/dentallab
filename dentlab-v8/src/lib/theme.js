// Theme factory — pass an accent hex and get a full palette.
// To change the palette, edit this one file.

export function makeTheme(accent = '#2D6A4F') {
  return {
    bg: '#F6F4EF',
    card: '#FFFFFF',
    bdr: '#E4DFD6',
    bdrL: '#EFEBE3',
    tx: '#1A1612',
    txM: '#5C5346',
    txL: '#9B9182',
    ac: accent,
    acL: withAlpha(accent, 0.12),
    acD: darken(accent, 0.15),
    gld: '#B8860B',
    dng: '#C53030',
    ok:  '#059669',
    warn:'#D97706',
  };
}

function withAlpha(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function darken(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - amt;
  return rgbToHex(Math.round(r * f), Math.round(g * f), Math.round(b * f));
}
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

export const FONT_SANS  = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
export const FONT_SERIF = "'Playfair Display', Georgia, serif";
