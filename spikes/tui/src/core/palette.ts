// Turns KEI's tokens (tokens/tokens.json, generated from src/styles/kei.css) into terminal colors.
//
// truecolor: the same hex values as the web.
// 256 colors: the nearest xterm color whose contrast still passes (indices 16–255 only, since
//   0–15 follow the user's terminal theme and their values are unknown).
// 16 colors: the user's theme decides the values, so KEI paints no surfaces. Text stays in the
//   terminal's own foreground, emphasis uses reverse video, and only symbols take a color.
// none: NO_COLOR, TERM=dumb or not a terminal. Attributes (bold, underline, reverse) stay.
import { readFileSync } from 'node:fs';

export type Level = 'truecolor' | '256' | '16' | 'none';
export type ThemeName = 'paper' | 'ink';

// After the move to workspaces this becomes `import tokens from '@lievre/tokens/tokens.json'`.
const tokens = JSON.parse(
  readFileSync(new URL('../../../../tokens/tokens.json', import.meta.url), 'utf8'),
) as Record<ThemeName, Record<string, { $value: string }>>;

/** Token value for a theme; Ink only overrides colors, so the rest comes from Paper. */
export function hex(theme: ThemeName, name: string): string {
  const value = tokens[theme][name]?.$value ?? tokens.paper[name]?.$value;
  if (!value) throw new Error(`no token ${name}`);
  const alias = /^var\(--k-(.+)\)$/.exec(value);
  return alias ? hex(theme, alias[1]) : value;
}

// ---------------------------------------------------------------- contrast (WCAG 2.x)

