// Writes the sample screen for every level, theme and glyph set to out/*.ans (ANSI, view with
// `cat` in a terminal) and the palette's contrast to out/contrast.md.
//   npx tsx scripts/capture.tsx
import chalk from 'chalk';
import { renderToString } from 'ink';
import { mkdirSync, writeFileSync } from 'node:fs';
import { glyphs, type GlyphSet } from '../src/core/glyphs.js';
import {
  PAIRS,
  contrast,
  palette,
  resolved,
  type Level,
  type ThemeName,
} from '../src/core/palette.js';
import { Screen } from '../src/ink/screen.js';

const out = new URL('../out/', import.meta.url);
mkdirSync(out, { recursive: true });
chalk.level = 3;

const LEVEL_NAMES: Record<Level, string> = {
  truecolor: 'truecolor',
  '256': '256色',
  '16': '16色',
  none: '色なし',
};
const THEME_NAMES: Record<ThemeName, string> = { paper: 'Paper', ink: 'Ink' };
const GLYPH_NAMES: Record<GlyphSet, string> = {
  unicode: '標準の文字',
  'lievre-term': 'Lievre Term',
  ascii: 'ASCII',
};

const shots: [Level, ThemeName, GlyphSet][] = [
  ['truecolor', 'paper', 'unicode'],
  ['truecolor', 'ink', 'unicode'],
  ['256', 'paper', 'unicode'],
  ['256', 'ink', 'unicode'],
  ['16', 'paper', 'unicode'],
  ['16', 'ink', 'unicode'],
  ['none', 'paper', 'unicode'],
  ['truecolor', 'paper', 'lievre-term'],
  ['truecolor', 'ink', 'lievre-term'],
  ['16', 'paper', 'ascii'],
];

for (const [level, theme, set] of shots) {
  // 16 colors and none paint nothing, so the theme only names the terminal they are shown on.
  const caption = `${LEVEL_NAMES[level]}・${THEME_NAMES[theme]}・${GLYPH_NAMES[set]}`;
  const text = renderToString(
    <Screen
      p={palette(level, theme)}
      g={glyphs({ LIEVRE_GLYPHS: set })}
      focus="save"
      row={1}
      caption={caption}
    />,
    { columns: 60 },
  );
  // Selected row and focus on the table too, in a second frame.
  const table = renderToString(
    <Screen p={palette(level, theme)} g={glyphs({ LIEVRE_GLYPHS: set })} focus="table" row={2} />,
    { columns: 60 },
  );
  writeFileSync(new URL(`${level}-${theme}-${set}.ans`, out), `${text}\n\n${table}\n`);
}

// Contrast: truecolor uses the web values, 256 colors the quantized ones.
const lines = [
  '# 端末の色のコントラスト',
  '',
  '`npx tsx scripts/capture.tsx` が書き出します。基準は文字が 4.5、操作の部品と輪郭が 3 です。',
  '',
];
let failed = 0;
for (const theme of ['paper', 'ink'] as ThemeName[]) {
  lines.push(
    `## ${THEME_NAMES[theme]}`,
    '',
    '| 前景 | 背景 | 基準 | truecolor | 256色 | 256色の値 |',
    '| --- | --- | ---: | ---: | ---: | --- |',
  );
  const t = palette('truecolor', theme);
  const q = palette('256', theme);
  for (const [fg, bg, min] of PAIRS) {
    const a = contrast(resolved(t, fg)!, resolved(t, bg)!);
    const b = contrast(resolved(q, fg)!, resolved(q, bg)!);
    if (a < min || b < min) failed++;
    const mark = (v: number) => `${v.toFixed(2)}${v < min ? ' ✕' : ''}`;
    lines.push(
      `| ${fg} | ${bg} | ${min} | ${mark(a)} | ${mark(b)} | ${q[fg]} ${resolved(q, fg)} / ${q[bg]} ${resolved(q, bg)} |`,
    );
  }
  lines.push('');
}
writeFileSync(new URL('contrast.md', out), lines.join('\n'));
console.log(failed ? `${failed} pairs below the minimum` : 'all pairs pass');
process.exitCode = failed ? 1 : 0;
