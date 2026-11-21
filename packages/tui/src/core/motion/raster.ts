// Pictures from a brightness function. Three ways to pick each cell's character:
//
// shade   — by brightness: the cell's center picks a step on the ramp (the idea behind donut.c).
// shapes  — by shape: six points in the cell are compared with each character's six points, and
//           the nearest one wins, so edges stay sharp (the idea in Alex Harri's "ASCII characters
//           are not pixels"). The table below is lievre's own rough reading of each character.
// braille — 2 × 4 dots per cell, for fine lines (Unicode sets only; ASCII falls back to shade).
//
// A cell is about twice as tall as it is wide, so a round shape needs twice as many columns as
// rows. The sampler receives u and v from 0 to 1 across the whole picture.
import type { GlyphSet } from '../glyphs.js';
import { blankGrid, type Grid, type MotionRole } from './grid.js';
import { RAMPS, rampChar } from './ramps.js';

/** 絵の中の位置（u・v は 0〜1）の明るさ（0〜1）を返す関数。 */
export type Sampler = (u: number, v: number) => number;

type RasterOptions = { set?: GlyphSet; role?: MotionRole };

function fill(
  width: number,
  height: number,
  role: MotionRole,
  pick: (x: number, y: number) => string,
): Grid {
  const grid = blankGrid(width, height, role);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) grid.rows[y][x] = { char: pick(x, y), role };
  return grid;
}

/** 明るさで字を選ぶ。 */
export function shade(
  sample: Sampler,
  width: number,
  height: number,
  { set = 'unicode', role = 'text' }: RasterOptions = {},
): Grid {
  const ramp = RAMPS[set];
  return fill(width, height, role, (x, y) =>
    rampChar(ramp, sample((x + 0.5) / width, (y + 0.5) / height)),
  );
}

// Each character's coverage at six points: [top-left, top-right, middle-left, middle-right,
// bottom-left, bottom-right]. ASCII only, so every glyph set can use it.
export const SHAPES: readonly [char: string, points: readonly number[]][] = [
  [' ', [0, 0, 0, 0, 0, 0]],
  ['.', [0, 0, 0, 0, 0.3, 0.3]],
  ["'", [0.3, 0.3, 0, 0, 0, 0]],
  ['-', [0, 0, 0.5, 0.5, 0, 0]],
  ['_', [0, 0, 0, 0, 0.6, 0.6]],
  ['"', [0.5, 0.5, 0, 0, 0, 0]],
  ['=', [0.1, 0.1, 0.6, 0.6, 0.1, 0.1]],
  ['|', [0.4, 0.4, 0.4, 0.4, 0.4, 0.4]],
  ['/', [0, 0.7, 0.4, 0.4, 0.7, 0]],
  ['\\', [0.7, 0, 0.4, 0.4, 0, 0.7]],
  ['(', [0.2, 0.5, 0.6, 0, 0.2, 0.5]],
  [')', [0.5, 0.2, 0, 0.6, 0.5, 0.2]],
  ['<', [0, 0.5, 0.6, 0, 0, 0.5]],
  ['>', [0.5, 0, 0, 0.6, 0.5, 0]],
  ['L', [0.7, 0, 0.7, 0, 0.7, 0.7]],
  ['J', [0, 0.7, 0, 0.7, 0.7, 0.7]],
  ['T', [0.7, 0.7, 0.4, 0.4, 0.4, 0.4]],
  ['v', [0, 0, 0.5, 0.5, 0.3, 0.3]],
  ['^', [0.4, 0.4, 0.3, 0.3, 0, 0]],
  ['o', [0, 0, 0.6, 0.6, 0.6, 0.6]],
  ['P', [0.8, 0.8, 0.8, 0.5, 0.7, 0]],
  ['b', [0.7, 0, 0.8, 0.6, 0.8, 0.6]],
  ['d', [0, 0.7, 0.6, 0.8, 0.6, 0.8]],
  ['#', [0.7, 0.7, 0.8, 0.8, 0.7, 0.7]],
  ['@', [0.9, 0.9, 0.9, 0.9, 0.9, 0.9]],
];

const POINTS = [
  [0.25, 1 / 6],
  [0.75, 1 / 6],
  [0.25, 0.5],
  [0.75, 0.5],
  [0.25, 5 / 6],
  [0.75, 5 / 6],
] as const;

/** 6点の明るさにいちばん近い形の字。 */
export function shapeChar(points: readonly number[]): string {
  let best = SHAPES[0][0];
  let bestDistance = Infinity;
  for (const [char, ref] of SHAPES) {
    const d = ref.reduce((sum, r, i) => sum + (r - (points[i] ?? 0)) ** 2, 0);
    if (d < bestDistance) [best, bestDistance] = [char, d];
  }
  return best;
}

/** 形で字を選ぶ。輪郭がはっきりする。 */
export function shapes(
  sample: Sampler,
  width: number,
  height: number,
  { role = 'text' }: { role?: MotionRole } = {},
): Grid {
  return fill(width, height, role, (x, y) =>
    shapeChar(POINTS.map(([px, py]) => sample((x + px) / width, (y + py) / height))),
  );
}

// Dot bits of a braille cell by [column][row].
const DOTS = [
  [0x01, 0x02, 0x04, 0x40],
  [0x08, 0x10, 0x20, 0x80],
];

/** 点字で細かく描く。threshold より明るい点を打つ。ASCII の組では shade に替える。 */
export function braille(
  sample: Sampler,
  width: number,
  height: number,
  { set = 'unicode', role = 'text', threshold = 0.5 }: RasterOptions & { threshold?: number } = {},
): Grid {
  if (set === 'ascii') return shade(sample, width, height, { set, role });
  return fill(width, height, role, (x, y) => {
    let bits = 0;
    for (let c = 0; c < 2; c++)
      for (let r = 0; r < 4; r++)
        if (sample((x + (c + 0.5) / 2) / width, (y + (r + 0.5) / 4) / height) > threshold)
          bits |= DOTS[c][r];
    return bits === 0 ? ' ' : String.fromCodePoint(0x2800 + bits);
  });
}
