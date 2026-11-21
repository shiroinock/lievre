import stringWidth from 'string-width';
import { describe, expect, it } from 'vitest';
import {
  ENTRANCES,
  FPS,
  LOOP_FRAMES,
  MIN_FRAMES,
  MOTION_EASE,
  MOTION_MS,
  MOTION_ROLES,
  PAIRS,
  RAMPS,
  SHAPES,
  braille,
  contrast,
  cubicBezier,
  dissolve,
  frameAt,
  frameCount,
  isAmbiguous,
  isDone,
  isRunning,
  makeGrid,
  motionAction,
  motionPolicy,
  palette,
  parseCubicBezier,
  parseDuration,
  progress,
  rampChar,
  resolved,
  runs,
  shade,
  shapeChar,
  shapes,
  shimmer,
  skipPlayback,
  startPlayback,
  toLines,
  togglePlayback,
  type Grid,
  type Level,
  type ThemeName,
} from '../src/index.js';

const ART = ['  lievre  ', ' ＜／＞ 端末 '];
const art = () => makeGrid(ART, 'text');
const circle = (u: number, v: number) => (Math.hypot(u - 0.5, v - 0.5) < 0.4 ? 1 : 0);
const chars = (g: Grid) => g.rows.flat().map((c) => c.char);

describe('timing from the tokens', () => {
  it('reads --lv-motion and --lv-ease from tokens.json', () => {
    expect(MOTION_MS).toBe(140);
    expect(MOTION_EASE).toEqual([0.2, 0, 0, 1]);
  });

  it('never drops below the minimum number of frames', () => {
    expect(frameCount()).toBe(MIN_FRAMES);
    expect(frameCount(1000)).toBe(FPS);
    expect(frameCount(0)).toBe(MIN_FRAMES);
  });

  it('parses durations and curves as CSS writes them', () => {
    expect(parseDuration('0.2s')).toBe(200);
    expect(() => parseDuration('fast')).toThrow(/140ms/);
    expect(() => parseCubicBezier('ease-in')).toThrow(/cubic-bezier/);
    expect(() => parseCubicBezier('cubic-bezier(2, 0, 0, 1)')).toThrow(/0〜1/);
  });

  it('follows the curve from 0 to 1 without going back', () => {
    const f = cubicBezier(MOTION_EASE);
    const values = Array.from({ length: 21 }, (_, i) => f(i / 20));
    expect(values[0]).toBe(0);
    expect(values[20]).toBe(1);
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
    // Linear stays linear.
    expect(cubicBezier([0, 0, 1, 1])(0.3)).toBeCloseTo(0.3, 3);
  });
});

describe('grid', () => {
  it('gives kana and kanji 2 cells and pads every row to one width', () => {
    const g = art();
    expect(g.width).toBe(Math.max(...ART.map((l) => stringWidth(l))));
    for (const line of toLines(g)) expect(stringWidth(line)).toBe(g.width);
  });

  it('rejects characters of ambiguous width, and says what to use instead', () => {
    expect(() => makeGrid('▓▓')).toThrow(/ASCII か点字/);
    expect(() => makeGrid('読み込み中…')).toThrow();
    expect(makeGrid('読み込み中…', 'text', { ambiguous: 'allow' }).height).toBe(1);
  });

  it('merges cells of the same role, so colors are not written again and again', () => {
    const row = shimmer({ band: 2 })(makeGrid('abcdef'), 0.5).rows[0];
    expect(runs(row).map((r) => r.role)).toEqual(['text', 'accent', 'text']);
    expect(
      runs(row)
        .map((r) => r.text)
        .join(''),
    ).toBe('abcdef');
  });
});

