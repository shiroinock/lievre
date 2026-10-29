// Card, Button and Table drawn with Ink. Spacing follows the 1:2 cell: 2 columns ≈ 1 row ≈ 1em,
// so a card's padding is 1 row by 2 columns, as 20px is on the web.
import { Box, Text } from 'ink';
import { createContext, useContext, type ReactNode } from 'react';
import stringWidth from 'string-width';
import type { Glyphs } from './glyphs.js';
import type { Palette } from './palette.js';

export const Kei = createContext<{ p: Palette; g: Glyphs }>(null!);
const useKei = () => useContext(Kei);

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  const { p, g } = useKei();
  return (
    <Box
      flexDirection="column"
      borderStyle={g.frame}
      borderColor={p.border}
      borderBackgroundColor={p.surface}
      backgroundColor={p.surface}
      paddingX={2}
      paddingY={1}
      gap={1}
    >
      {title && (
        <Text bold color={p.text} backgroundColor={p.surface}>
          {title}
        </Text>
      )}
      {children}
    </Box>
  );
}

export function Button({
  label,
  variant = 'secondary',
  focused = false,
}: {
  label: string;
  variant?: 'primary' | 'secondary';
  focused?: boolean;
}) {
  const { p, g } = useKei();
  const primary = variant === 'primary';
  // Without known colors the primary button is reverse video: the terminal's own text and
  // background swapped, so its contrast is the user's own text contrast.
  const fill = p.paints ? (primary ? p.accent : p.sunken) : undefined;
  const ink = p.paints ? (primary ? p.onAccent : p.text) : undefined;
  const inverse = !p.paints && primary;
  // Filled caps (KEI Term) take the button's color as their foreground; spaces take it as background.
  const cap = (char: string) =>
    g.set === 'kei-term' && p.paints ? (
      <Text color={fill} backgroundColor={p.surface}>
        {char}
      </Text>
    ) : (
      <Text backgroundColor={fill} inverse={inverse}>
        {char === ' ' || g.set !== 'kei-term' ? ' ' : char}
      </Text>
    );
  const ring = (char: string) => (
    <Text color={p.focus} backgroundColor={p.surface} bold>
      {focused ? char : ' '}
    </Text>
  );
  return (
    <Box aria-role="button" aria-label={label} aria-state={{ selected: focused }}>
      {ring(g.focusLeft)}
      {cap(g.capLeft)}
      <Text
        backgroundColor={fill}
        color={ink}
        inverse={inverse}
        bold={primary}
        underline={!p.paints && !primary}
      >
        {label}
      </Text>
      {cap(g.capRight)}
      {ring(g.focusRight)}
    </Box>
  );
}

export type Column<Row> = {
  label: string;
  width: number;
  align?: 'left' | 'right';
  /** A string is padded to the column; a node pads itself. */
  cell: (row: Row) => string | ReactNode;
};

/** Pads by display width, so kana and kanji count as 2 cells. */
export function pad(text: string, width: number, align: 'left' | 'right' = 'left') {
  const space = ' '.repeat(Math.max(0, width - stringWidth(text)));
  return align === 'right' ? space + text : text + space;
}

export function Table<Row>({
  columns,
  rows,
  selected,
}: {
  columns: Column<Row>[];
  rows: Row[];
  selected?: number;
}) {
  const { p, g } = useKei();
  const total = 1 + columns.reduce((sum, c) => sum + c.width + 2, 0);
  return (
    // No aria-label here: in Ink's screen reader output a label replaces the content, rows and all.
    <Box flexDirection="column" aria-role="table">
      <Box>
        <Text backgroundColor={p.sunken}> </Text>
        {columns.map((c) => (
          <Text key={c.label} backgroundColor={p.sunken} color={p.text} bold>
            {pad(c.label, c.width, c.align) + '  '}
          </Text>
        ))}
      </Box>
      {/* A screen reader would read every box-drawing character by name. */}
      <Text color={p.border} backgroundColor={p.surface} aria-hidden>
        {g.rule.repeat(total)}
      </Text>
      {rows.map((row, i) => {
        const on = i === selected;
        const bg = on ? p.selected : p.surface;
        return (
          <Box key={i}>
            <Text color={p.accent} backgroundColor={bg}>
              {on ? g.selectedBar : ' '}
            </Text>
            {columns.map((c) => {
              const cell = c.cell(row);
              return (
                <Text key={c.label} backgroundColor={bg} color={p.text}>
                  {typeof cell === 'string' ? pad(cell, c.width, c.align) : cell}
                  {'  '}
                </Text>
              );
            })}
          </Box>
        );
      })}
    </Box>
  );
}

export type State = 'ok' | 'warn' | 'stop';
const WORDS: Record<State, string> = { ok: '正常', warn: '注意', stop: '停止' };

/** The mark and the word together: color repeats the meaning, never carries it alone. */
export function Status({ state, width }: { state: State; width: number }) {
  const { p, g } = useKei();
  const color = { ok: p.success, warn: p.warning, stop: p.danger }[state];
  const mark = { ok: g.ok, warn: g.warn, stop: g.stop }[state];
  return (
    <Text>
      <Text color={color} bold>
        {mark}
      </Text>
      {/* With unknown palette values (16 colors) the word stays in the terminal's own text color. */}
      <Text color={p.paints ? color : undefined}>{pad(' ' + WORDS[state], width - 1)}</Text>
    </Text>
  );
}
