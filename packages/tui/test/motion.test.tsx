import { EventEmitter } from 'node:events';
import { Box, Text, render, renderToString } from 'ink';
import stringWidth from 'string-width';
import { afterEach, describe, expect, it } from 'vitest';
import {
  Banner,
  ENTRANCES,
  Frame,
  Lievre,
  Loading,
  glyphs,
  useFrames,
  makeGrid,
  palette,
  shimmer,
  toLines,
  type Glyphs,
  type Level,
  type MotionPolicy,
  type Palette,
  type ThemeName,
} from '../src/index.js';

const ANSI = /\u001b\[[0-9;?]*[a-zA-Z]/g;
const ART = [
  '  _ _                    ',
  ' | (_) _____   ___ __ ___',
  ' | | |/ _ \\ \\ / / `__/ _ \\',
  ' |_|_|\\___|\\_/|_|  \\___/',
];
const LABEL = 'lievre の端末';

const wrap = (node: React.ReactNode, p: Palette, g: Glyphs = glyphs({})) => (
  <Lievre.Provider value={{ p, g }}>{node}</Lievre.Provider>
);
// palette('256') searches the xterm colors on every call, so each level and theme is made once.
const palettes = new Map<string, Palette>();
const paletteOf = (level: Level, theme: ThemeName) => {
  const key = `${level} ${theme}`;
  if (!palettes.has(key)) palettes.set(key, palette(level, theme));
  return palettes.get(key)!;
};
const draw = (node: React.ReactNode, level: Level = 'truecolor', theme: ThemeName = 'paper') =>
  renderToString(wrap(node, paletteOf(level, theme)), { columns: 60 });
const plain = (s: string) => s.replace(ANSI, '');

describe('Frame', () => {
  const themes: ThemeName[] = ['paper', 'ink'];
  const levels: Level[] = ['truecolor', '256', '16', 'none'];
  for (const theme of themes)
    for (const level of levels)
      it(`${level} ${theme}: every frame of every entrance keeps the art's width`, () => {
        const grid = makeGrid(ART);
        for (const effect of Object.values(ENTRANCES))
          for (let i = 0; i <= 10; i++) {
            // A column of bars to the right shows where every line of the frame ends.
            const out = draw(
              <Box>
                <Frame grid={effect(grid, i / 10)} label={LABEL} />
                <Box flexDirection="column">
                  {ART.map((_, y) => (
                    <Text key={y}>|</Text>
                  ))}
                </Box>
              </Box>,
              level,
              theme,
            );
            const lines = plain(out).split('\n');
            expect(lines).toHaveLength(ART.length);
            for (const line of lines) expect(stringWidth(line)).toBe(grid.width + 1);
          }
      });

  it('draws the last frame as the art itself', () => {
    const out = plain(draw(<Frame grid={ENTRANCES.sweep(makeGrid(ART), 1)} label={LABEL} />));
    expect(out).toBe(toLines(makeGrid(ART)).join('\n'));
  });

  it('paints no color without one, and no surface with 16 colors', () => {
    const mid = <Frame grid={ENTRANCES.sweep(makeGrid(ART), 0.5)} label={LABEL} />;
    expect(draw(mid, 'none')).not.toMatch(/\u001b\[(3|4)8;/);
    expect(draw(mid, '16')).not.toMatch(/\u001b\[(3[0-7]|9[0-7]|4[0-7]|10[0-7]|[34]8;)/);
  });

  it('shows the moving band in bold where colors are unknown, never dim', () => {
    const band = <Frame grid={shimmer()(makeGrid('読み込んでいます'), 0.5)} label="x" />;
    for (const level of ['16', 'none'] as Level[]) {
      expect(draw(band, level)).toMatch(/\u001b\[1m/);
      expect(draw(band, level)).not.toMatch(/\u001b\[2m/);
    }
    expect(draw(band, 'truecolor')).not.toMatch(/\u001b\[2m/);
  });
});

describe('Banner and Loading without a terminal clock (renderToString)', () => {
  const banner = (policy: MotionPolicy) => <Banner art={ART} label={LABEL} policy={policy} />;

  it('starts empty when it moves', () => {
    expect(plain(draw(banner('full'))).trim()).toBe('');
  });

  it('shows the whole art at once when motion is reduced', () => {
    expect(plain(draw(banner('reduced')))).toContain(ART[3]);
  });

  it('gives one line of words when it does not move at all', () => {
    expect(plain(draw(banner('off')))).toBe(LABEL);
    expect(plain(draw(<Loading label="取り込んでいます" policy="off" />))).toBe('取り込んでいます');
  });

  it('says how to pause only when keys can be read', () => {
    // renderToString has no terminal to read keys from.
    expect(plain(draw(<Loading label="取り込んでいます" policy="full" />))).not.toContain('[P]');
  });

  it('takes words after the label, as the skill shows', () => {
    const out = plain(
      draw(
        <Loading label="取り込んでいます" policy="reduced">
          {'　12 / 40 件'}
        </Loading>,
      ),
    );
    expect(out).toBe('取り込んでいます　12 / 40 件');
  });

  it('ends with one line: the mark and the result', () => {
    const out = plain(draw(<Loading label="取り込んでいます" result="40 件を取り込みました" />));
    expect(out).toBe('✓ 40 件を取り込みました');
    const ascii = renderToString(
      wrap(
        <Loading label="x" result="止まりました" tone="stop" />,
        palette('none', 'paper'),
        glyphs({ LIEVRE_GLYPHS: 'ascii' }),
      ),
    );
    expect(plain(ascii)).toBe('x 止まりました');
  });
});

// A terminal for Ink: stdout that keeps what was written, stdin that can take raw mode.
function terminal() {
  const stdout = Object.assign(new EventEmitter(), {
    columns: 60,
    rows: 20,
    isTTY: true,
    chunks: [] as string[],
    write(chunk: string) {
      this.chunks.push(chunk);
      return true;
    },
  });
  const events = new EventEmitter();
  const stdin = Object.assign(events, {
    isTTY: true,
    queue: [] as string[],
    setRawMode() {},
    setEncoding() {},
    ref() {},
    unref() {},
    resume() {},
    pause() {},
    read() {
      return this.queue.shift() ?? null;
    },
    press(data: string) {
      this.queue.push(data);
      events.emit('readable');
    },
  });
  return { stdout, stdin };
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('in a terminal (render)', () => {
  let unmount = () => {};
  afterEach(() => unmount());

  function start(node: React.ReactNode, options: { isScreenReaderEnabled?: boolean } = {}) {
    const t = terminal();
    const app = render(wrap(node, palette('truecolor', 'paper')), {
      stdout: t.stdout as unknown as NodeJS.WriteStream,
      stdin: t.stdin as unknown as NodeJS.ReadStream,
      patchConsole: false,
      exitOnCtrlC: false,
      // Ink writes no frame until the end when it sees CI, even on a terminal. These tests stand in
      // for a person at a terminal, so Ink is told it is one (the motion policy is passed apart).
      interactive: true,
      ...options,
    });
    unmount = () => app.unmount();
    return {
      ...t,
      last: () => plain(t.stdout.chunks.join('')),
      rerender: (next: React.ReactNode) => app.rerender(wrap(next, palette('truecolor', 'paper'))),
    };
  }

  it('plays the banner to its last frame, then stops writing', async () => {
    let done = 0;
    const t = start(<Banner art={ART} label={LABEL} policy="full" onDone={() => (done += 1)} />);
    await wait(700);
    expect(t.last()).toContain(ART[3]);
    expect(done).toBe(1);
    const written = t.stdout.chunks.length;
    await wait(200);
    expect(t.stdout.chunks.length).toBe(written);
  });

  it('skips to the end with Enter', async () => {
    let done = 0;
    const t = start(
      <Banner art={ART} label={LABEL} policy="full" frames={600} onDone={() => (done += 1)} />,
    );
    await wait(60);
    expect(done).toBe(0);
    t.stdin.press('\r');
    await wait(60);
    expect(done).toBe(1);
    expect(t.last()).toContain(ART[3]);
  });

  it('pauses the loop with P and stops writing until it resumes', async () => {
    const t = start(<Loading label="取り込んでいます" policy="full" />);
    await wait(100);
    expect(t.last()).toContain('[P] 止める');
    t.stdin.press('p');
    await wait(60);
    expect(t.last()).toContain('[P] 再開する');
    const written = t.stdout.chunks.length;
    await wait(200);
    expect(t.stdout.chunks.length).toBe(written);
    t.stdin.press('p');
    await wait(200);
    expect(t.stdout.chunks.length).toBeGreaterThan(written);
  });

  function Count({ policy = 'full' }: { policy?: MotionPolicy }) {
    const { frame, paused } = useFrames({ loop: true, policy, frames: 1000 });
    return <Text>{`f=${frame} ${paused ? 'paused' : 'moving'}`}</Text>;
  }
  const shown = (t: { last: () => string }) => t.last().split('f=').pop()!.trim();

  it('pauses on the frame it was showing', async () => {
    const t = start(<Count />);
    await wait(400);
    const [before] = shown(t).split(' ');
    t.stdin.press('p');
    await wait(60);
    const [at, state] = shown(t).split(' ');
    expect(state).toBe('paused');
    expect(Number(at)).toBeGreaterThanOrEqual(Number(before));
    expect(Number(at)).toBeGreaterThan(0);
  });

  it('pauses the loop when motion is turned down while it moves', async () => {
    const t = start(<Count />);
    await wait(200);
    t.rerender(<Count policy="reduced" />);
    await wait(60);
    expect(shown(t)).toMatch(/ paused$/);
    const written = t.stdout.chunks.length;
    await wait(200);
    expect(t.stdout.chunks.length).toBe(written);
  });

  it('reads one line of words to a screen reader, and never redraws it', async () => {
    const t = start(<Loading label="取り込んでいます" />, { isScreenReaderEnabled: true });
    await wait(200);
    expect(t.last()).toContain('取り込んでいます');
    expect(t.last()).not.toContain('[P]');
    const written = t.stdout.chunks.length;
    await wait(200);
    expect(t.stdout.chunks.length).toBe(written);
  });
});

describe('the skill', () => {
  it('ships in the npm package with its name and description', async () => {
    const { readFile } = await import('node:fs/promises');
    const root = new URL('../', import.meta.url);
    const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
    expect(pkg.files).toContain('skills');
    const skill = await readFile(new URL('skills/tui-motion/SKILL.md', root), 'utf8');
    expect(skill).toMatch(/^---\nname: tui-motion\ndescription: .+\n---\n/);
  });
});