describe('entrances', () => {
  for (const [name, effect] of Object.entries(ENTRANCES)) {
    it(`${name}: starts empty and ends as the picture`, () => {
      const g = art();
      expect(chars(effect(g, 0)).every((c) => c === ' ' || c === '')).toBe(true);
      expect(effect(g, 1)).toEqual(g);
    });

    it(`${name}: keeps every frame on the cell grid`, () => {
      const g = art();
      for (let i = 0; i <= 20; i++)
        for (const line of toLines(effect(g, i / 20))) expect(stringWidth(line)).toBe(g.width);
    });

    it(`${name}: shows more as time goes on`, () => {
      const g = art();
      const shown = (t: number) => chars(effect(g, t)).filter((c) => c.trim() !== '').length;
      for (let i = 1; i <= 20; i++)
        expect(shown(i / 20)).toBeGreaterThanOrEqual(shown((i - 1) / 20));
    });
  }

  it('dissolve gives the same frames on every run, and another order for another seed', () => {
    const g = makeGrid(['abcdefghij', 'klmnopqrst']);
    expect(dissolve(1)(g, 0.5)).toEqual(dissolve(1)(g, 0.5));
    expect(dissolve(1)(g, 0.5)).not.toEqual(dissolve(2)(g, 0.5));
  });

  it('sweep draws its leading column in the accent role', () => {
    const roles = ENTRANCES.sweep(makeGrid('abcdef'), 0.5).rows[0].map((c) => c.role);
    expect(roles.filter((r) => r === 'accent')).toHaveLength(1);
  });
});

describe('shimmer', () => {
  it('changes roles only, never characters, and comes back to the plain picture', () => {
    const g = art();
    const loop = shimmer();
    for (let i = 0; i < 20; i++) expect(toLines(loop(g, i / 20))).toEqual(toLines(g));
    expect(loop(g, 0)).toEqual(g);
    expect(loop(g, 1)).toEqual(g);
  });
});

describe('glyphs in ramps and rasters', () => {
  // A character of ambiguous width is 2 cells in a terminal that draws those wide.
  const used = [...Object.values(RAMPS).flat(), ...SHAPES.map(([c]) => c)];
  it('uses no character whose width depends on the terminal', () => {
    expect(used.filter(isAmbiguous)).toEqual([]);
    for (const c of used) expect(stringWidth(c, { ambiguousIsNarrow: false }), c).toBe(1);
  });

  it('keeps the ASCII set to printable ASCII', () => {
    expect(RAMPS.ascii.every((c) => /^[\x20-\x7e]$/.test(c))).toBe(true);
    expect(SHAPES.every(([c]) => /^[\x20-\x7e]$/.test(c))).toBe(true);
  });

  it('orders each ramp from empty to full', () => {
    for (const ramp of Object.values(RAMPS)) {
      expect(rampChar(ramp, 0)).toBe(' ');
      expect(rampChar(ramp, 1)).toBe(ramp[ramp.length - 1]);
      expect(rampChar(ramp, Number.NaN)).toBe(' ');
    }
  });

  for (const set of ['unicode', 'ascii'] as const)
    it(`${set}: every raster stays on the grid`, () => {
      for (const g of [
        shade(circle, 20, 8, { set }),
        braille(circle, 20, 8, { set }),
        shapes(circle, 20, 8),
      ]) {
        expect(g.width).toBe(20);
        for (const line of toLines(g)) {
          expect(stringWidth(line, { ambiguousIsNarrow: false })).toBe(20);
          if (set === 'ascii') expect(line).toMatch(/^[\x20-\x7e]*$/);
        }
      }
    });

  it('picks characters by shape: edges, not only darkness', () => {
    expect(shapeChar([0, 0, 0, 0, 0, 0])).toBe(' ');
    expect(shapeChar([0, 0, 0, 0, 1, 1])).toBe('_');
    expect(shapeChar([0, 1, 0.5, 0.5, 1, 0])).toBe('/');
    expect(shapeChar([1, 1, 1, 1, 1, 1])).toBe('@');
  });

  it('draws a filled circle in braille with full cells in the middle', () => {
    const lines = toLines(braille(circle, 20, 8));
    expect(lines[4][10]).toBe('⣿');
    expect(lines[0][0]).toBe(' ');
  });
});

