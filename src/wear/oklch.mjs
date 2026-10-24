// OKLCH for fading colours with age: lightness stays, chroma drops, hue drifts toward yellow.
// Björn Ottosson's OKLab, from and to sRGB hex.

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function hexToOklch(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}

function oklchToLinear([L, C, h]) {
  const A = C * Math.cos((h * Math.PI) / 180);
  const B = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** OKLCH to hex, pulling chroma in until the colour fits sRGB. */
export function oklchToHex([L, C, h]) {
  let chroma = C;
  let rgb = oklchToLinear([L, chroma, h]);
  while (rgb.some((v) => v < -1e-4 || v > 1 + 1e-4) && chroma > 0) {
    chroma = Math.max(0, chroma - 0.002);
    rgb = oklchToLinear([L, chroma, h]);
  }
  return (
    '#' +
    rgb
      .map((v) => Math.round(toGamma(Math.min(1, Math.max(0, v))) * 255))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Where faded inks drift: a faint yellow grey, the colour of old paper, at the ink's lightness. */
export const AGED_HUE = 85;
const AGED_CHROMA = 0.03;

/**
 * A colour aged by amount (0–1): moved in OKLab, at its own lightness, 60% of the way toward the
 * aged grey at full amount. Saturated inks lose most of their colour and warm a little; a blue goes
 * slate rather than turning through purple, as a hue rotation would.
 */
export function fade(hex, amount) {
  const [L, C, h] = hexToOklch(hex);
  const t = 0.6 * amount;
  const rad = (d) => (d * Math.PI) / 180;
  const a = C * Math.cos(rad(h)) * (1 - t) + AGED_CHROMA * Math.cos(rad(AGED_HUE)) * t;
  const b = C * Math.sin(rad(h)) * (1 - t) + AGED_CHROMA * Math.sin(rad(AGED_HUE)) * t;
  return oklchToHex([L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360]);
}

/** Distance in OKLab, about 0.02 for a just-noticeable difference. */
export function deltaE(a, b) {
  const [L1, C1, h1] = hexToOklch(a);
  const [L2, C2, h2] = hexToOklch(b);
  const ab = (C, h) => [C * Math.cos((h * Math.PI) / 180), C * Math.sin((h * Math.PI) / 180)];
  const [a1, b1] = ab(C1, h1);
  const [a2, b2] = ab(C2, h2);
  return Math.hypot(L1 - L2, a1 - a2, b1 - b2);
}
