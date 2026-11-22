// The command palette in the terminal: a card with the search line, the count, the commands in
// their groups and the keys. The state and the keys live in core/command.ts.
import { Box, Text, useInput } from 'ink';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import stringWidth from 'string-width';
import { Card, pad, useLievre } from './components.js';
import {
  DEFAULT_TERM_HOTKEY,
  filterCommands,
  paletteCount,
  paletteKey,
  settleHighlight,
  shownSignature,
  type PaletteState,
  type TermCommand,
  type TermHotkey,
} from '../core/command.js';

/** 開くキーの見た目（「Ctrl+K」）。端末ではどの OS でも Ctrl と書きます。 */
export function describeTermHotkey(hotkey: TermHotkey = DEFAULT_TERM_HOTKEY) {
  const key = hotkey.key.length === 1 ? hotkey.key.toUpperCase() : hotkey.key;
  return [hotkey.mod && 'Ctrl', hotkey.alt && 'Alt', hotkey.shift && 'Shift', key]
    .filter(Boolean)
    .join('+');
}

/** Cuts text to a width in cells (kana and kanji count 2), ending with "..." when cut. "…" is
 * East Asian Width Ambiguous, so it would break the frame where ambiguous characters are wide. */
function fit(text: string, width: number) {
  if (stringWidth(text) <= width) return text;
  let out = '';
  for (const ch of text) {
    if (stringWidth(out + ch) > width - 3) break;
    out += ch;
  }
  return out + '...';
}

/** A key and what it does: the key in bold, the words after it, never the key alone. */
function Hint({ keys, label }: { keys: string; label: string }) {
  const { p } = useLievre();
  return (
    <Text color={p.text} backgroundColor={p.surface}>
      <Text bold>[{keys}]</Text> {label}
    </Text>
  );
}

export type CommandPaletteProps = {
  /** 並べる項目。group ごとにまとめ、絞り込んだ結果も同じ順で出します。 */
  items: readonly TermCommand[];
  /** 今の状態。useCommandPaletteInput で進めます。閉じているときは何も描きません。 */
  state: PaletteState;
  /** パレットの名前。カードの見出しと、入力欄の読み上げの名前になります。 */
  label?: string;
  /** 何も入れていないときの文字。 */
  placeholder?: string;
  /** 一致する項目がないときの文。 */
  emptyText?: string;
  /** カードの幅（セル）。日本語は1字2セルで数えます。 */
  width?: number;
  /** 一度に見せる項目の数。多いときは選びかけの項目が見える範囲だけを描き、前後の数を言葉で出します。 */
  maxRows?: number;
};

/**
 * コマンドを探して実行するパレット（Web の CommandPalette と同じ決まり）。描くだけの部品で、キーは useCommandPaletteInput で受けます。
 * 開くキーは Web と同じ mod + K で、端末ではどの OS でも Ctrl+K です（⌘K は、⌘ を渡す端末でだけ働きます）。
 * 読み上げの設定（INK_SCREEN_READER）では、枠と選びかけの線を読ませず、入力欄・件数・項目を役割と状態つきで1行ずつ出します。
 */