// The same pairs and minimums as the rest of the terminal parts (tui.test.tsx).
describe('roles a picture can use', () => {
  const themes: ThemeName[] = ['paper', 'ink'];
  for (const theme of themes)
    for (const level of ['truecolor', '256'] as Level[])
      it(`${level} ${theme}: every role reaches its minimum on the surface`, () => {
        const p = palette(level, theme);
        for (const role of MOTION_ROLES) {
          const pair = PAIRS.find(([fg, bg]) => fg === role && bg === 'surface');
          expect(pair, `${role} has no pair on surface`).toBeDefined();
          expect(
            contrast(resolved(p, role)!, resolved(p, 'surface')!),
            role,
          ).toBeGreaterThanOrEqual(pair![2]);
        }
      });
});

describe('policy', () => {
  const tty = { isTTY: true };
  it('moves in a terminal by default', () => {
    expect(motionPolicy({}, tty)).toBe('full');
  });

  it('gives words only to screen readers, pipes, TERM=dumb and CI, even when asked to move', () => {
    expect(motionPolicy({ INK_SCREEN_READER: 'true', LIEVRE_MOTION: 'full' }, tty)).toBe('off');
    expect(motionPolicy({}, { isTTY: true, screenReader: true })).toBe('off');
    expect(motionPolicy({}, { isTTY: false })).toBe('off');
    expect(motionPolicy({ TERM: 'dumb' }, tty)).toBe('off');
    expect(motionPolicy({ CI: 'true' }, tty)).toBe('off');
    expect(motionPolicy({ CI: '1' }, tty)).toBe('off');
    expect(motionPolicy({ CI: 'false' }, tty)).toBe('full');
  });

  it('follows LIEVRE_MOTION', () => {
    expect(motionPolicy({ LIEVRE_MOTION: 'reduced' }, tty)).toBe('reduced');
    expect(motionPolicy({ LIEVRE_MOTION: 'off' }, tty)).toBe('off');
  });
});

describe('timeline', () => {
  const entrance = { frames: 10, loop: false };
  const loop = { frames: LOOP_FRAMES, loop: true };

  it('stops an entrance on its last frame and stops the clock there', () => {
    const p = startPlayback(entrance, 'full');
    expect(frameAt(entrance, p, 3)).toBe(3);
    expect(frameAt(entrance, p, 99)).toBe(9);
    expect(isDone(entrance, p, 9)).toBe(true);
    expect(isRunning(entrance, p, 9)).toBe(false);
  });

  it('skips to the last frame with Enter, Esc or Space', () => {
    expect(motionAction(entrance, '', { return: true })).toBe('skip');
    expect(motionAction(entrance, '', { escape: true })).toBe('skip');
    expect(motionAction(entrance, ' ')).toBe('skip');
    expect(motionAction(entrance, 'x')).toBeUndefined();
    const p = skipPlayback(entrance, startPlayback(entrance, 'full'));
    expect(frameAt(entrance, p, 0)).toBe(9);
  });

  it('pauses and resumes a loop with P or Space, from the frame where it stopped', () => {
    expect(motionAction(loop, 'p')).toBe('toggle');
    expect(motionAction(loop, ' ')).toBe('toggle');
    expect(motionAction(loop, '', { return: true })).toBeUndefined();
    let p = startPlayback(loop, 'full');
    p = togglePlayback(loop, p, 7);
    expect(p.paused).toBe(true);
    expect(frameAt(loop, p, 30)).toBe(7);
    expect(isRunning(loop, p, 0)).toBe(false);
    p = togglePlayback(loop, p, 0);
    // The clock counts again from 0 after resuming.
    expect(frameAt(loop, p, 2)).toBe(9);
    expect(frameAt(loop, p, LOOP_FRAMES)).toBe(7);
  });

  it('starts still when motion is reduced: entrances at the end, loops paused', () => {
    expect(frameAt(entrance, startPlayback(entrance, 'reduced'), 0)).toBe(9);
    expect(startPlayback(loop, 'reduced').paused).toBe(true);
    expect(startPlayback(loop, 'off').paused).toBe(true);
  });

  it('eases progress along --lv-ease and reaches 1 on the last frame', () => {
    expect(progress(entrance, 0)).toBe(0);
    expect(progress(entrance, 9)).toBe(1);
    // A quick start: more than half way at the middle frame.
    expect(progress(entrance, 4)).toBeGreaterThan(0.5);
  });
});
