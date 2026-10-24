// Wear presets, and the parts each text kind covers. wear.config.json holds the chosen values;
// the tuning page (npm run wear:tune) starts from one of these and saves its own.

/** Size of the yake frame image, and the slice each edge takes of it, in image pixels. */
export const SHEET = 512;
export const SHEET_SLICE = 160;
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
 * yake: the sheet browning in from its edges. strength is the opacity of the theme's tone at the
 *       darkest corner, reach how far in it gets (px), mottle how unevenly it gets there (0–1),
 *       corner how much more the corners take (0–1), surfaces how strongly cards and metrics
 *       brown along their own edges, as a share of strength (0 for none).
 * sure: scuffs where the colour has rubbed off, near the edges and along one fold. density is how
 *       many there are (0–1), strength their opacity at the most rubbed point, fold how strongly
 *       the fold takes them (0–1).
 * tones: per theme, the colour the sheet browns toward (yake), how much of strength it takes
 *        (amount), and the colour a scuff shows (sure). Paper and Sepia yellow toward a tone of
 *        nearly their own lightness, so the hue turns while text keeps its contrast; Ink and Rust
 *        only dull toward a warmer, greyer dark, at 0.6 of the strength.
 */
const TONES = {
  paper: { yake: '#f2dca6', amount: 1, sure: '#ffffff' },
  ink: { yake: '#2a2f4a', amount: 0.6, sure: '#262b5c' },
  sepia: { yake: '#e9c886', amount: 1, sure: '#fbf7ec' },
  rust: { yake: '#3e2f28', amount: 0.6, sure: '#382722' },
};

export const PRESETS = {
  subtle: {
    salt: 'kei',
    outline: { rough: 4, roughScale: 24, swell: 2, swellScale: 240, step: 14 },
    kasure: { density: 4, threshold: 0.7, floor: 0.86 },
    stain: { strength: 0.05 },
    yake: { strength: 0.2, reach: 120, mottle: 0.4, corner: 0.3, surfaces: 0 },
    sure: { density: 0.35, strength: 0.25, fold: 0.4 },
    kinds: {
      small: { distort: false, kasure: 0 },
      text: { distort: false, kasure: 0.5 },
      heading: { distort: true, kasure: 1 },
      figure: { distort: true, kasure: 1 },
      data: { distort: false, kasure: 0 },
    },
    tones: TONES,
  },
  standard: {
    salt: 'kei',
    outline: { rough: 7, roughScale: 26, swell: 4, swellScale: 220, step: 12 },
    kasure: { density: 6, threshold: 0.64, floor: 0.8 },
    stain: { strength: 0.08 },
    yake: { strength: 0.35, reach: 160, mottle: 0.5, corner: 0.4, surfaces: 0.3 },
    sure: { density: 0.5, strength: 0.35, fold: 0.6 },
    kinds: {
      small: { distort: false, kasure: 0.3 },
      text: { distort: true, kasure: 0.7 },
      heading: { distort: true, kasure: 1 },
      figure: { distort: true, kasure: 1 },
      data: { distort: false, kasure: 0 },
    },
    tones: TONES,
  },
  strong: {
    salt: 'kei',
    outline: { rough: 11, roughScale: 28, swell: 6, swellScale: 180, step: 10 },
    kasure: { density: 8, threshold: 0.56, floor: 0.72 },
    stain: { strength: 0.09 },
    yake: { strength: 0.4, reach: 220, mottle: 0.6, corner: 0.5, surfaces: 0.5 },
    sure: { density: 0.7, strength: 0.5, fold: 0.8 },
    kinds: {
      small: { distort: false, kasure: 0.5 },
      text: { distort: true, kasure: 1 },
      heading: { distort: true, kasure: 1 },
      figure: { distort: true, kasure: 1 },
      data: { distort: true, kasure: 0.5 },
    },
    tones: TONES,
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
    yake: { ...base.yake, ...config.yake },
    sure: { ...base.sure, ...config.sure },
    tones: Object.fromEntries(
      Object.keys(base.tones).map((theme) => [
        theme,
        { ...base.tones[theme], ...config.tones?.[theme] },
      ]),
    ),
    kinds,
  };
}
