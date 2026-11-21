// The state of a one-at-a-time queue, without Ink. The same rules as @lievre/react's queue
// (packages/react/src/components/queue.tsx); packages/react/src/test/queue-parity.test.tsx checks
// that the two give the same answers, so a change to one must be made to the other.

/** 1件ずつ判断する列の状態。 */
export type DecisionState = {
  /** 項目のキー → 決めた値。入っていない項目は未決。 */
  decisions: Record<string, string>;
  /** 決めた順の項目のキー。 */
  log: string[];
  /** 「あとで」に回した順の項目のキー。 */
  deferred: string[];
};

export const emptyDecisionState: DecisionState = { decisions: {}, log: [], deferred: [] };

export type DecisionQueueSnapshot = {
  current: string | undefined;
  currentDeferred: boolean;
  upcoming: string[];
  deferred: string[];
  done: { key: string; value: string }[];
  total: number;
};

/** 列の今の姿。keys は出す順に並べて渡す。 */
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

/** 項目を決める。value が undefined なら未決に戻す。 */
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
  return {
    decisions,
    log,
    deferred: state.deferred.filter((k) => k !== key || value === undefined),
  };
}

/** 項目を「あとで」に回す。 */
export function deferItem(state: DecisionState, key: string): DecisionState {
  const next = decideItem(state, key, undefined);
  return { ...next, deferred: [...next.deferred.filter((k) => k !== key), key] };
}

/** 最後に決めた項目を未決に戻す。 */
export function undoDecision(state: DecisionState): DecisionState {
  const last = state.log[state.log.length - 1];
  return last === undefined ? state : decideItem(state, last, undefined);
}

/** 判断の選択肢。key は1文字（端末ではキーが主な操作になる）。 */
export type QueueChoice = { value: string; label: string; key: string };

export const DEFER_KEY = 'l';
export const UNDO_KEY = 'z';

/**
 * 押されたキーで状態を進める。関係のないキーなら undefined を返す。
 * 端末の画面は列そのものなので、1文字のキーをそのまま使う（入力欄にいるときは呼ばない）。
 */
export function queueKey(
  keys: readonly string[],
  state: DecisionState,
  input: string,
  choices: readonly QueueChoice[],
): DecisionState | undefined {
  const key = input.toLowerCase();
  const { current } = getQueueSnapshot(keys, state);
  const choice = choices.find((c) => c.key.toLowerCase() === key);
  if (choice && current !== undefined) return decideItem(state, current, choice.value);
  if (key === DEFER_KEY && current !== undefined) return deferItem(state, current);
  if (key === UNDO_KEY && state.log.length > 0) return undoDecision(state);
  return undefined;
}
