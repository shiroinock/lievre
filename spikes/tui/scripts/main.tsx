// Interactive sample: Tab / Shift+Tab move the focus, ↑↓ move the selected row, q quits.
//   npm start
// LIEVRE_THEME=paper|ink, LIEVRE_GLYPHS=unicode|lievre-term|ascii, LIEVRE_AMBIGUOUS=wide, NO_COLOR, FORCE_COLOR.
import chalk from 'chalk';
import { render, useApp, useInput, useStdin } from 'ink';
import { useState } from 'react';
import { glyphs } from '../../../packages/tui/src/core/glyphs.js';
import {
  detectLevel,
  palette,
  rgb,
  type ThemeName,
} from '../../../packages/tui/src/core/palette.js';
import { ROWS, Screen, type Focus } from '../../../packages/tui/src/ink/screen.js';

/**
 * Light or dark: LIEVRE_THEME first, then the terminal's background from an OSC 11 query
 * (answered by xterm, iTerm2, kitty, WezTerm, Ghostty, Windows Terminal, …), then COLORFGBG.
 */
async function detectTheme(): Promise<ThemeName> {
  const named = process.env.LIEVRE_THEME;
  if (named === 'paper' || named === 'ink') return named;
  const bg = await queryBackground();
  if (bg) {
    const [r, g, b] = rgb(bg);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128 ? 'ink' : 'paper';
  }
  const fallback = process.env.COLORFGBG?.split(';').pop();
  return fallback && ['0', '1', '2', '3', '4', '5', '6', '8'].includes(fallback) ? 'ink' : 'paper';
}

function queryBackground(): Promise<string | undefined> {
  const { stdin, stdout } = process;
  if (!stdin.isTTY || !stdout.isTTY) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const done = (value?: string) => {
      clearTimeout(timer);
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      resolve(value);
    };
    const onData = (data: Buffer) => {
      const m = /rgb:([0-9a-f]{2,4})\/([0-9a-f]{2,4})\/([0-9a-f]{2,4})/i.exec(data.toString());
      done(
        m
          ? '#' +
              m
                .slice(1)
                .map((h) => h.slice(0, 2))
                .join('')
          : undefined,
      );
    };
    const timer = setTimeout(() => done(), 150);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
    stdout.write('\x1b]11;?\x1b\\');
  });
}

const ORDER: Focus[] = ['save', 'cancel', 'table'];

function App({ theme }: { theme: ThemeName }) {
  const { exit } = useApp();
  const [focus, setFocus] = useState<Focus>('save');
  const [row, setRow] = useState(0);
  const level = detectLevel();
  const { isRawModeSupported } = useStdin();
  useInput(
    (input, key) => {
      if (input === 'q' || key.escape) exit();
      if (key.tab) {
        const step = key.shift ? ORDER.length - 1 : 1;
        setFocus(ORDER[(ORDER.indexOf(focus) + step) % ORDER.length]);
      }
      if (focus === 'table' && key.upArrow) setRow((r) => (r + ROWS - 1) % ROWS);
      if (focus === 'table' && key.downArrow) setRow((r) => (r + 1) % ROWS);
    },
    { isActive: isRawModeSupported },
  );
  return <Screen p={palette(level, theme)} g={glyphs()} focus={focus} row={row} />;
}

const level = detectLevel();
// Ink colors through chalk's shared instance; lievre has already chosen the level.
chalk.level = { none: 0, '16': 1, '256': 2, truecolor: 3 }[level] as 0 | 1 | 2 | 3;
render(<App theme={await detectTheme()} />);
