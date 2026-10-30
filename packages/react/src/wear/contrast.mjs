// WCAG contrast on token colours, shared by the contrast tests and the tuning page's gauges.

export function themeTokens(tokens, theme) {
  return { ...tokens.paper, ...(theme === 'paper' ? {} : tokens[theme]) };
}
export function resolve(set, key) {
  const value = set[key].$value;
  const alias = value.match(/^var\(--k-(.+)\)$/);
  return alias ? resolve(set, alias[1]) : value;
}
const channels = (hex) =>
  hex
    .slice(1)
    .match(/.{2}/g)
    .map((v) => parseInt(v, 16));
export function luminance(hex) {
  const c = channels(hex)
    .map((v) => v / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
}
/** a moved toward b by amount (0–1), as when b is laid over a at that opacity. */
export function mix(a, b, amount) {
  const [x, y] = [channels(a), channels(b)];
  return (
    '#' +
    x
      .map((v, i) => Math.round(v + (y[i] - v) * amount))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}
export function ratio(a, b) {
  const [lo, hi] = [luminance(a), luminance(b)].sort((a, b) => a - b);
  return (hi + 0.05) / (lo + 0.05);
}

/** Colours set as text, checked at 4.5:1, and the marks of controls, checked at 3:1. */
export const TEXT_COLOURS = [
  'text',
  'muted',
  'subtle',
  'success',
  'warning',
  'danger',
  'info',
  'accent',
];
export const UI_COLOURS = ['focus', 'border-strong'];

/**
 * The most worn backgrounds of a surface in a theme: stained at the darkest speckle, then browned
 * at the darkest corner of the yake, and that again with the most rubbed scuff on top. Text sits
 * on all three somewhere near an edge, so each must hold.
 */
export function wornBackgrounds(config, set, theme, background) {
  const tone = config.tones[theme];
  const stained = mix(resolve(set, background), resolve(set, 'text'), config.stain.strength);
  const browned = mix(stained, tone.yake, config.yake.strength * tone.amount);
  const rubbed = mix(browned, tone.sure, config.sure.strength);
  return [stained, browned, rubbed];
}

/**
 * Control outlines under wear: border-strong moved toward the text colour, by the least amount
 * that keeps 3:1 on every worn background (the ink darkens with the paper). Unworn, it is the
 * token itself.
 */
export function heldOutline(config, set, theme) {
  const worn = ['bg', 'surface'].flatMap((b) => wornBackgrounds(config, set, theme, b));
  const base = resolve(set, 'border-strong');
  for (let step = 0; step <= 50; step++) {
    const colour = mix(base, resolve(set, 'text'), step / 50);
    if (worn.every((w) => ratio(colour, w) >= 3)) return colour;
  }
  return resolve(set, 'text');
}