export function rgb(color: string): [number, number, number] {
  const n = parseInt(color.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(color: string): number {
  const [r, g, b] = rgb(color).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// ---------------------------------------------------------------- xterm 256 colors

const LEVELS = [0, 95, 135, 175, 215, 255];
const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

/** Index and value of every color above 15: the 6×6×6 cube and the 24 grays. */
export const XTERM: { index: number; hex: string }[] = [];
for (let i = 16; i < 232; i++) {
  const n = i - 16;
  XTERM.push({
    index: i,
    hex: toHex(LEVELS[Math.floor(n / 36)], LEVELS[Math.floor(n / 6) % 6], LEVELS[n % 6]),
  });
}
for (let i = 232; i < 256; i++) {
  const v = 8 + (i - 232) * 10;
  XTERM.push({ index: i, hex: toHex(v, v, v) });
}

// OKLab distance, so "nearest" matches what the eye sees rather than raw RGB.
function oklab(color: string): [number, number, number] {
  const [r, g, b] = rgb(color).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
const distance = (a: string, b: string) => {
  const [x, y] = [oklab(a), oklab(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};

/** Nearest xterm color that keeps each `[against, min]` contrast. */
export function nearest256(color: string, constraints: [string, number][] = []) {
  const sorted = [...XTERM].sort((a, b) => distance(color, a.hex) - distance(color, b.hex));
  return (
    sorted.find((c) => constraints.every(([bg, min]) => contrast(c.hex, bg) >= min)) ?? sorted[0]
  );
}

// ---------------------------------------------------------------- level detection

/**
 * NO_COLOR (https://no-color.org) wins over everything except an explicit FORCE_COLOR level:
 * FORCE_COLOR=0 turns colors off, 1 / 2 / 3 pick 16 / 256 / truecolor, and an empty or
 * "true" value means "at least 16 even when piped".
 */
export function detectLevel(env = process.env, isTTY = Boolean(process.stdout.isTTY)): Level {
  const force = env.FORCE_COLOR;
  const forced: Record<string, Level> = {
    '0': 'none',
    false: 'none',
    '1': '16',
    '2': '256',
    '3': 'truecolor',
  };
  if (force !== undefined && force in forced) return forced[force];
  if (env.NO_COLOR) return 'none';
  if (force === undefined && (!isTTY || env.TERM === 'dumb')) return 'none';
  if (/^(truecolor|24bit)$/i.test(env.COLORTERM ?? '')) return 'truecolor';
  if (/256/.test(env.TERM ?? '')) return '256';
  return '16';
}

// ---------------------------------------------------------------- roles

/** Colors as Ink takes them: '#rrggbb', 'ansi256(n)', a chalk name, or undefined (terminal default). */
export type Color = string | undefined;

export type Palette = {
  level: Level;
  theme: ThemeName;
  /** Whether KEI paints its own surfaces (card, table, buttons). Only when values are known. */
  paints: boolean;
  bg: Color;
  surface: Color;
  sunken: Color;
  selected: Color;
  text: Color;
  muted: Color;
  border: Color;
  accent: Color;
  onAccent: Color;
  focus: Color;
  success: Color;
  warning: Color;
  danger: Color;
};

/** The pairs each palette must pass, with the WCAG minimum: text 4.5, UI parts 3. */
export const PAIRS: [fg: keyof Palette, bg: keyof Palette, min: number][] = [
  ['text', 'surface', 4.5],
  ['muted', 'surface', 4.5],
  ['text', 'sunken', 4.5],
  ['text', 'selected', 4.5],
  ['accent', 'surface', 4.5],
  ['onAccent', 'accent', 4.5],
  ['success', 'surface', 4.5],
  ['warning', 'surface', 4.5],
  ['danger', 'surface', 4.5],
  ['focus', 'surface', 3],
  ['focus', 'bg', 3],
  ['accent', 'selected', 3],
  ['border', 'surface', 3],
];

const TOKENS: Partial<Record<keyof Palette, string>> = {
  bg: 'bg',
  surface: 'surface',
  sunken: 'surface-sunken',
  selected: 'selected',
  text: 'text',
  muted: 'muted',
  // The card frame uses border-strong: a 1-cell line is the only edge where surfaces collapse.
  border: 'border-strong',
  accent: 'accent',
  onAccent: 'on-accent',
  focus: 'focus',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
};

/** Hex values per role, before they are turned into a level. */
export function source(theme: ThemeName): Record<string, string> {
  return Object.fromEntries(
    Object.entries(TOKENS).map(([role, token]) => [role, hex(theme, token!)]),
  );
}

/**
 * For 256 colors: surfaces by nearness, then accent (a surface for the primary button and a
 * color on the card), then every other role as the nearest color that passes all its pairs.
 */
export function quantize(theme: ThemeName): Record<string, { index: number; hex: string }> {
  const src = source(theme);
  const out: Record<string, { index: number; hex: string }> = {};
  const order = ['bg', 'surface', 'sunken', 'selected', 'accent', ...Object.keys(src)];
  for (const role of order) {
    if (out[role]) continue;
    const constraints = PAIRS.filter(([fg, bg]) => fg === role && out[bg]).map(
      ([, bg, min]) => [out[bg].hex, min] as [string, number],
    );
    out[role] = nearest256(src[role], constraints);
  }
  return out;
}

export function palette(level: Level, theme: ThemeName): Palette {
  if (level === 'truecolor' || level === '256') {
    const values =
      level === 'truecolor'
        ? source(theme)
        : Object.fromEntries(
            Object.entries(quantize(theme)).map(([k, v]) => [k, `ansi256(${v.index})`]),
          );
    return { level, theme, paints: true, ...values } as Palette;
  }
  // 16 colors: hues only for meaning, never for text that must be read on its own.
  const named = level === '16';
  return {
    level,
    theme,
    paints: false,
    bg: undefined,
    surface: undefined,
    sunken: undefined,
    selected: undefined,
    text: undefined,
    muted: undefined,
    border: undefined,
    accent: named ? 'blueBright' : undefined,
    onAccent: undefined,
    focus: named ? 'blueBright' : undefined,
    success: named ? 'green' : undefined,
    warning: named ? 'yellow' : undefined,
    danger: named ? 'red' : undefined,
  };
}

/** The value a 256-color role stands for, for the contrast report. */
export function resolved(p: Palette, role: keyof Palette): string | undefined {
  const value = p[role];
  if (typeof value !== 'string') return undefined;
  if (value.startsWith('#')) return value;
  const m = /ansi256\((\d+)\)/.exec(value);
  return m ? XTERM.find((c) => c.index === Number(m[1]))?.hex : undefined;
}
