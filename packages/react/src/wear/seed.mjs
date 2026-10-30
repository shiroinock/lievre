// Seeded randomness shared by the wear generators (Node) and the live filters (browser).
// Everything here is a pure function of its inputs: the same salt always gives the same wear.
// scripts/wear/font.py mirrors hash32 and noise2 exactly; keep the two in step.

/** FNV-1a over the UTF-8 bytes of a string. */
export function hashString(text) {
  let h = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(text)) {
    h ^= byte;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Seed for one kind of part at one place: hash(salt + kind + id). */
export function seedFor(salt, kind, id = '') {
  return hashString(`${salt}:${kind}:${id}`);
}

/** mulberry32: a stream of numbers in [0, 1) that repeats exactly for the same seed. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer hash of a lattice point, in [0, 1). */
export function hash32(seed, x, y) {
  let h = (seed ^ Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1). Wraps every `period` cells (or [px, py]) so textures tile. */
export function noise2(seed, x, y, period = 0) {
  const [px, py] = Array.isArray(period) ? period : [period, period];
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const wrap = (v, p) => (p ? ((v % p) + p) % p : v);
  const at = (i, j) => hash32(seed, wrap(x0 + i, px), wrap(y0 + j, py));
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const top = at(0, 0) + (at(1, 0) - at(0, 0)) * sx;
  const bottom = at(0, 1) + (at(1, 1) - at(0, 1)) * sx;
  return top + (bottom - top) * sy;
}
