// Limits shared by the baked textures, the live filters and the contrast tests.
// Raising any of these must keep src/test/contrast.test.tsx passing.

/** Darkest point of grain and stains on a surface, as the opacity of the text colour. */
export const SURFACE_MAX = 0.1;
/** Faintest point of a worn glyph, as the opacity left by the dry-brush mask. */
export const KASURE_FLOOR = 0.72;
/** Size of one texture tile in CSS pixels. */
export const TILE = 256;
/** Kinds of part that get their own seed, and how many variants each repeats through. */
export const KINDS = ['root', 'card', 'heading', 'text', 'figure'];
export const VARIANTS = 4;
/** Elements that take the dry-brush mask (baked) or the displacement filter (live). */
export const TEXT_KINDS = {
  heading: ['.k-heading', '.k-card-title'],
  text: ['.k-text:not(.k-muted)', '.k-label'],
  figure: ['.k-metric-value', '.k-meter-reading strong'],
};
/** Displacement in px for each text kind in live mode. */
export const DISPLACEMENT = { heading: 2.4, text: 0.9, figure: 1.8 };
