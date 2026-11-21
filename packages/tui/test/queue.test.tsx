import { renderToString } from 'ink';
import stringWidth from 'string-width';
import { describe, expect, it } from 'vitest';
import {
  QUEUE_CHOICES,
  QUEUE_KEYS,
  QueueScreen,
  decideItem,
  emptyDecisionState,
  getQueueSnapshot,
  glyphs,
  palette,
  queueKey,
  type DecisionState,
  type Level,
  type ThemeName,
} from '../src/index.js';

const ANSI = /\u001b\[[0-9;]*m/g;
const draw = (
  state: DecisionState,
  level: Level = 'truecolor',
  theme: ThemeName = 'paper',
  set = 'unicode',
) =>
  renderToString(
    <QueueScreen p={palette(level, theme)} g={glyphs({ LIEVRE_GLYPHS: set })} state={state} />,
    {
      columns: 60,
    },
  );
const press = (state: DecisionState, ...inputs: string[]) =>
  inputs.reduce((s, input) => queueKey(QUEUE_KEYS, s, input, QUEUE_CHOICES) ?? s, state);

describe('queue keys', () => {
  it('decides with Y / N, defers with L and undoes with Z', () => {
    let s = press(emptyDecisionState, 'y', 'L');
    expect(s.decisions).toEqual({ 'inv-1': 'in' });
    expect(getQueueSnapshot(QUEUE_KEYS, s).current).toBe('inv-3');
    s = press(s, 'n', 'z');
    expect(getQueueSnapshot(QUEUE_KEYS, s).current).toBe('inv-3');
    expect(queueKey(QUEUE_KEYS, s, 'q', QUEUE_CHOICES)).toBeUndefined();
  });
  it('ignores Z when nothing has been decided and choices when all are done', () => {
    expect(queueKey(QUEUE_KEYS, emptyDecisionState, 'z', QUEUE_CHOICES)).toBeUndefined();
    const all = QUEUE_KEYS.reduce((s, k) => decideItem(s, k, 'in'), emptyDecisionState);
    expect(queueKey(QUEUE_KEYS, all, 'y', QUEUE_CHOICES)).toBeUndefined();
  });
});

describe('the queue screen', () => {
  it('shows the count, one item, its keys and a few of the rest', () => {
    const text = draw(press(emptyDecisionState, 'y')).replace(ANSI, '');
    expect(text).toContain('1 / 5 件を確認');
    expect(text).toContain('支払う  北山商事');
    expect(text).toContain('初めての取引先です');
    expect(text).toMatch(/\[Y\] 支払う\s+\[N\] 保留する\s+\[L\] あとで\s+\[Z\] 1つ戻す/);
    expect(text).toContain('このあと');
    expect(text).not.toContain('ほか');
    expect(draw(emptyDecisionState).replace(ANSI, '')).toContain('ほか 1 件');
  });
  it('stops at the end with a summary, and does not go on', () => {
    const text = draw(press(emptyDecisionState, 'y', 'y', 'n', 'y', 'n')).replace(ANSI, '');
    expect(text).toContain('5 / 5 件を確認');
    expect(text).toContain('すべて確認しました');
    expect(text).toContain('支払う 3 件、保留する 2 件');
    expect(text).not.toContain('このあと');
  });
  for (const level of ['truecolor', '256', '16', 'none'] as Level[])
    for (const theme of ['paper', 'ink'] as ThemeName[])
      it(`${level} ${theme}: keeps the card's right edge on the cell grid`, () => {
        const lines = draw(press(emptyDecisionState, 'y', 'l'), level, theme)
          .replace(ANSI, '')
          .split('\n');
        const framed = lines.filter((line) => /^[│╭╰]/.test(line));
        expect(framed.length).toBeGreaterThan(2);
        expect(new Set(framed.map((line) => stringWidth(line))).size).toBe(1);
      });
  it('paints no color without one, and no surfaces with 16 colors', () => {
    expect(draw(emptyDecisionState, 'none')).not.toMatch(/\u001b\[(3|4)8;/);
    expect(draw(emptyDecisionState, '16')).not.toMatch(/\u001b\[(4[0-7]|10[0-7]|48;)/);
  });
  it('keeps to ASCII for terminals that draw ambiguous characters wide', () => {
    const text = draw(press(emptyDecisionState, 'y'), '16', 'paper', 'ascii').replace(ANSI, '');
    expect(text).toContain('#');
    const nonAscii = [...text].filter((c) => c.codePointAt(0)! > 0x7e && stringWidth(c) < 2);
    expect(nonAscii).toEqual([]);
  });
});
