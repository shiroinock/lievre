// Everything wear draws, as a pure function of the config: the texture pixels, where each part's
// tile starts, and the custom properties that place them. The build (npm run wear) writes these as
// PNG files and baked.css; the live provider builds the same pixels and properties in the browser,
// so both modes show the same grain, stains and dry brush for the same values.
import { hash32, mulberry32, noise2, seedFor } from './seed.mjs';
import { printMarks } from './marks.mjs';
import { encodeIndexedPng } from './png.mjs';
import { heldOutline, resolve, themeTokens } from './contrast.mjs';
// Not params.mjs: the dev server's config loads this, and must not depend on wear.config.json.
import { OUTLINE_CAPS, SHEET, SHEET_SLICE, TEXT_KINDS, THIN, TILE, VARIANTS } from './presets.mjs';

export const LEVELS = 16;
export const THEMES = ['paper', 'ink'];
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

/**
 * Yake: how far the sheet has browned, 0..1, as a frame image cut into nine for border-image.
 * Each edge browns inward over at most SHEET_SLICE pixels; low-frequency noise shortens the reach
 * and thins the colour from place to place (mottle), so the line it stops at wanders. Where two
 * edges meet the browning adds up, and corner adds more; 1 is the darkest corner. The middle of
 * the image stays clear, so stretching the edges to any size keeps the corners the same.
 */
export function yakeField(salt, { mottle, corner }) {
  const reachSeed = seedFor(salt, 'texture', 'yake-reach');
  const toneSeed = seedFor(salt, 'texture', 'yake-tone');
  const field = new Float32Array(SHEET * SHEET);
  for (let y = 0; y < SHEET; y++)
    for (let x = 0; x < SHEET; x++) {
      const wander =
        noise2(reachSeed, x / 90, y / 90) * 0.7 +
        noise2(reachSeed ^ 0x9e3779b9, x / 30, y / 30) * 0.3;
      const reach = SHEET_SLICE * (1 - mottle * 0.6 * wander);
      const fall = (d) => (d >= reach ? 0 : (1 - d / reach) ** 2);
      const across = Math.max(fall(x), fall(SHEET - 1 - x));
      const down = Math.max(fall(y), fall(SHEET - 1 - y));
      const browned = (1 - (1 - across) * (1 - down) + corner * across * down) / (1 + corner);
      field[y * SHEET + x] = browned * (1 - mottle * 0.5 * noise2(toneSeed, x / 48, y / 48));
    }
  return field;
}

/**
 * Sure: sparse scuffs where the colour has rubbed off, 0..1 on a repeating tile. Mostly short
 * streaks along the direction of rubbing, gathered in patches; density is how many (0–1).
 * Where they show (near the edges and along the fold) is a mask in CSS, so the tile repeats.
 */
