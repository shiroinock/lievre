import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Progress as ProgressPrimitive, ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
import { Button, Kbd } from './primitives';

// ---------------------------------------------------------------------------
// State: pure functions, shared by the queue and the list view.

/** 1件ずつ判断する列の状態。タイムラインと一覧の両方の見せ方が、この1つを共有します。 */
export type DecisionState = {
  /** 項目のキー → 決めた値（choices の value）。入っていない項目は未決です。 */
  decisions: Record<string, string>;
  /** 決めた順の項目のキー。1つ戻す（undo）はこの最後から戻します。 */
  log: string[];
  /** 「あとで」に回した順の項目のキー。未決のものは、列の最後にこの順で出ます。 */
  deferred: string[];
  /**
   * まとめて決めた項目のキー → まとめの番号。同じ番号の項目は1つの操作として、1つ戻すの1回でまとめて戻ります。
   * 1件ずつ決めた項目は入りません。省いてもかまいません。
   */
  batches?: Record<string, number>;
};

// Keeps the state free of an empty batches object, so plain states compare equal.
const withBatches = (state: DecisionState, batches: Record<string, number>): DecisionState => {
  const { batches: _, ...rest } = state;
  return Object.keys(batches).length ? { ...rest, batches } : rest;
};

/** 何も決めていない状態。 */
export const emptyDecisionState: DecisionState = { decisions: {}, log: [], deferred: [] };

/** 状態から組んだ、列の今の姿。 */
export type DecisionQueueSnapshot = {
  /** いま見ている項目のキー。すべて決め終えたら undefined。 */
  current: string | undefined;
  /** current があとで回した項目なら true。 */
  currentDeferred: boolean;
  /** これから出る項目（あとで回しを除く、出る順）。 */
  upcoming: string[];
  /** あとで回した未決の項目（current を除く、出る順）。 */
  deferred: string[];
  /** 決めた項目。決めた順で、一覧で決めて log にないものは先頭に置きます。 */
  done: { key: string; value: string }[];
  /** 列の全体の件数。 */
  total: number;
};

/**
 * 列の今の姿を組みます。keys は出す順（システムが決めた順）に並べて渡します。
 * keys にないキーの決定は数えません。
 */
export function getQueueSnapshot(
  keys: readonly string[],
  state: DecisionState,
): DecisionQueueSnapshot {
  const known = new Set(keys);
  const decided = (k: string) => Object.hasOwn(state.decisions, k);
  const logged = state.log.filter(
    (k, i) => known.has(k) && decided(k) && state.log.indexOf(k) === i,
  );
  const loggedSet = new Set(logged);
  const extra = keys.filter((k) => decided(k) && !loggedSet.has(k));
  const done = [...extra, ...logged].map((key) => ({ key, value: state.decisions[key] }));
  const deferredSet = new Set(state.deferred);
  const fresh = keys.filter((k) => !decided(k) && !deferredSet.has(k));
  const later = state.deferred.filter(
    (k, i) => known.has(k) && !decided(k) && state.deferred.indexOf(k) === i,
  );
  const queue = [...fresh, ...later];
  return {
    current: queue[0],
    currentDeferred: fresh.length === 0 && later.length > 0,
    upcoming: fresh.slice(1),
    deferred: fresh.length > 0 ? later : later.slice(1),
    done,
    total: keys.length,
  };
}

/** 項目を決めます。value を undefined にすると未決に戻し（決め直し）、列に戻します。 */
export function decideItem(
  state: DecisionState,
  key: string,
  value: string | undefined,
): DecisionState {
  const decisions = { ...state.decisions };
  const log = state.log.filter((k) => k !== key);
  if (value === undefined) delete decisions[key];
  else {
    decisions[key] = value;
    log.push(key);
  }
  // Deciding one item again, or putting it back, takes it out of the batch it was decided in.
  const { [key]: _, ...batches } = state.batches ?? {};
  return withBatches(
    {
      decisions,
      log,
      deferred: state.deferred.filter((k) => k !== key || value === undefined),
    },
    batches,
  );
}

/** 項目を「あとで」に回します。決めてあれば未決に戻してから回します。 */
export function deferItem(state: DecisionState, key: string): DecisionState {
  const next = decideItem(state, key, undefined);
  return { ...next, deferred: [...next.deferred.filter((k) => k !== key), key] };
}