export function CommandPalette({
  items,
  state,
  label = 'コマンド',
  placeholder = 'コマンドを探す',
  emptyText = '一致するコマンドがありません',
  width = 56,
  maxRows = 8,
}: CommandPaletteProps) {
  const { p, g } = useLievre();
  if (!state.open) return null;
  // Draw the highlight that Enter will use, even for a state made outside.
  state = settleHighlight(items, state);
  const shown = filterCommands(items, state.query);
  // The card's frame (2) and padding (2 + 2) come off the width.
  const inner = Math.max(10, width - 6);
  // A window of rows around the highlighted one, so a long list keeps it in view.
  const rows = Math.max(1, maxRows);
  const start = Math.min(
    Math.max(0, state.highlighted - Math.floor(rows / 2)),
    Math.max(0, shown.length - rows),
  );
  const visible = shown.slice(start, start + rows);
  const above = start;
  const below = shown.length - start - visible.length;

  const lines: ReactNode[] = [];
  let group: string | undefined;
  visible.forEach((item, i) => {
    const index = start + i;
    const name = item.group ?? '';
    // Leaving a group for items without one: a rule, so they don't read as part of it.
    if (!name && group)
      lines.push(
        <Text key={`r-${index}`} color={p.border} backgroundColor={p.surface} aria-hidden>
          {' ' + g.rule.repeat(inner - 1)}
        </Text>,
      );
    if (name && name !== group)
      lines.push(
        <Text key={`g-${index}`} color={p.muted} backgroundColor={p.surface} bold>
          {/* One cell in, over the labels rather than the highlight bar. */}
          {' ' + name}
        </Text>,
      );
    group = name;
    const on = index === state.highlighted;
    const bg = on ? p.selected : p.surface;
    const key = item.shortcut ?? '';
    const room = inner - 1 - (key ? stringWidth(key) + 2 : 0);
    // 「使えません」 always stays: it says in words what the muted colour only repeats. The name
    // is cut to fit first, then the description is dropped if there is no room for it.
    const off = item.disabled ? '  使えません' : '';
    const label = fit(item.label, room - stringWidth(off));
    const note = item.description ? `  ${item.description}` : '';
    const text = stringWidth(label + note + off) <= room ? label + note + off : label + off;
    lines.push(
      <Box
        key={item.value}
        aria-role="option"
        aria-state={{ selected: on, disabled: !!item.disabled }}
      >
        {/* The bar repeats the highlight for the eye; the state says it to the screen reader. */}
        <Text color={p.accent} backgroundColor={bg} aria-hidden>
          {on ? g.selectedBar : ' '}
        </Text>
        <Text color={item.disabled ? p.muted : p.text} backgroundColor={bg} bold={on && !p.paints}>
          {pad(text, room)}
        </Text>
        {key && (
          <Text color={on ? p.text : p.muted} backgroundColor={bg} aria-hidden>
            {'  ' + key}
          </Text>
        )}
      </Box>,
    );
  });

  return (
    <Box width={width} flexDirection="column">
      <Card title={label}>
        {/* A labelled box is read as its label alone: the name and what is typed. */}
        <Box aria-role="textbox" aria-label={`${label}：${state.query || '未入力'}`}>
          <Text color={p.paints ? p.accent : undefined} backgroundColor={p.surface} bold>
            {'> '}
          </Text>
          <Text color={state.query ? p.text : p.muted} backgroundColor={p.surface}>
            {state.query || placeholder}
          </Text>
          <Text inverse aria-hidden>
            {' '}
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text color={p.muted} backgroundColor={p.surface}>
            {paletteCount(items, state.query, emptyText)}
            {above > 0 && `　前に ${above} 件`}
            {below > 0 && `　後に ${below} 件`}
          </Text>
          {/* No label on the list: Ink would read the label instead of the rows. */}
          <Box flexDirection="column" aria-role="listbox">
            {lines}
          </Box>
        </Box>
        <Box gap={2} flexWrap="wrap">
          <Hint keys="上下" label="選ぶ" />
          <Hint keys="Enter" label="実行" />
          <Hint keys="Esc" label="閉じる" />
        </Box>
      </Card>
    </Box>
  );
}

/**
 * パレットのキーを受けます。閉じているあいだは開くキー（既定は Ctrl+K）だけを見て、ほかのキーは通します。
 * 開いているあいだに入った文字は絞り込みに使うので、画面のほかのキー（列の Y / N など）は active を外して止めます。
 * Enter で選ぶと、閉じてから onRun に値を渡します。
 */
export function useCommandPaletteInput({
  items,
  state,
  onStateChange,
  onRun,
  hotkey = DEFAULT_TERM_HOTKEY,
  active = true,
}: {
  items: readonly TermCommand[];
  state: PaletteState;
  onStateChange: (state: PaletteState) => void;
  /** 選んだ項目の値を受けます。 */
  onRun?: (value: string) => void;
  /** 開くキー。false で付けません（自分で state.open を入れて開きます）。 */
  hotkey?: TermHotkey | false;
  active?: boolean;
}) {
  // When the commands shown change (opened from outside, items replaced while open), the highlight
  // goes back to the first one that can be chosen, as on the web. Moving with the arrows changes
  // nothing shown, so it stays.
  const signature = state.open ? shownSignature(items, state.query) : undefined;
  const seen = useRef<string | undefined>(undefined);
  const latest = useRef({ items, state, onStateChange });
  latest.current = { items, state, onStateChange };
  useEffect(() => {
    const before = seen.current;
    seen.current = signature;
    if (signature === undefined || signature === before) return;
    const now = latest.current;
    const first = settleHighlight(now.items, { ...now.state, highlighted: -1 });
    if (first.highlighted !== now.state.highlighted) now.onStateChange(first);
  }, [signature]);
  useInput(
    (input, key) => {
      const next = paletteKey(items, state, input, key, hotkey);
      if (!next) return;
      onStateChange(next.state);
      if (next.run !== undefined) onRun?.(next.run);
    },
    { isActive: active },
  );
}
