// The one-at-a-time queue in the terminal: the count and the end always in view, one item large,
// the rest small. Keys are the main way to act here; the state rules live in core/queue.ts.
import { Box, Text, useInput } from 'ink';
import type { ReactNode } from 'react';
import { Card, useLievre } from './components.js';
import {
  DEFER_KEY,
  UNDO_KEY,
  getQueueSnapshot,
  queueKey,
  type DecisionState,
  type QueueChoice,
} from '../core/queue.js';

/** 「5 / 12 件を確認」と件数を先に書き、線を添える。割合だけにはしない。 */
export function QueueProgress({
  done,
  total,
  deferred = 0,
  width = 40,
  verb = '確認',
}: {
  done: number;
  total: number;
  deferred?: number;
  /** 線の長さ（セル）。 */
  width?: number;
  verb?: string;
}) {
  const { p, g } = useLievre();
  const max = Math.max(0, Math.floor(total));
  const value = Math.min(max, Math.max(0, Math.floor(done)));
  const filled = max ? Math.round((value / max) * width) : 0;
  return (
    <Box flexDirection="column">
      <Text color={p.text}>
        <Text bold>{value}</Text> / {max} 件を{verb}
        {deferred > 0 && <Text color={p.muted}>　あとで {deferred} 件</Text>}
      </Text>
      {/* The words above already say it; the line is drawn for the eye only. */}
      <Text aria-hidden>
        <Text color={p.paints ? p.accent : undefined} bold={!p.paints}>
          {g.barDone.repeat(filled)}
        </Text>
        <Text color={p.border}>{g.barTodo.repeat(width - filled)}</Text>
      </Text>
    </Box>
  );
}

/** A key and what it does: the key in bold, the words after it, never the key alone. */
function KeyHint({ input, label, primary }: { input: string; label: string; primary?: boolean }) {
  const { p } = useLievre();
  return (
    <Box aria-role="button" aria-label={`${label}（${input.toUpperCase()}）`}>
      <Text color={p.paints ? (primary ? p.accent : p.text) : undefined} bold>
        [{input.toUpperCase()}]
      </Text>
      <Text color={p.text} backgroundColor={p.surface}>
        {' '}
        {label}
      </Text>
    </Box>
  );
}

export type QueueProps<T> = {
  /** 出す順に並べた項目。 */
  items: readonly T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  /** 今の項目の中身。 */
  renderItem?: (item: T) => ReactNode;
  state: DecisionState;
  choices: readonly QueueChoice[];
  /** 列の名前。カードの見出しになる。 */
  label: string;
  /** 並び順の決め方。 */
  order?: string;
  /** 今の項目が出てきた理由。 */
  reason?: (item: T) => string | undefined;
  previewCount?: number;
  verb?: string;
  endTitle?: string;
};

/**
 * 1件ずつ判断する列。時間では進まず、すべて決めたら「すべて確認しました」で止まる。
 * 描くだけの部品で、キーは useQueueInput で受ける。
 */
export function Queue<T>({
  items,
  getKey,
  getLabel,
  renderItem,
  state,
  choices,
  label,
  order,
  reason,
  previewCount = 3,
  verb = '確認',
  endTitle = 'すべて確認しました',
}: QueueProps<T>) {
  const { p } = useLievre();
  const keys = items.map(getKey);
  const byKey = new Map(items.map((item) => [getKey(item), item]));
  const s = getQueueSnapshot(keys, state);
  const current = s.current === undefined ? undefined : byKey.get(s.current);
  const deferredCount = state.deferred.filter(
    (k) => byKey.has(k) && !Object.hasOwn(state.decisions, k),
  ).length;
  const next = [...s.upcoming, ...s.deferred];
  const shown = next.slice(0, previewCount);
  const labelOf = (value: string) => choices.find((c) => c.value === value)?.label ?? value;
  return (
    <Box flexDirection="column" gap={1}>
      {order && <Text color={p.muted}>{order}</Text>}
      <QueueProgress done={s.done.length} total={s.total} deferred={deferredCount} verb={verb} />
      {s.done.length > 0 && (
        <Box flexDirection="column" aria-role="list" aria-label="決めた項目">
          {s.done.map(({ key, value }) => (
            <Text key={key} color={p.muted} aria-role="listitem">
              <Text color={p.text} bold>
                {labelOf(value)}
              </Text>
              {'  '}
              {getLabel(byKey.get(key)!)}
            </Text>
          ))}
        </Box>
      )}
      {current !== undefined ? (
        <Card title={label}>
          <Box flexDirection="column">
            <Text color={p.muted} backgroundColor={p.surface}>
              {s.currentDeferred
                ? 'あとで回した項目です'
                : (reason?.(current) ?? `${s.total} 件中 ${s.done.length + 1} 件目`)}
            </Text>
            <Text color={p.text} backgroundColor={p.surface} bold>
              {getLabel(current)}
            </Text>
          </Box>
          {renderItem?.(current)}
          <Box gap={2} flexWrap="wrap">
            {choices.map((c, i) => (
              <KeyHint key={c.value} input={c.key} label={c.label} primary={i === 0} />
            ))}
            <KeyHint input={DEFER_KEY} label="あとで" />
            {state.log.length > 0 && <KeyHint input={UNDO_KEY} label="1つ戻す" />}
          </Box>
        </Card>
      ) : (
        <Card title={endTitle}>
          <Text color={p.text} backgroundColor={p.surface}>
            {choices
              .map((c) => `${c.label} ${s.done.filter((d) => d.value === c.value).length} 件`)
              .join('、')}
            。{state.log.length > 0 ? `[${UNDO_KEY.toUpperCase()}] で1つ戻せます。` : ''}
          </Text>
        </Card>
      )}
      {current !== undefined && next.length > 0 && (
        <Box flexDirection="column">
          <Text color={p.muted} bold>
            このあと
          </Text>
          {shown.map((key) => (
            <Text key={key} color={p.muted}>
              {getLabel(byKey.get(key)!)}
            </Text>
          ))}
          {next.length > shown.length && (
            <Text color={p.muted}>ほか {next.length - shown.length} 件</Text>
          )}
        </Box>
      )}
    </Box>
  );
}

/**
 * 列のキーを受ける。端末では列が画面そのものなので、1文字のキーをそのまま使う。
 * active を false にすると受けない（入力欄にいるあいだ、別の画面を出しているあいだ）。
 */
export function useQueueInput({
  keys,
  state,
  choices,
  onStateChange,
  active = true,
}: {
  keys: readonly string[];
  state: DecisionState;
  choices: readonly QueueChoice[];
  onStateChange: (state: DecisionState) => void;
  active?: boolean;
}) {
  useInput(
    (input, key) => {
      if (key.ctrl || key.meta) return;
      const next = queueKey(keys, state, input, choices);
      if (next) onStateChange(next);
    },
    { isActive: active },
  );
}