/** 複数の項目を同じ値で決めます。2件以上なら1つの操作として記録し、1つ戻すの1回でまとめて戻ります。 */
export function decideItems(
  state: DecisionState,
  keys: readonly string[],
  value: string,
): DecisionState {
  const next = keys.reduce((acc, key) => decideItem(acc, key, value), state);
  if (keys.length < 2) return next;
  const id = Math.max(0, ...Object.values(next.batches ?? {})) + 1;
  return withBatches(next, {
    ...next.batches,
    ...Object.fromEntries(keys.map((k) => [k, id])),
  });
}

/** value で決めた項目のキー（一覧の行の選択として使う）。並びは決めた順です。 */
export function selectionOf(state: DecisionState, value = 'in'): string[] {
  const keys = Object.keys(state.decisions).filter((k) => state.decisions[k] === value);
  const order = new Map(state.log.map((k, i) => [k, i]));
  return keys.sort((a, b) => (order.get(a) ?? -1) - (order.get(b) ?? -1));
}

/**
 * 一覧の行の選択を状態に写します。選んだ行は value で決め、選択を外した行のうち value で決めていたものは未決に戻します。
 * ほかの値で決めた行（「見送る」など）は、選択を外しても変えません。
 */
export function applySelection(
  state: DecisionState,
  selected: readonly string[],
  value = 'in',
): DecisionState {
  const chosen = new Set(selected);
  const removed = Object.keys(state.decisions).filter(
    (k) => state.decisions[k] === value && !chosen.has(k),
  );
  const added = selected.filter((k) => state.decisions[k] !== value);
  return decideItems(
    removed.reduce((acc, k) => decideItem(acc, k, undefined), state),
    added,
    value,
  );
}

/** 1つ戻すで未決に戻る項目のキー。最後の操作が、まとめて決めたものならその全部、1件ずつなら最後の1件です。 */
export function undoKeys(state: DecisionState): string[] {
  const last = state.log[state.log.length - 1];
  if (last === undefined) return [];
  const batch = state.batches?.[last];
  return batch === undefined ? [last] : state.log.filter((k) => state.batches?.[k] === batch);
}

/** 最後の操作を取り消します。まとめて決めた分は1回でまとめて、1件ずつ決めた分は1件ずつ戻ります。 */
export function undoDecision(state: DecisionState): DecisionState {
  const keys = undoKeys(state);
  return keys.length === 0
    ? state
    : keys.reduce((acc, key) => decideItem(acc, key, undefined), state);
}

export type UseDecisionQueueOptions = {
  /** 出す順に並べた項目のキー。 */
  keys: readonly string[];
  /** 状態を外で持つとき（制御）。onStateChange と組で渡します。 */
  state?: DecisionState;
  /** 状態を部品に任せるとき（非制御）の初めの値。 */
  defaultState?: DecisionState;
  onStateChange?: (state: DecisionState) => void;
};

/** 列の状態と操作。DecisionQueue と一覧（DataTable など）に同じ戻り値を渡すと、どちらで決めても両方に反映されます。 */
export function useDecisionQueue({
  keys,
  state: controlled,
  defaultState = emptyDecisionState,
  onStateChange,
}: UseDecisionQueueOptions) {
  const [own, setOwn] = useState(defaultState);
  const state = controlled ?? own;
  const latest = useRef(state);
  latest.current = state;
  const update = useCallback(
    (fn: (s: DecisionState) => DecisionState) => {
      const next = fn(latest.current);
      latest.current = next;
      if (!controlled) setOwn(next);
      onStateChange?.(next);
    },
    [controlled, onStateChange],
  );
  const snapshot = useMemo(() => getQueueSnapshot(keys, state), [keys, state]);
  return {
    state,
    snapshot,
    /** 項目を決めます。value を undefined にすると未決に戻します。 */
    decide: useCallback(
      (key: string, value: string | undefined) => update((s) => decideItem(s, key, value)),
      [update],
    ),
    /** 複数の項目を同じ値で決めます。 */
    decideMany: useCallback(
      (keys: readonly string[], value: string) => update((s) => decideItems(s, keys, value)),
      [update],
    ),
    /** value で決めた項目のキー。DataTable の selectedIds に渡します。 */
    selected: useCallback((value = 'in') => selectionOf(latest.current, value), []),
    /** 一覧の選択を写します。DataTable の onSelectionChange に渡します。 */
    setSelected: useCallback(
      (ids: readonly string[], value = 'in') => update((s) => applySelection(s, ids, value)),
      [update],
    ),
    /** 項目をあとで回します。 */
    defer: useCallback((key: string) => update((s) => deferItem(s, key)), [update]),
    /** 最後の操作を取り消します（まとめて決めた分はまとめて戻ります）。 */
    undo: useCallback(() => update(undoDecision), [update]),
    /** すべて未決に戻します。 */
    reset: useCallback(() => update(() => emptyDecisionState), [update]),
  };
}
export type DecisionQueueController = ReturnType<typeof useDecisionQueue>;

