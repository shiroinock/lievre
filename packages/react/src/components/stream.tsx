import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { Button } from './primitives';
import { cx } from './system';

// ---------------------------------------------------------------------------
// New items: held back until the person takes them in.

/**
 * 途中で増える項目を、利用者が取り込むまで列に混ぜないためのフック。描いた時点の項目を「見せる項目」にし、あとから増えた項目は newItems に分けておきます。
 * accept() で取り込みます。消えた項目は、取り込みを待たずに見せる項目から外れます。
 */
export function useNewItems<T>(items: readonly T[], getKey: (item: T) => string) {
  const [accepted, setAccepted] = useState(() => new Set(items.map(getKey)));
  const shown = useMemo(
    () => items.filter((item) => accepted.has(getKey(item))),
    [items, accepted, getKey],
  );
  const newItems = useMemo(
    () => items.filter((item) => !accepted.has(getKey(item))),
    [items, accepted, getKey],
  );
  const latest = useRef(items);
  latest.current = items;
  const accept = useCallback(
    () =>
      setAccepted((prev) => {
        const next = new Set(prev);
        for (const item of latest.current) next.add(getKey(item));
        return next;
      }),
    [getKey],
  );
  return {
    /** 見せる項目（取り込んだもの）。DecisionQueue や一覧にはこれを渡します。 */
    items: shown,
    /** まだ取り込んでいない、新しく増えた項目。 */
    newItems,
    /** 新しい項目を取り込みます。 */
    accept,
  };
}

/**
 * 新しく増えた項目の知らせ。「新しく 3 件あります」と出し、利用者が押すまで列にも件数にも混ぜません。
 * 知らせは role="status" で、件数が変わったときだけ読み上げます。押したあとは「3 件を列に加えました」と残し、フォーカスをこの知らせへ移すので、フォーカスを見失いません。
 */
export function NewItemsNotice({
  count,
  onAccept,
  actionLabel = '列に加える',
}: {
  /** まだ取り込んでいない件数。0 のときは何も見せません。 */
  count: number;
  /** 取り込むときに呼びます（useNewItems の accept）。 */
  onAccept: () => void;
  /** ボタンの言葉。 */
  actionLabel?: string;
}) {
  const [added, setAdded] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const focusAfter = useRef(false);
  const pending = Math.max(0, Math.floor(count));
  useEffect(() => {
    if (pending > 0) setAdded(0);
  }, [pending]);
  useEffect(() => {
    if (!focusAfter.current) return;
    focusAfter.current = false;
    box.current?.focus();
  });
  const message =
    pending > 0 ? `新しく ${pending} 件あります` : added > 0 ? `${added} 件を列に加えました` : '';
  return (
    <div
      ref={box}
      className={cx('lv-new-items', !message && 'lv-sr-only')}
      data-state={pending > 0 ? 'pending' : 'added'}
      tabIndex={-1}
    >
      <p className="lv-new-items-text" role="status">
        {message}
      </p>
      {pending > 0 && (
        <Button
          size="sm"
          onClick={() => {
            setAdded(pending);
            focusAfter.current = true;
            onAccept();
          }}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Things that move on a timer: they can always be stopped (WCAG 2.2.2).

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * 時間で進む動き（自動の更新・切り替え）のためのフック。interval ミリ秒ごとに onTick を呼びます。
 * 動きを減らす設定では、最初から止めた状態で始めます。画面が見えていないあいだ（別のタブ）は呼びません。止める操作は PauseControl に渡します。
 */
export function useAutoAdvance({
  interval,
  onTick,
  defaultPaused,
}: {
  /** 呼ぶ間隔（ミリ秒）。 */
  interval: number;
  onTick: () => void;
  /** 初めに止めておくか。省くと、動きを減らす設定のときだけ止めて始めます。 */
  defaultPaused?: boolean;
}) {
  const [paused, setPaused] = useState(() => defaultPaused ?? prefersReducedMotion());
  const tick = useRef(onTick);
  tick.current = onTick;
  useEffect(() => {
    if (paused || !(interval > 0)) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') tick.current();
    }, interval);
    return () => window.clearInterval(id);
  }, [paused, interval]);
  return { paused, setPaused };
}

/**
 * 時間で進む動きを止める・再開する操作。何が動いているかを label に書き、今の状態を言葉で示します（「自動で更新しています」「止めています」）。
 * 自動で流す・切り替える・更新するものには必ず添えます（WCAG 2.2.2）。DecisionQueue は時間で進まないので要りません。
 */
export function PauseControl({
  paused,
  onPausedChange,
  label,
  runningText = '自動で更新しています',
  pausedText = '止めています',
}: {
  paused: boolean;
  onPausedChange: (paused: boolean) => void;
  /** 何の動きか（「数値の自動更新」）。まとまりの名前として読み上げます。 */
  label: string;
  /** 動いているときの言葉。 */
  runningText?: string;
  /** 止めているときの言葉。 */
  pausedText?: string;
}) {
  return (
    <div className="lv-pause-control" role="group" aria-label={label}>
      <Button
        size="sm"
        icon={paused ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />}
        onClick={() => onPausedChange(!paused)}
      >
        {paused ? '再開する' : '止める'}
      </Button>
      <span className="lv-pause-control-state" role="status">
        {paused ? pausedText : runningText}
      </span>
    </div>
  );
}
