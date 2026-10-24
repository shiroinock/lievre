// Everything wear draws, as a pure function of the config: the texture pixels, where each part's
// tile starts, and the custom properties that place them. The build (npm run wear) writes these as
// PNG files and baked.css; the live provider builds the same pixels and properties in the browser,
// so both modes show the same grain, stains and dry brush for the same values.
import { hash32, mulberry32, noise2, seedFor } from './seed.mjs';
import { printMarks } from './marks.mjs';
import { encodeIndexedPng } from './png.mjs';
// Not params.mjs: the dev server's config loads this, and must not depend on wear.config.json.
import { OUTLINE_CAPS, TEXT_KINDS, THIN, TILE, VARIANTS } from './presets.mjs';

export const LEVELS = 16;
export const THEMES = ['paper', 'ink', 'sepia', 'rust'];
const smooth = (lo, hi, v) => Math.min(1, Math.max(0, (v - lo) / (hi - lo)));

/** Grain and stains: opacity 0..1 of the text colour, scaled by stain.strength in the palette. */
export function surfaceField(salt) {
  const grain = seedFor(salt, 'texture', 'grain');
  const stain = seedFor(salt, 'texture', 'stain');
  const cells = 4; // stain lattice cells per tile, wrapped so the tile repeats seamlessly
  const field = new Float32Array(TILE * TILE);
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const speck = smooth(0.82, 1, hash32(grain, x, y));
      const u = (x / TILE) * cells;
      const v = (y / TILE) * cells;
      const blot =
        noise2(stain, u, v, cells) * 0.65 +
        noise2(stain ^ 0x5bd1e995, u * 2, v * 2, cells * 2) * 0.35;
      field[y * TILE + x] = Math.max(speck, smooth(0.58, 0.82, blot) * 0.7);
    }
  return field;
}

/**
 * Dry brush: 1 where the ink took, dipping to kasure.floor along short horizontal streaks.
 * density is how many streaks run across a tile; threshold is where the thinning starts.
 */
export function kasureField(salt, { density, threshold, floor }) {
  const seed = seedFor(salt, 'texture', 'kasure');
  const across = Math.max(1, Math.round(density));
  const field = new Float32Array(TILE * TILE);
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const streak =
        noise2(seed, (x / TILE) * across, (y / TILE) * 64, [across, 64]) * 0.7 +
        hash32(seed, x, y) * 0.3;
      field[y * TILE + x] = 1 - smooth(threshold, threshold + 0.25, streak) * (1 - floor);
    }
  return field;
}

// Kasure rounds up so no step falls below the floor; surfaces stay at or under the strength.
export function quantise(field, round = Math.round) {
  const indices = new Uint8Array(field.length);
  for (let i = 0; i < field.length; i++)
    indices[i] = round(Math.min(1, field[i]) * (LEVELS - 1) - 1e-9);
  return indices;
}
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Text colour of each theme, from tokens.json. */
export function themeText(tokens, theme) {
  return (tokens[theme]?.text ?? tokens.paper.text).$value;
}

/** The pixels of every texture, as palette indices, and the PNG files built from them. */
export function textures(config, tokens, deflate) {
  const surface = quantise(surfaceField(config.salt));
  const kasure = quantise(kasureField(config.salt, config.kasure), Math.ceil);
  const files = {};
  for (const theme of THEMES) {
    const palette = Array.from({ length: LEVELS }, (_, i) => [
      ...rgb(themeText(tokens, theme)),
      Math.round((i / (LEVELS - 1)) * config.stain.strength * 255),
    ]);
    files[`surface-${theme}.png`] = encodeIndexedPng(TILE, surface, palette, deflate);
  }
  const alpha = Array.from({ length: LEVELS }, (_, i) => [
    0,
    0,
    0,
    Math.round((i / (LEVELS - 1)) * 255),
  ]);
  files['kasure.png'] = encodeIndexedPng(TILE, kasure, alpha, deflate);
  return { pixels: { surface, kasure }, files };
}

/** Where each part's tile starts, for the root, cards and each text kind. */
export function placements(salt) {
  const out = {};
  for (const kind of ['root', 'card', ...Object.keys(TEXT_KINDS)]) {
    const next = mulberry32(seedFor(salt, kind));
    out[kind] = Array.from({ length: VARIANTS }, () => [
      Math.floor(next() * TILE),
      Math.floor(next() * TILE),
    ]);
  }
  return out;
}

const hex2 = (v) =>
  Math.round(v * 255)
    .toString(16)
    .padStart(2, '0');

/**
 * Custom properties shared by both modes. kasure is the URL of the dry-brush mask.
 * Each kind's mask lays a flat layer over the dry brush, so a kind at depth f keeps at least
 * 1 - (1 - floor) * f (mask layers add: a + m * (1 - a), with a = 1 - f).
 */
export function wearVars(config, kasure) {
  const { shift, rule, dash } = printMarks(config.salt);
  const place = placements(config.salt);
  const at = ([x, y]) => `${x}px ${y}px`;
  const vars = {
    '--k-wear-kasure': kasure,
    '--k-wear-shift': shift,
    '--k-wear-rule': rule,
    '--k-wear-dash': dash,
    '--k-wear-root-pos': at(place.root[0]),
  };
  for (let n = 0; n < VARIANTS; n++) vars[`--k-wear-card-pos-${n}`] = at(place.card[n]);
  for (const kind of Object.keys(TEXT_KINDS)) {
    const depth = config.kinds[kind].kasure;
    const flat = `#000000${hex2(1 - depth)}`;
    vars[`--k-wear-${kind}-mask`] =
      depth > 0 ? `linear-gradient(${flat}, ${flat}), var(--k-wear-kasure)` : 'none';
    for (let n = 0; n < VARIANTS; n++) vars[`--k-wear-${kind}-pos-${n}`] = at(place[kind][n]);
  }
  return vars;
}

/**
 * Which face each text kind is set in under baked wear: the worn faces from npm run wear:font for
 * the kinds whose edges wear, the plain ones otherwise. The tuning page swaps --k-wear-sans and
 * --k-wear-mono for faces baked on the spot from unsaved values.
 */
export function faceVars(config) {
  const vars = {};
  for (const [kind, { font }] of Object.entries(TEXT_KINDS)) {
    const worn = config.kinds[kind].distort;
    vars[`--k-wear-${kind}-face`] = worn ? `var(--k-wear-${font})` : `var(--k-font-${font})`;
    vars[`--k-wear-${kind}-mono`] = worn ? 'var(--k-wear-mono)' : 'var(--k-font-mono)';
  }
  return vars;
}

/**
 * Live edge wear for a kind, matched to the baked font's rough edge at the kind's size: the same
 * grain (roughScale) and the same capped reach (rough). A displacement filter moves the drawn
 * pixels rather than the outline, so it roughens the edge without the baked font's swell, and its
 * noise is not the font's; the tuning page says so.
 */
export function liveEdge(config, kind) {
  const { font, size } = TEXT_KINDS[kind];
  const em = font === 'mono' ? size * 0.83333 : size;
  const { rough, roughScale } = config.outline;
  const reach = Math.min(rough, OUTLINE_CAPS.edge * THIN[font]);
  return {
    // feTurbulence's lattice spacing is 1 / baseFrequency px; the font's is roughScale/1000 em.
    // Finer than about a pixel only aliases into speckle, so stop there.
    baseFrequency: +Math.min(1, 1000 / (roughScale * em)).toFixed(4),
    // fractalNoise rarely leaves 0.5 ± 0.3, so the peak shift is about scale × 0.3.
    scale: +(((reach / 1000) * em) / 0.3).toFixed(3),
  };
}