// ---------------------------------------------------------------------------
// QueueProgress

/** 終わりのある作業の進み具合。「5 / 12 件を確認」と件数で出し、線を添えます。割合だけにはしません。 */
export function QueueProgress({
  done,
  total,
  deferred = 0,
  verb = '確認',
}: {
  /** 決めた件数。 */
  done: number;
  /** 全体の件数。 */
  total: number;
  /** あとで回した件数。1件以上のときだけ横に出します。 */
  deferred?: number;
  /** 件数の後ろに付ける動詞。「5 / 12 件を確認」の「確認」。 */
  verb?: string;
}) {
  const max = Math.max(0, Math.floor(total));
  const value = Math.min(max, Math.max(0, Math.floor(done)));
  return (
    <div className="lv-queue-progress">
      <div className="lv-progress-label">
        <span>
          <span className="lv-mono">{value}</span> / <span className="lv-mono">{max}</span> 件を
          {verb}
        </span>
        {deferred > 0 && (
          <span>
            あとで <span className="lv-mono">{deferred}</span> 件
          </span>
        )}
      </div>
      <ProgressPrimitive.Root
        className="lv-progress"
        value={value}
        max={Math.max(1, max)}
        getValueLabel={() => `${max}件中${value}件を${verb}`}
        aria-label={`${verb}した件数`}
      >
        <ProgressPrimitive.Indicator
          className="lv-progress-indicator"
          style={{ transform: `translateX(-${100 - (max ? (value / max) * 100 : 0)}%)` }}
        />
      </ProgressPrimitive.Root>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ViewSwitch

export type ViewSwitchItem = { value: string; label: string };
const DEFAULT_VIEWS: ViewSwitchItem[] = [
  { value: 'queue', label: '順に見る' },
  { value: 'list', label: '一覧から選ぶ' },
];
/** 同じ項目の見せ方を切り替えます（既定は「順に見る」「一覧から選ぶ」）。中身を2つ持つ Tabs と違い、状態は1つのまま見せ方だけを変えます。矢印キーで移動します。 */
export function ViewSwitch({
  value,
  onValueChange,
  label = '見せ方',
  items = DEFAULT_VIEWS,
}: {
  value: string;
  onValueChange: (value: string) => void;
  /** 切り替えのまとまりの名前。画面には出さず、読み上げに使います。 */
  label?: string;
  /** 選択肢。既定は queue「順に見る」と list「一覧から選ぶ」。言葉で書き、アイコンだけにしません。 */
  items?: ViewSwitchItem[];
}) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      className="lv-view-switch"
      aria-label={label}
      value={value}
      // Pressing the selected item again would leave nothing selected; keep the current view.
      onValueChange={(next) => next && onValueChange(next)}
    >
      {items.map((item) => (
        <ToggleGroupPrimitive.Item
          key={item.value}
          value={item.value}
          className="lv-view-switch-item"
        >
          {item.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}

// ---------------------------------------------------------------------------
// DecisionQueue

export type QueueChoice = {
  /** DecisionState.decisions に入る値。 */
  value: string;
  /** ボタンの言葉（「もらう」）。済みの積みにも出ます。 */
  label: string;
  /** 近道のキー（1文字、「Y」）。列の中にフォーカスがあるときだけ効きます。 */
  shortcut?: string;
  /** 既定は、最初の選択肢が 'primary'、ほかが 'secondary'。 */
  variant?: 'primary' | 'secondary' | 'danger';
};

export type DecisionQueueProps<T> = {
  /** 出す順（システムが決めた順）に並べた項目。 */
  items: readonly T[];
  getKey: (item: T) => string;
  /** 項目の短い名前。読み上げ・済みの積み・このあとの一覧に使います。 */
  getLabel: (item: T) => string;
  /** 今の項目の中身。 */
  renderItem: (item: T) => ReactNode;
  /** useDecisionQueue の戻り値。一覧の見せ方にも同じものを渡します。 */
  queue: DecisionQueueController;
  /** 判断の選択肢。2つか3つにします（「もらう」「もらわない」）。 */
  choices: QueueChoice[];
  /** 列の名前。読み上げに使います（「公開前の確認」）。 */
  label: string;
  /** 並び順の決め方。列の上に出します（「公開前に確かめるものから順に出します」）。 */
  order?: string;
  /** 今の項目が出てきた理由（「値に秘密が含まれています」）。カードの上に出します。 */
  reason?: (item: T) => string | undefined;
  /** 「あとで」のボタンの言葉。 */
  deferLabel?: string;
  /** 「あとで」の近道のキー。 */
  deferShortcut?: string;
  /** 1つ戻すの近道のキー。 */
  undoShortcut?: string;
  /** 「このあと」に名前を出す件数。残りは「ほか8件」と数で示します。 */
  previewCount?: number;
  /** 進み具合の動詞（「5 / 12 件を確認」の「確認」）。 */
  verb?: string;
  /** 終わりの見出し。 */
  endTitle?: string;
  /** 終わりに置く操作（「書き出す」など）。次の作業へは利用者が選んで移ります。 */
  endAction?: ReactNode;
  /**
   * まとめて決める近道。label は根拠を言葉で書きます（「待機中のもの」）。残りの未決のうち match に当たるものが2件以上あるとき、
   * 「残りの待機中のもの 3 件をまとめて見送る」のボタンを出します。押したあとも、1件ずつ決め直せます。
   */
  bulk?: QueueBulk<T>;
  /** true で、描いたときに今の項目（終わっていれば終わりの表示）へフォーカスを移します。一覧から「順に見る」へ切り替えたときに使います。 */
  autoFocus?: boolean;
};

export type QueueBulk<T> = {
  /** まとめる根拠。「残りの〇〇 3 件」の〇〇に入ります。 */
  label: string;
  match: (item: T) => boolean;
  /** まとめて決める値（choices の value）。 */
  value: string;
};

const typing = (target: EventTarget) =>
  target instanceof Element &&
  !!target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])');

/**
 * 1件ずつ判断する列（タイムラインの見せ方）。次に見る項目を1件だけ大きく出し、件数と進み具合を常に見せ、すべて決めたら「すべて確認しました」で止まります。時間で次へ進むことはありません。
 * 判断はボタンが先で、近道のキー（既定は選択肢の shortcut、あとで L、1つ戻す Z）は列の中にフォーカスがあるときだけ効きます。入力欄の中・IME の変換中・修飾キー付きでは反応しません。決めたらフォーカスは次の項目へ移ります。
 */
export function DecisionQueue<T>({
  items,
  getKey,
  getLabel,
  renderItem,
  queue,
  choices,
  label,
  order,
  reason,
  deferLabel = 'あとで',
  deferShortcut = 'L',
  undoShortcut = 'Z',
  previewCount = 3,
  verb = '確認',
  endTitle = 'すべて確認しました',
  endAction,
  bulk,
  autoFocus = false,
}: DecisionQueueProps<T>) {
  const { snapshot, state } = queue;
  const byKey = useMemo(() => new Map(items.map((item) => [getKey(item), item])), [items, getKey]);
  const choiceOf = (value: string) => choices.find((c) => c.value === value);
  const current = snapshot.current === undefined ? undefined : byKey.get(snapshot.current);
  const titleId = useId();
  const cardRef = useRef<HTMLElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const moved = useRef(autoFocus);
  // What the last action did, read out before the position of the next item (WCAG 4.1.3).
  const note = useRef('');
  const bulkId = useId();
  const [announcement, setAnnouncement] = useState('');
  const doneCount = snapshot.done.length;
  const deferredCount = state.deferred.filter(
    (k) => byKey.has(k) && !Object.hasOwn(state.decisions, k),
  ).length;

  // After a decision the next item (or the end) takes focus, so focus never drops to the body.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    if (current) {
      cardRef.current?.focus({ preventScroll: true });
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      cardRef.current?.scrollIntoView?.({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
      const position = Math.min(doneCount + 1, snapshot.total);
      setAnnouncement(
        `${note.current}${snapshot.total}件中${position}件目：${getLabel(current)}${snapshot.currentDeferred ? '（あとで回した項目）' : ''}`,
      );
    } else {
      endRef.current?.focus({ preventScroll: true });
      setAnnouncement(`${note.current}${endTitle}`);
    }
    note.current = '';
  });

  const act = (fn: () => void, said = '') => {
    moved.current = true;
    note.current = said;
    fn();
  };
  // One shape for every result: 「名前」を「選択肢」にしました / 3件を「選択肢」にしました.
  const nameOf = (key: string) => {
    const item = byKey.get(key);
    return item === undefined ? key : `「${getLabel(item)}」`;
  };
  const what = (keys: readonly string[]) =>
    keys.length === 1 ? nameOf(keys[0]) : `${keys.length}件`;
  const decide = (key: string, value: string | undefined) =>
    act(
      () => queue.decide(key, value),
      value === undefined
        ? `${nameOf(key)}を未決に戻しました。`
        : `${nameOf(key)}を「${choiceOf(value)?.label ?? value}」にしました。`,
    );
  const defer = (key: string) => act(() => queue.defer(key), `${nameOf(key)}をあとに回しました。`);
  const undo = () => {
    const keys = undoKeys(state);
    if (keys.length) act(queue.undo, `${what(keys)}を未決に戻しました。`);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.nativeEvent.isComposing || typing(e.target)) return;
    const key = e.key.toLowerCase();
    const same = (k?: string) => !!k && k.toLowerCase() === key;
    const choice = choices.find((c) => same(c.shortcut));
    if (choice && snapshot.current !== undefined) decide(snapshot.current, choice.value);
    else if (same(deferShortcut) && snapshot.current !== undefined) defer(snapshot.current);
    else if (same(undoShortcut) && state.log.length > 0) undo();
    else return;
    e.preventDefault();
  };

  const next = [...snapshot.upcoming, ...snapshot.deferred];
  const shown = next.slice(0, Math.max(0, previewCount));
  const deferredSet = new Set(state.deferred);
  const shortcutHint = (shortcut?: string) =>
    shortcut && (
      <span aria-hidden className="lv-queue-key">
        <Kbd>{shortcut.toUpperCase()}</Kbd>
      </span>
    );
  const remaining = snapshot.current === undefined ? [] : [snapshot.current, ...next];
  const bulkKeys = bulk
    ? remaining.filter((k) => {
        const item = byKey.get(k);
        return item !== undefined && bulk.match(item);
      })
    : [];
  const bulkChoice = bulk && choiceOf(bulk.value);
  const counts = choices.map((c) => ({
    label: c.label,
    count: snapshot.done.filter((d) => d.value === c.value).length,
  }));

  return (
    <section className="lv-queue" aria-label={label} onKeyDown={onKeyDown}>
      {order && <p className="lv-queue-order">{order}</p>}
      <QueueProgress done={doneCount} total={snapshot.total} deferred={deferredCount} verb={verb} />

      {snapshot.done.length > 0 && (
        <ol className="lv-queue-done" aria-label="決めた項目">
          {snapshot.done.map(({ key, value }) => {
            const item = byKey.get(key);
            const choice = choiceOf(value);
            if (!item) return null;
            return (
              <li key={key}>
                <button
                  type="button"
                  className="lv-queue-done-item"
                  data-value={value}
                  onClick={() => decide(key, undefined)}
                >
                  <span className="lv-queue-done-mark">{choice?.label ?? value}</span>
                  <span className="lv-queue-done-label">{getLabel(item)}</span>
                  <span className="lv-sr-only">（押すと決め直します）</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {current !== undefined && snapshot.current !== undefined ? (
        <article
          key={snapshot.current}
          ref={cardRef}
          className="lv-queue-card"
          tabIndex={-1}
          aria-labelledby={titleId}
          data-deferred={snapshot.currentDeferred || undefined}
        >
          <header className="lv-queue-card-header">
            <p className="lv-queue-reason">
              {snapshot.currentDeferred
                ? `あとで回した項目です${snapshot.deferred.length === 0 && snapshot.upcoming.length === 0 ? '（残りはこれだけ）' : ''}`
                : reason?.(current)}
            </p>
            <h3 className="lv-queue-card-title" id={titleId}>
              <span className="lv-sr-only">
                {snapshot.total}件中{Math.min(doneCount + 1, snapshot.total)}件目：
              </span>
              {getLabel(current)}
            </h3>
          </header>
          <div className="lv-queue-card-body">{renderItem(current)}</div>
          <div className="lv-queue-actions">
            {choices.map((choice, i) => (
              <Button
                key={choice.value}
                variant={choice.variant ?? (i === 0 ? 'primary' : 'secondary')}
                aria-keyshortcuts={choice.shortcut?.toUpperCase()}
                onClick={() => decide(snapshot.current!, choice.value)}
              >
                {choice.label}
                {shortcutHint(choice.shortcut)}
              </Button>
            ))}
            <Button
              variant="ghost"
              aria-keyshortcuts={deferShortcut.toUpperCase()}
              onClick={() => defer(snapshot.current!)}
            >
              {deferLabel}
              {shortcutHint(deferShortcut)}
            </Button>
            {state.log.length > 0 && (
              <Button
                variant="ghost"
                className="lv-queue-undo"
                aria-keyshortcuts={undoShortcut.toUpperCase()}
                onClick={undo}
              >
                1つ戻す
                {shortcutHint(undoShortcut)}
              </Button>
            )}
          </div>
        </article>
      ) : (
        <div ref={endRef} className="lv-queue-end" tabIndex={-1}>
          <h3>{endTitle}</h3>
          <p>
            {counts.map((c) => `${c.label} ${c.count} 件`).join('、')}
            。決め直すときは、上に並んだ項目を押してください。
          </p>
          {endAction}
        </div>
      )}

      {bulk && bulkKeys.length > 1 && (
        <div className="lv-queue-bulk">
          <Button
            size="sm"
            aria-describedby={bulkId}
            onClick={() =>
              act(
                () => queue.decideMany(bulkKeys, bulk.value),
                `${what(bulkKeys)}を「${bulkChoice?.label ?? bulk.value}」にしました。`,
              )
            }
          >
            残りの{bulk.label} <span className="lv-mono">{bulkKeys.length}</span> 件をまとめて
            {bulkChoice?.label ?? bulk.value}
          </Button>
          {/* Which items the shortcut takes, before it is pressed. */}
          <p className="lv-queue-bulk-items" id={bulkId}>
            対象：
            {bulkKeys
              .slice(0, Math.max(1, previewCount))
              .map((k) => getLabel(byKey.get(k)!))
              .join('、')}
            {bulkKeys.length > Math.max(1, previewCount) &&
              `、ほか ${bulkKeys.length - Math.max(1, previewCount)} 件`}
            {snapshot.current !== undefined &&
              bulkKeys.includes(snapshot.current) &&
              '（今の項目を含む）'}
          </p>
        </div>
      )}

      {current !== undefined && next.length > 0 && (
        <div className="lv-queue-next">
          <p className="lv-queue-next-title">このあと</p>
          <ol aria-label="このあと出る項目">
            {shown.map((key) => {
              const item = byKey.get(key);
              return (
                item && (
                  <li key={key}>
                    {getLabel(item)}
                    {deferredSet.has(key) && <span className="lv-queue-next-note">あとで回し</span>}
                  </li>
                )
              );
            })}
            {next.length > shown.length && (
              <li className="lv-queue-next-more">ほか {next.length - shown.length} 件</li>
            )}
          </ol>
        </div>
      )}

      <div className="lv-sr-only" role="status">
        {announcement}
      </div>
    </section>
  );
}
