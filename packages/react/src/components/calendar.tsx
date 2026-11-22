// A month as a grid of days (the APG date picker dialog's grid). The calendar arithmetic is
// @internationalized/date's; the grid and its keys are lievre's own.
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import {
  CalendarDate,
  getDayOfWeek,
  getLocalTimeZone,
  startOfMonth,
  today as todayIn,
} from '@internationalized/date';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from './system';
import { IconButton } from './primitives';
import { formatDate } from './format';
import { readBound } from './date-bound';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const WEEKDAY_NAMES = WEEKDAYS.map((d) => `${d}曜日`);

const clamp = (date: CalendarDate, min?: CalendarDate, max?: CalendarDate) =>
  min && date.compare(min) < 0 ? min : max && date.compare(max) > 0 ? max : date;

/** The weeks of a month, Sunday first, with null for the days of the months around it. */
function weeksOf(month: CalendarDate) {
  const first = startOfMonth(month);
  const lead = getDayOfWeek(first, 'ja-JP');
  const days: (CalendarDate | null)[] = Array.from({ length: lead }, () => null);
  for (let day = first; day.month === first.month; day = day.add({ days: 1 })) days.push(day);
  while (days.length % 7) days.push(null);
  return Array.from({ length: days.length / 7 }, (_, i) => days.slice(i * 7, i * 7 + 7));
}

export type CalendarProps = {
  /** 選んだ日（'2026-11-22' の形）。渡すと外で持ちます。選んでいないときは null。 */
  value?: string | null;
  /** 外で持たないときの、はじめに選んでおく日。 */
  defaultValue?: string | null;
  /** 日を選んだときに呼びます（'2026-11-22' の形）。 */
  onValueChange?: (value: string) => void;
  /** これより前の日は選べません（'2026-12-01' の形）。前の月へも、この日の月より前には移りません。 */
  min?: string;
  /** これより後の日は選べません（'2026-12-31' の形）。 */
  max?: string;
  /** 今日として印を付ける日（'2026-11-22' の形）。省くと端末の今日です。 */
  today?: string;
  /** 表の名前。省くと表示している年月（「2026年11月」）です。 */
  label?: string;
  /** 描いたときに、選んだ日（なければ今日）へフォーカスを移します。ポップオーバーの中で開いたときに使います。 */
  autoFocus?: boolean;
  className?: string;
};

/**
 * 月の表から日付を選びます。週は日曜から始まります。
 * 矢印で日、PageUp / PageDown で月、Shift と合わせて年、Home / End で週の端へ移り、Enter か Space で選びます。
 * 今日は下線、選んだ日は塗りで示し、min・max の外の日は薄くして選べなくします（読み上げでも「選べません」と伝えます）。
 */
export function Calendar({
  value,
  defaultValue = null,
  onValueChange,
  min,
  max,
  today,
  label,
  autoFocus = false,
  className,
}: CalendarProps) {
  const [inner, setInner] = useState<string | null>(defaultValue);
  const current = value !== undefined ? value : inner;
  const selected = readBound(current);
  const low = readBound(min);
  const high = readBound(max);
  const now = readBound(today) ?? todayIn(getLocalTimeZone());
  const [focused, setFocused] = useState(() => clamp(selected ?? now, low, high));
  // A new value from outside shows its month.
  const [seen, setSeen] = useState(current);
  if (current !== seen) {
    setSeen(current);
    if (selected) setFocused(clamp(selected, low, high));
  }
  const grid = useRef<HTMLTableElement>(null);
  // Keys move the focus with the focused day; the month buttons and new values don't.
  const follow = useRef(autoFocus);
  useEffect(() => {
    if (!follow.current) return;
    follow.current = false;
    grid.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  }, [focused]);
  const titleId = useId();
  const outside = (day: CalendarDate) =>
    (low && day.compare(low) < 0) || (high && day.compare(high) > 0);
  const move = (next: CalendarDate) => {
    follow.current = true;
    setFocused(clamp(next, low, high));
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTableElement>) => {
    const step: Record<string, () => CalendarDate> = {
      ArrowLeft: () => focused.subtract({ days: 1 }),
      ArrowRight: () => focused.add({ days: 1 }),
      ArrowUp: () => focused.subtract({ weeks: 1 }),
      ArrowDown: () => focused.add({ weeks: 1 }),
      PageUp: () => focused.subtract(e.shiftKey ? { years: 1 } : { months: 1 }),
      PageDown: () => focused.add(e.shiftKey ? { years: 1 } : { months: 1 }),
      Home: () => focused.subtract({ days: getDayOfWeek(focused, 'ja-JP') }),
      End: () => focused.add({ days: 6 - getDayOfWeek(focused, 'ja-JP') }),
    };
    const next = step[e.key];
    if (!next) return;
    e.preventDefault();
    move(next());
  };
  const choose = (day: CalendarDate) => {
    if (outside(day)) return;
    const iso = day.toString();
    setFocused(day);
    if (value === undefined) setInner(iso);
    onValueChange?.(iso);
  };
  const month = startOfMonth(focused);
  // Whether a month has no month before (after) it within min and max.
  const firstMonth = (day: CalendarDate) =>
    !!low && startOfMonth(day).subtract({ days: 1 }).compare(low) < 0;
  const lastMonth = (day: CalendarDate) =>
    !!high && startOfMonth(day).add({ months: 1 }).compare(high) > 0;
  const turn = (target: CalendarDate, ends: (day: CalendarDate) => boolean) => {
    const day = clamp(target, low, high);
    // The button pressed is about to be disabled, and a disabled button drops the focus to
    // the page: hand it to the day in the grid instead.
    if (ends(day)) follow.current = true;
    setFocused(day);
  };
  const title = `${month.year}年${month.month}月`;
  return (
    <div className={cx('lv-calendar', className)}>
      <div className="lv-calendar-header">
        <IconButton
          size="sm"
          label="前の月"
          icon={<ChevronLeft />}
          disabled={firstMonth(month)}
          onClick={() => turn(focused.subtract({ months: 1 }), firstMonth)}
        />
        <div id={titleId} className="lv-calendar-title" aria-live="polite">
          {title}
        </div>
        <IconButton
          size="sm"
          label="次の月"
          icon={<ChevronRight />}
          disabled={lastMonth(month)}
          onClick={() => turn(focused.add({ months: 1 }), lastMonth)}
        />
      </div>
      <table
        ref={grid}
        role="grid"
        className="lv-calendar-grid"
        aria-label={label}
        aria-labelledby={label ? undefined : titleId}
        onKeyDown={onKeyDown}
      >
        <thead>
          <tr>
            {WEEKDAYS.map((day, i) => (
              <th key={day} scope="col" abbr={WEEKDAY_NAMES[i]}>
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeksOf(month).map((week, row) => (
            <tr key={row}>
              {week.map((day, col) => {
                if (!day) return <td key={col} role="gridcell" />;
                const iso = day.toString();
                const isSelected = !!selected && day.compare(selected) === 0;
                const disabled = outside(day);
                return (
                  <td key={col} role="gridcell" aria-selected={isSelected}>
                    <button
                      type="button"
                      className="lv-calendar-day"
                      tabIndex={day.compare(focused) === 0 ? 0 : -1}
                      aria-label={`${formatDate(iso, { weekday: true })}${disabled ? '、選べません' : ''}`}
                      aria-current={day.compare(now) === 0 ? 'date' : undefined}
                      aria-disabled={disabled || undefined}
                      onClick={() => choose(day)}
                      onFocus={() => day.compare(focused) !== 0 && setFocused(day)}
                    >
                      {day.day}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
