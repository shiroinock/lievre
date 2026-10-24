// Wear presets, and the parts each text kind covers. wear.config.json holds the chosen values;
// the tuning page (npm run wear:tune) starts from one of these and saves its own.

/** Size of one texture tile in CSS pixels. */
export const TILE = 256;
/** How many variants each kind of part repeats through (:nth-of-type(4n + 1…4)). */
export const VARIANTS = 4;

/**
 * Text kinds: which elements wear together, the face they are set in, and the size the live
 * filter is calibrated for (px). Sizes come from the type scale in kei.css.
 */
export const TEXT_KINDS = {
  small: { selectors: ['.k-text--small:not(.k-muted)', '.k-label'], font: 'sans', size: 12.5 },
  text: {
    selectors: ['.k-text--body:not(.k-muted)', '.k-text--lead:not(.k-muted)', '.k-card-title'],
    font: 'sans',
    size: 15,
  },
  heading: { selectors: ['.k-heading'], font: 'sans', size: 28 },
  figure: { selectors: ['.k-metric-value', '.k-meter-reading strong'], font: 'mono', size: 32 },
  data: { selectors: ['.k-table td'], font: 'sans', size: 13.5 },
};

/**
 * outline: how the baked glyph edges wear, in 1/1000 em (scripts/wear/font.py). The skeleton
 *          stays put; rough and roughScale roughen the edge, swell and swellScale let the ink
 *          spread or thin from place to place, and step is the length each outline is cut into.
 * kasure: density (streaks across a tile), threshold (0–1, higher thins fewer pixels) and floor
 *         (the faintest opacity a glyph keeps).
 * stain: the darkest point of grain and stains, as the opacity of the text colour.
 * kinds: per text kind, whether the edges wear (distort) and how deep the dry brush goes (0–1).
 */
export const PRESETS = {
  subtle: {
    salt: 'kei',
    outline: { rough: 4, roughScale: 24, swell: 2, swellScale: 240, step: 14 },
    kasure: { density: 4, threshold: 0.7, floor: 0.86 },
    stain: { strength: 0.05 },
    kinds: {
      small: { distort: false, kasure: 0 },
      text: { distort: false, kasure: 0.5 },
      heading: { distort: true, kasure: 1 },
      figure: { distort: true, kasure: 1 },
      data: { distort: false, kasure: 0 },
    },
  },
  standard: {
    salt: 'kei',
    outline: { rough: 7, roughScale: 26, swell: 4, swellScale: 220, step: 12 },
    kasure: { density: 6, threshold: 0.64, floor: 0.8 },
    stain: { strength: 0.08 },
    kinds: {
      small: { distort: false, kasure: 0.3 },
      text: { distort: true, kasure: 0.7 },
      heading: { distort: true, kasure: 1 },
      figure: { distort: true, kasure: 1 },
      data: { distort: false, kasure: 0 },
    },
  },
  strong: {
    salt: 'kei',
    outline: { rough: 11, roughScale: 28, swell: 6, swellScale: 180, step: 10 },
    kasure: { density: 8, threshold: 0.56, floor: 0.72 },
    stain: { strength: 0.1 },
    kinds: {
      small: { distort: false, kasure: 0.5 },
      text: { distort: true, kasure: 1 },
      heading: { distort: true, kasure: 1 },
      figure: { distort: true, kasure: 1 },
      data: { distort: true, kasure: 0.5 },
    },
  },
};

/**
 * How far an edge may move, as shares of the weight's thinnest stroke (THIN): the rough edge, the
 * swell, and both together. scripts/wear/font.py applies the same caps.
 */
export const OUTLINE_CAPS = { edge: 0.2, swell: 0.12, total: 0.25 };
/** Thinnest stroke of Plex Sans JP and Plex Mono at Regular, 1/1000 em (一 二 三, the bar of H). */
export const THIN = { sans: 60, mono: 70 };

export const PRESET_NAMES = { subtle: '控えめ', standard: '標準', strong: '強め' };

/** Fills anything a saved config leaves out from the standard preset. */
export function normaliseConfig(config = {}) {
  const base = PRESETS.standard;
  const kinds = Object.fromEntries(
    Object.keys(TEXT_KINDS).map((kind) => [kind, { ...base.kinds[kind], ...config.kinds?.[kind] }]),
  );
  return {
    preset: config.preset ?? 'standard',
    salt: String(config.salt ?? base.salt),
    outline: { ...base.outline, ...config.outline },
    kasure: { ...base.kasure, ...config.kasure },
    stain: { ...base.stain, ...config.stain },
    kinds,
  };
}