export function sureField(salt, { density }) {
  const streakSeed = seedFor(salt, 'texture', 'sure-streak');
  const patchSeed = seedFor(salt, 'texture', 'sure-patch');
  const speckSeed = seedFor(salt, 'texture', 'sure-speck');
  const cut = 0.92 - density * 0.3;
  const field = new Float32Array(TILE * TILE);
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const u = x / TILE;
      const v = y / TILE;
      const rubbed =
        noise2(streakSeed, u * 8, v * 56, [8, 56]) * 0.7 + noise2(patchSeed, u * 5, v * 5, 5) * 0.3;
      field[y * TILE + x] =
        smooth(cut, cut + 0.1, rubbed) * (0.55 + 0.45 * hash32(speckSeed, x, y));
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
const blend = (a, b, t) => rgb(a).map((c, i) => Math.round(c + (rgb(b)[i] - c) * t));

/** Text colour of each theme, from tokens.json. */
export function themeText(tokens, theme) {
  return (tokens[theme]?.text ?? tokens.paper.text).$value;
}

/** The pixels of every texture, as palette indices, and the PNG files built from them. */
export function textures(config, tokens, deflate) {
  const surface = quantise(surfaceField(config.salt));
  const kasure = quantise(kasureField(config.salt, config.kasure), Math.ceil);
  const yake = quantise(yakeField(config.salt, config.yake));
  const sure = quantise(sureField(config.salt, config.sure));
  const files = {};
  for (const theme of THEMES) {
    const tone = config.tones[theme];
    // Paler where it has just begun, the full tone at the edge.
    const yakePalette = Array.from({ length: LEVELS }, (_, i) => [
      ...blend('#ffffff', tone.yake, 0.7 + (0.3 * i) / (LEVELS - 1)),
      Math.round((i / (LEVELS - 1)) * config.yake.strength * tone.amount * 255),
    ]);
    files[`yake-${theme}.png`] = encodeIndexedPng(SHEET, yake, yakePalette, deflate);
    const surePalette = Array.from({ length: LEVELS }, (_, i) => [
      ...rgb(tone.sure),
      Math.round((i / (LEVELS - 1)) * config.sure.strength * 255),
    ]);
    files[`sure-${theme}.png`] = encodeIndexedPng(TILE, sure, surePalette, deflate);
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
  return { pixels: { surface, kasure, yake, sure }, files };
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
  const { rule, dash } = printMarks(config.salt);
  const place = placements(config.salt);
  const at = ([x, y]) => `${x}px ${y}px`;
  const vars = {
    '--lv-wear-kasure': kasure,
    '--lv-wear-rule': rule,
    '--lv-wear-dash': dash,
    '--lv-wear-root-pos': at(place.root[0]),
  };
  for (let n = 0; n < VARIANTS; n++) vars[`--lv-wear-card-pos-${n}`] = at(place.card[n]);
  for (const kind of Object.keys(TEXT_KINDS)) {
    const depth = config.kinds[kind].kasure;
    const flat = `#000000${hex2(1 - depth)}`;
    vars[`--lv-wear-${kind}-mask`] =
      depth > 0 ? `linear-gradient(${flat}, ${flat}), var(--lv-wear-kasure)` : 'none';
    for (let n = 0; n < VARIANTS; n++) vars[`--lv-wear-${kind}-pos-${n}`] = at(place[kind][n]);
  }
  return vars;
}

/**
 * Where the sheet wears, shared by both modes: how far the browning reaches, and the mask that
 * keeps scuffs to the edges and to one fold, a little off the middle (placed by the salt).
 */
export function sheetVars(config) {
  const { reach } = config.yake;
  const fold = 44 + mulberry32(seedFor(config.salt, 'fold'))() * 12;
  const r = `${reach}px`;
  const ink = `#000000${hex2(config.sure.fold)}`;
  return {
    '--lv-wear-yake-reach': r,
    '--lv-wear-sure-mask':
      `linear-gradient(to right, #000, transparent ${r}, transparent calc(${fold.toFixed(1)}% - 40px), ` +
      `${ink} ${fold.toFixed(1)}%, transparent calc(${fold.toFixed(1)}% + 40px), ` +
      `transparent calc(100% - ${r}), #000), ` +
      `linear-gradient(to bottom, #000, transparent ${r}, transparent calc(100% - ${r}), #000)`,
  };
}

/**
 * Per-theme sheet values: the frame and scuff images, the browned rim cards and metrics take
 * when yake.surfaces is above 0 (an inset shadow, so it keeps its width on any size of card), and
 * control outlines held at 3:1 on the worn paper.
 */
export function sheetThemeVars(config, theme, urls, tokens) {
  const tone = config.tones[theme];
  const set = themeTokens(tokens, theme);
  const outline = heldOutline(config, set, theme);
  const alpha = config.yake.strength * tone.amount * config.yake.surfaces;
  const [r, g, b] = rgb(tone.yake);
  const blur = Math.round(config.yake.reach * 0.3);
  return {
    // Control outlines darken with the paper just enough to keep 3:1 on it.
    ...(outline !== resolve(set, 'border-strong') && { '--lv-border-strong': outline }),
    '--lv-wear-yake': urls.yake,
    '--lv-wear-sure': urls.sure,
    '--lv-wear-rim':
      alpha > 0
        ? `inset 0 0 ${blur}px ${Math.round(blur / 6)}px rgb(${r} ${g} ${b} / ${alpha.toFixed(3)})`
        : 'none',
  };
}

/**
 * Which face each text kind is set in under baked wear: the worn faces from npm run wear:font for
 * the kinds whose edges wear, the plain ones otherwise. The tuning page swaps --lv-wear-sans and
 * --lv-wear-mono for faces baked on the spot from unsaved values.
 */
export function faceVars(config) {
  const vars = {};
  for (const [kind, { font }] of Object.entries(TEXT_KINDS)) {
    const worn = config.kinds[kind].distort;
    vars[`--lv-wear-${kind}-face`] = worn ? `var(--lv-wear-${font})` : `var(--lv-font-${font})`;
    vars[`--lv-wear-${kind}-mono`] = worn ? 'var(--lv-wear-mono)' : 'var(--lv-font-mono)';
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
