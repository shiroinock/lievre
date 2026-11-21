// One picture on the cell grid: a character and a role name per cell. Colors (hex) are not kept
// here; the drawing layer turns roles into colors for the terminal's level (see palette.ts), and
// with 16 colors or none the picture is drawn in the terminal's own black and white.
import stringWidth from 'string-width';

/** 絵のセルが持てる役割。どれも `PAIRS` で面（surface）との組を検査している。 */
export const MOTION_ROLES = [
  'text',
  'muted',
  'accent',
  'border',
  'success',
  'warning',
  'danger',
] as const;
export type MotionRole = (typeof MOTION_ROLES)[number];

/** 1つのセル。全角の字は2つのセルを使い、右のセルの char は空文字にする。 */
export type Cell = { char: string; role: MotionRole };

/** 一画面ぶんの絵。行ごとにセルを並べる。どの行も width のセルを持つ。 */
export type Grid = { width: number; height: number; rows: Cell[][] };

const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });

/** East Asian Width が A（曖昧）の字か。日本語の端末では2セルになり、格子が崩れる。 */
export const isAmbiguous = (char: string) =>
  stringWidth(char, { ambiguousIsNarrow: false }) !== stringWidth(char);

/**
 * 文字の行から絵を作る。短い行は空白で埋める。
 * 幅が曖昧な字（`░▒▓█▌` `…` `→` など）は、格子が崩れるので既定では受け付けない。
 * 1行だけで右に何も揃えないとき（読み込み中の言葉など）は `ambiguous: 'allow'` にする。
 */
export function makeGrid(
  lines: string | readonly string[],
  role: MotionRole = 'text',
  { ambiguous = 'reject' }: { ambiguous?: 'reject' | 'allow' } = {},
): Grid {
  const source = typeof lines === 'string' ? lines.split('\n') : lines;
  const rows = source.map((line) => {
    const row: Cell[] = [];
    for (const { segment } of segmenter.segment(line)) {
      if (ambiguous === 'reject' && isAmbiguous(segment))
        throw new Error(
          `幅が曖昧な字「${segment}」は端末によって2セルになり、絵が崩れます。ASCII か点字（U+2800〜）の字に替えてください。`,
        );
      const w = stringWidth(segment);
      if (w === 0) continue;
      row.push({ char: segment, role });
      for (let i = 1; i < w; i++) row.push({ char: '', role });
    }
    return row;
  });
  const width = Math.max(0, ...rows.map((r) => r.length));
  for (const row of rows) while (row.length < width) row.push({ char: ' ', role });
  return { width, height: rows.length, rows };
}

/** 空白だけの絵。 */
export function blankGrid(width: number, height: number, role: MotionRole = 'text'): Grid {
  return {
    width,
    height,
    rows: Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({ char: ' ', role })),
    ),
  };
}

/**
 * セルを1つずつ変える。全角の字は左のセルだけで fn を呼び、右のセルは左に従う
 * （左を空白にすれば右も空白に、役割を変えれば右も同じ役割に）。
 */
export function mapCells(grid: Grid, fn: (cell: Cell, x: number, y: number) => Cell): Grid {
  const rows = grid.rows.map((row, y) => {
    const out: Cell[] = [];
    row.forEach((cell, x) => {
      if (cell.char === '' && x > 0) {
        const lead = out[x - 1];
        out.push({ char: lead.char === ' ' ? ' ' : '', role: lead.role });
        return;
      }
      const next = fn(cell, x, y);
      // A wide character must keep its own width; anything else would push the row.
      const wide = row[x + 1]?.char === '';
      out.push(wide && next.char !== ' ' && stringWidth(next.char) !== 2 ? cell : next);
    });
    return out;
  });
  return { ...grid, rows };
}

/** 行ごとの文字列。 */
export const toLines = (grid: Grid) => grid.rows.map((row) => row.map((c) => c.char).join(''));

/** 1行を、同じ役割の続く区間にまとめる。色の指定を重ねて書かないため。 */
export function runs(row: readonly Cell[]): { text: string; role: MotionRole }[] {
  const out: { text: string; role: MotionRole }[] = [];
  for (const cell of row) {
    const last = out[out.length - 1];
    if (last && last.role === cell.role) last.text += cell.char;
    else out.push({ text: cell.char, role: cell.role });
  }
  return out;
}
