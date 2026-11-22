import { EventEmitter } from 'node:events';
import { render, renderToString } from 'ink';
import { useState } from 'react';
import stringWidth from 'string-width';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CommandPalette,
  DEFAULT_TERM_HOTKEY,
  Lievre,
  closedPalette,
  describeTermHotkey,
  filterCommands,
  glyphs,
  isHotkey,
  palette,
  paletteCount,
  paletteKey,
  openPalette,
  settleHighlight,
  useCommandPaletteInput,
  type Level,
  type PaletteState,
  type TermCommand,
  type ThemeName,
} from '../src/index.js';

const ANSI = /\u001b\[[0-9;?]*[a-zA-Z]/g;
const plain = (s: string) => s.replace(ANSI, '');

const items: TermCommand[] = [
  { value: 'home', label: 'ホームへ移動', kana: 'ほーむへいどう', group: '移動' },
  {
    value: 'settings',
    label: '設定を開く',
    kana: 'せっていをひらく',
    keywords: ['settings'],
    group: '移動',
  },
  {
    value: 'new',
    label: '新しい作業を作る',
    kana: 'あたらしいさぎょうをつくる',
    group: '操作',
    shortcut: 'N',
  },
  {
    value: 'archive',
    label: '作業をしまう',
    kana: 'さぎょうをしまう',
    group: '操作',
    disabled: true,
  },
  { value: 'export', label: 'ＣＳＶで書き出す', description: '表示中の一覧', group: '操作' },
];

type Press = { input?: string } & Parameters<typeof paletteKey>[3];
const press = (state: PaletteState, ...keys: (string | Press)[]) => {
  let run: string | undefined;
  for (const k of keys) {
    const { input = '', ...key } = typeof k === 'string' ? { input: k } : k;
    const next = paletteKey(items, state, input, key);
    if (next) {
      state = next.state;
      run = next.run ?? run;
    }
  }
  return { state, run };
};
const ctrlK: Press = { input: 'k', ctrl: true };
const opened = press(closedPalette, ctrlK).state;

describe('palette keys', () => {
  it('opens with Ctrl+K, and with ⌘K where the terminal passes it', () => {
    expect(opened).toEqual({ open: true, query: '', highlighted: 0 });
    expect(press(closedPalette, { input: 'k', super: true }).state.open).toBe(true);
    expect(isHotkey('k', {}, DEFAULT_TERM_HOTKEY)).toBe(false);
    expect(isHotkey('k', { ctrl: true, meta: true })).toBe(false);
    expect(paletteKey(items, closedPalette, 'k', {})).toBeUndefined();
  });
  it('closes with Esc or the hotkey again', () => {
    expect(press(opened, { escape: true }).state).toEqual(closedPalette);
    expect(press(opened, ctrlK).state).toEqual(closedPalette);
  });
  it('filters as you type and highlights the first match', () => {
    const { state } = press(opened, 'せ', 'っ', 'て', 'い');
    expect(state.query).toBe('せってい');
    expect(filterCommands(items, state.query)[state.highlighted].value).toBe('settings');
    expect(press(state, { backspace: true }).state.query).toBe('せって');
  });
  it('takes pasted or committed text in one go', () => {
    expect(press(opened, 'さぎょう').state.query).toBe('さぎょう');
  });
  it('moves past disabled commands, wraps at the ends, and runs with Enter', () => {
    const down = { downArrow: true };
    let { state } = press(opened, down, down, down);
    // しまう is disabled, so the third step lands on 書き出す.
    expect(filterCommands(items, '')[state.highlighted].value).toBe('export');
    state = press(state, down).state;
    expect(state.highlighted).toBe(0);
    state = press(state, { upArrow: true }).state;
    expect(state.highlighted).toBe(4);
    const result = press(state, { return: true });
    expect(result.run).toBe('export');
    expect(result.state).toEqual(closedPalette);
  });
  it('does nothing on Enter with no match', () => {
    const { state } = press(opened, 'ぞぞ');
    expect(state.highlighted).toBe(-1);
    expect(paletteKey(items, state, '', { return: true })).toBeUndefined();
  });
  it('highlights the first command for a state opened from outside', () => {
    expect(openPalette(items)).toEqual(opened);
    const outside = { open: true, query: '', highlighted: -1 };
    expect(settleHighlight(items, outside).highlighted).toBe(0);
    expect(paletteKey(items, outside, '', { return: true }, false)?.run).toBe('home');
    // On a command that cannot be chosen, or past the end of the list.
    expect(settleHighlight(items, { ...outside, highlighted: 3 }).highlighted).toBe(0);
    expect(settleHighlight(items, { ...outside, highlighted: 9 }).highlighted).toBe(0);
    expect(settleHighlight(items, { ...outside, highlighted: 2 }).highlighted).toBe(2);
  });
  it('types a plain-key hotkey into the text while open', () => {
    const slash = { key: '/' };
    let state = paletteKey(items, closedPalette, '/', {}, slash)!.state;
    for (const ch of 'a/b') state = paletteKey(items, state, ch, {}, slash)!.state;
    expect(state).toMatchObject({ open: true, query: 'a/b' });
    // A hotkey with Ctrl still closes it.
    expect(paletteKey(items, state, 'k', { ctrl: true })?.state).toEqual(closedPalette);
  });
  it('says so when only commands that cannot be chosen match', () => {
    expect(paletteCount(items, 'しまう', '一致するコマンドがありません')).toBe(
      '選べるコマンドはありません（1件は選べません）',
    );
    expect(paletteCount(items, 'ぞぞ', '一致するコマンドがありません')).toBe(
      '一致するコマンドがありません',
    );
  });
  it('takes another hotkey, or none', () => {
    const hotkey = { key: 'p', mod: true, shift: true };
    expect(paletteKey(items, closedPalette, 'k', { ctrl: true }, hotkey)).toBeUndefined();
    expect(
      paletteKey(items, closedPalette, 'p', { ctrl: true, shift: true }, hotkey)?.state.open,
    ).toBe(true);
    expect(paletteKey(items, closedPalette, 'k', { ctrl: true }, false)).toBeUndefined();
    expect(describeTermHotkey(hotkey)).toBe('Ctrl+Shift+P');
    expect(describeTermHotkey()).toBe('Ctrl+K');
  });
});

const draw = (
  state: PaletteState,
  level: Level = 'truecolor',
  theme: ThemeName = 'paper',
  set = 'unicode',
) =>
  renderToString(
    <Lievre.Provider value={{ p: palette(level, theme), g: glyphs({ LIEVRE_GLYPHS: set }) }}>
      <CommandPalette items={items} state={state} />
    </Lievre.Provider>,
    { columns: 60 },
  );

describe('the palette', () => {
  it('draws nothing while closed', () => {
    expect(plain(draw(closedPalette)).trim()).toBe('');
  });
  it('shows the search line, the count, the groups and the keys in words', () => {
    const text = plain(draw(press(opened, 'さぎょう').state));
    expect(text).toContain('> さぎょう');
    expect(text).toContain('1件のコマンドがあります');
    expect(text).toContain('操作');
    expect(text).not.toContain('移動');
    expect(text).toMatch(/▌新しい作業を作る\s+N/);
    expect(text).toContain('作業をしまう  使えません');
    expect(text).toMatch(/\[上下\] 選ぶ\s+\[Enter\] 実行\s+\[Esc\] 閉じる/);
  });
  it('shows the placeholder and says so when nothing matches', () => {
    expect(plain(draw(opened))).toContain('> コマンドを探す');
    expect(plain(draw(press(opened, 'ぞぞ').state))).toContain('一致するコマンドがありません');
  });
  it('shows a window around the highlight in a long list, with the rest counted', () => {
    const many: TermCommand[] = Array.from({ length: 20 }, (_, i) => ({
      value: `c${i}`,
      label: `コマンド ${String(i + 1).padStart(2, '0')}`,
    }));
    const text = plain(
      renderToString(
        <Lievre.Provider value={{ p: palette('truecolor', 'paper'), g: glyphs({}) }}>
          <CommandPalette
            items={many}
            state={{ open: true, query: '', highlighted: 10 }}
            maxRows={5}
          />
        </Lievre.Provider>,
        { columns: 60 },
      ),
    );
    expect(text).toContain('コマンド 11');
    expect(text).not.toContain('コマンド 01');
    expect(text).toContain('前に 8 件　後に 7 件');
  });
  for (const level of ['truecolor', '256', '16', 'none'] as Level[])
    for (const theme of ['paper', 'ink'] as ThemeName[])
      it(`${level} ${theme}: keeps the card's right edge on the cell grid`, () => {
        const lines = plain(draw({ ...opened, highlighted: 2 }, level, theme))
          .split('\n')
          .filter((line) => /^[│╭╰]/.test(line));
        expect(lines.length).toBeGreaterThan(4);
        expect(new Set(lines.map((line) => stringWidth(line))).size).toBe(1);
      });
  it('uses ASCII when ambiguous characters are wide', () => {
    const text = plain(
      renderToString(
        <Lievre.Provider
          value={{ p: palette('16', 'paper'), g: glyphs({ LIEVRE_AMBIGUOUS: 'wide' }) }}
        >
          <CommandPalette items={items} state={opened} />
        </Lievre.Provider>,
        { columns: 60 },
      ),
    );
    expect(text).toMatch(/^\+-+\+$/m);
    expect(text).toContain('>ホームへ移動');
    expect(text).not.toMatch(/[╭│▌]/);
  });
  it('cuts a long name to the row and keeps 「使えません」 in words', () => {
    const long: TermCommand[] = [
      { value: 'a', label: '表示中の一覧をすべてCSVで書き出して保存する', shortcut: 'E' },
      {
        value: 'b',
        label: '選んだ作業をまとめてしまって一覧から外す',
        description: '作業を選ぶと使えます',
        disabled: true,
      },
    ];
    const lines = plain(
      renderToString(
        <Lievre.Provider value={{ p: palette('none', 'paper'), g: glyphs({}) }}>
          <CommandPalette
            items={long}
            state={{ open: true, query: '', highlighted: 0 }}
            width={40}
          />
        </Lievre.Provider>,
        { columns: 60 },
      ),
    ).split('\n');
    const framed = lines.filter((line) => /^[│╭╰]/.test(line));
    expect(new Set(framed.map((line) => stringWidth(line))).size).toBe(1);
    expect(lines.some((l) => /表示中の一覧.*\.\.\.\s+E\s+│$/.test(l))).toBe(true);
    expect(lines.some((l) => /選んだ作業.*\.\.\.  使えません\s+│$/.test(l))).toBe(true);
  });
  it('rules off the commands without a group after a group', () => {
    const mixed: TermCommand[] = [
      { value: 'a', label: 'テーマを変える', group: '表示' },
      { value: 'b', label: '使い方を開く' },
    ];
    const lines = plain(
      renderToString(
        <Lievre.Provider value={{ p: palette('truecolor', 'paper'), g: glyphs({}) }}>
          <CommandPalette items={mixed} state={{ open: true, query: '', highlighted: 0 }} />
        </Lievre.Provider>,
        { columns: 60 },
      ),
    ).split('\n');
    const at = lines.findIndex((l) => l.includes('使い方を開く'));
    expect(lines[at - 1]).toMatch(/^│\s+─{10,}\s+│$/);
  });
  it('paints no color without one', () => {
    expect(draw(opened, 'none')).not.toMatch(/\u001b\[(3|4)8;/);
  });
});

// A terminal for Ink: stdout that keeps what was written, stdin that can take raw mode.
function terminal() {
  const stdout = Object.assign(new EventEmitter(), {
    columns: 70,
    rows: 30,
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

function App({
  onRun,
  list = items,
  initial = closedPalette,
  hotkey,
}: {
  onRun: (value: string) => void;
  list?: TermCommand[];
  initial?: PaletteState;
  hotkey?: false;
}) {
  const [state, setState] = useState(initial);
  useCommandPaletteInput({ items: list, state, onStateChange: setState, onRun, hotkey });
  return (
    <Lievre.Provider value={{ p: palette('truecolor', 'paper'), g: glyphs({}) }}>
      <CommandPalette items={list} state={state} />
    </Lievre.Provider>
  );
}

describe('in a terminal (render)', () => {
  let unmount = () => {};
  afterEach(() => unmount());
  function start(
    onRun: (value: string) => void,
    options: { isScreenReaderEnabled?: boolean } = {},
    node = <App onRun={onRun} />,
  ) {
    const t = terminal();
    const app = render(node, {
      stdout: t.stdout as unknown as NodeJS.WriteStream,
      stdin: t.stdin as unknown as NodeJS.ReadStream,
      patchConsole: false,
      exitOnCtrlC: false,
      interactive: true,
      ...options,
    });
    unmount = () => app.unmount();
    return { ...t, all: () => plain(t.stdout.chunks.join('')), rerender: app.rerender };
  }

  it('opens with Ctrl+K, filters, and runs the command with Enter', async () => {
    const runs: string[] = [];
    const t = start((v) => runs.push(v));
    t.stdin.press('\u000b');
    await wait(60);
    expect(t.all()).toContain('4件のコマンドがあります');
    t.stdin.press('csv');
    await wait(60);
    t.stdin.press('\r');
    await wait(60);
    expect(runs).toEqual(['export']);
  });

  it('runs the first command on Enter when opened from outside without a hotkey', async () => {
    const runs: string[] = [];
    const outside = { open: true, query: '', highlighted: -1 };
    const t = start(
      () => {},
      {},
      <App onRun={(v) => runs.push(v)} initial={outside} hotkey={false} />,
    );
    await wait(60);
    expect(t.all()).toMatch(/▌ホームへ移動/);
    t.stdin.press('\r');
    await wait(60);
    expect(runs).toEqual(['home']);
  });

  it('goes back to the first command when the items change while open', async () => {
    const runs: string[] = [];
    const t = start(() => {}, {}, <App onRun={(v) => runs.push(v)} initial={opened} />);
    await wait(40);
    t.stdin.press('\u001b[B');
    t.stdin.press('\u001b[B');
    await wait(60);
    const reordered = [items[4], ...items.slice(0, 4)];
    t.rerender(<App onRun={(v) => runs.push(v)} initial={opened} list={reordered} />);
    await wait(60);
    t.stdin.press('\r');
    await wait(60);
    expect(runs).toEqual(['export']);
  });

  it('reads the field, the count and each command with its state, and no frame', async () => {
    const t = start(() => {}, { isScreenReaderEnabled: true });
    t.stdin.press('\u000b');
    await wait(80);
    const text = t.all();
    expect(text).toContain('コマンド：未入力');
    expect(text).toContain('4件のコマンドがあります');
    expect(text).toMatch(/selected.*ホームへ移動/);
    expect(text).toMatch(/disabled.*作業をしまう/);
    expect(text).not.toMatch(/[╭│─▌]/);
  });
});
