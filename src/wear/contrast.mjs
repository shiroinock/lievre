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
