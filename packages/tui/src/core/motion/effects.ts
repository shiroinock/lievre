// Effects are pure functions of a picture and a time: (grid, t) → grid. They never keep state,
// so any frame can be drawn again (tests, skipping to the end, a paused loop).
//
// Entrances take t from 0 (nothing yet) to 1 (the picture as given); pass it through the easing
// curve first (see progress() in timeline.ts). At t = 1 every entrance returns the picture
// unchanged, so the last frame is always the plain picture.
// Loops take a phase from 0 to 1 and come back to where they started.
import { mapCells, type Grid, type MotionRole } from './grid.js';

const BLANK = ' ';
const clamp = (t: number) => Math.min(1, Math.max(0, t));

/** 長さの決まった入り方。t は 0（まだ何もない）〜 1（渡した絵のまま）。 */
export type Entrance = (grid: Grid, t: number) => Grid;
/** 動き続ける効果。phase は 0〜1 で、1 は 0 と同じ姿に戻る。 */
export type Loop = (grid: Grid, phase: number) => Grid;

/** 上の行から順に出す。 */
export const reveal: Entrance = (grid, t) => {
  const shown = Math.ceil(clamp(t) * grid.height);
  return mapCells(grid, (cell, _x, y) => (y < shown ? cell : { ...cell, char: BLANK }));
};

/** 左から右へ掃くように出す。先頭の1列は強調色で描く。 */
export const sweep: Entrance = (grid, t) => {
  const p = clamp(t);
  if (p >= 1) return grid;
  const edge = Math.floor(p * (grid.width + 1));
  return mapCells(grid, (cell, x) => {
    if (x >= edge) return { ...cell, char: BLANK };
    return x === edge - 1 ? { ...cell, role: 'accent' } : cell;
  });
};

// A fixed integer hash per cell, so the order looks scattered but every run draws the same frames.
function rank(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** ばらばらの順に浮かび上がらせる。seed を変えると順が変わる。 */
export function dissolve(seed = 0): Entrance {
  return (grid, t) => {
    const p = clamp(t);
    if (p >= 1) return grid;
    return mapCells(grid, (cell, x, y) => (rank(x, y, seed) < p ? cell : { ...cell, char: BLANK }));
  };
}

/** 読む順（左上から行ごと）に1字ずつ出す。空白は数えない。 */
export const typewriter: Entrance = (grid, t) => {
  const p = clamp(t);
  if (p >= 1) return grid;
  const total = grid.rows.flat().filter((c) => c.char !== BLANK && c.char !== '').length;
  const shown = Math.round(p * total);
  let seen = 0;
  return mapCells(grid, (cell) => {
    if (cell.char === BLANK) return cell;
    seen += 1;
    return seen <= shown ? cell : { ...cell, char: BLANK };
  });
};

/**
 * 光の帯が左から右へ流れる。字は変えず、帯の中の役割だけを替える。
 * 色のない端末では、帯は太字になる（描く側が決める）。
 */
export function shimmer({
  band = 3,
  role = 'accent',
}: { band?: number; role?: MotionRole } = {}): Loop {
  return (grid, phase) => {
    const p = ((phase % 1) + 1) % 1;
    // The band starts and ends fully outside the picture, so phase 0 is the plain picture.
    const center = -band + p * (grid.width + 2 * band);
    return mapCells(grid, (cell, x) =>
      Math.abs(x + 0.5 - center) < band / 2 ? { ...cell, role } : cell,
    );
  };
}

/** 名前で選べる入り方。 */
export const ENTRANCES = {
  reveal,
  sweep,
  dissolve: dissolve(),
  typewriter,
} satisfies Record<string, Entrance>;
export type EntranceName = keyof typeof ENTRANCES;
