// Dates typed in as year, month and day (the GOV.UK date input pattern). The calendar arithmetic
// is @internationalized/date's; the fields are lievre's own TextFields in a Fieldset.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CalendarDate, parseDate } from '@internationalized/date';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { CalendarDays } from 'lucide-react';
import { cx, PortalSurface } from './system';
import { Calendar } from './calendar';
import { Fieldset } from './form';
import { IconButton, TextField } from './primitives';
import { toHalfWidth } from './normalize';
import { formatDate } from './format';
import { readBound } from './date-bound';

type Parts = { year: string; month: string; day: string };
const EMPTY: Parts = { year: '', month: '', day: '' };

function partsOf(value: string | null | undefined): Parts {
  if (!value) return EMPTY;
  try {
    const date = parseDate(value);
    // The year keeps four digits (0999), as checkDate asks for them.
    return {
      year: String(date.year).padStart(4, '0'),
      month: String(date.month),
      day: String(date.day),
    };
  } catch {
    return EMPTY;
  }
}

export type DateCheck =
  | { kind: 'empty' }
  | { kind: 'partial' }
  | { kind: 'not-number' }
  | { kind: 'no-such-day'; year: number; month: number; day: number }
  | { kind: 'before-min'; min: string }
  | { kind: 'after-max'; max: string }
  | { kind: 'ok'; value: string };

/** 年・月・日の文字を確かめ、ISO 8601 の日付（'2026-11-22'）にします。全角の数字も受けます。存在しない日（2月30日）や、min・max の外は、その理由を返します。 */
export function checkDate(
  parts: { year: string; month: string; day: string },
  range: { min?: string; max?: string } = {},
): DateCheck {
  const raw = [parts.year, parts.month, parts.day].map((p) => toHalfWidth(p).trim());
  if (raw.every((p) => p === '')) return { kind: 'empty' };
  if (raw.some((p) => p === '')) return { kind: 'partial' };
  if (!/^\d{4}$/.test(raw[0]) || raw.slice(1).some((p) => !/^\d{1,2}$/.test(p)))
    return { kind: 'not-number' };
  const [year, month, day] = raw.map(Number);
  if (year < 1) return { kind: 'not-number' };
  // CalendarDate clamps what does not exist (2月30日 → 2月28日); a changed field means no such day.
  const date = new CalendarDate(year, month, day);
  if (month < 1 || date.month !== month || date.day !== day)
    return { kind: 'no-such-day', year, month, day };
  const min = readBound(range.min);
  const max = readBound(range.max);
  if (min && date.compare(min) < 0) return { kind: 'before-min', min: min.toString() };
  if (max && date.compare(max) > 0) return { kind: 'after-max', max: max.toString() };
  return { kind: 'ok', value: date.toString() };
}

/** 確かめた結果を、直し方のわかる文にします。DateField が出す文と同じです。 */
export function dateCheckMessage(check: DateCheck): string | undefined {
  switch (check.kind) {
    case 'partial':
      return '年・月・日をすべて入れてください。';
    case 'not-number':
      return '年は4桁、月と日は数字で入れてください。';
    case 'no-such-day':
      return `${check.year}年${check.month}月${check.day}日はありません。日付を確かめてください。`;
    case 'before-min':
      return `${formatDate(check.min)}以降の日付を入れてください。`;
    case 'after-max':
      return `${formatDate(check.max)}以前の日付を入れてください。`;
    default:
      return undefined;
  }
}

export type DateFieldProps = {
  /** 問いの名前（「生年月日」）。年・月・日の3つの欄をまとめる legend になります。 */
  label: string;
  /** 日付（'2026-11-22' の形）。未入力や、確かめて通らないあいだは null。渡すと外で持ちます。空を '' で持っても null と同じに扱います。打っている途中の欄を外から空にするときは、key を変えて作り直します（null から null では変わったことが分からないため）。 */
  value?: string | null;
  /** 外で持たないときの、はじめの日付。 */
  defaultValue?: string | null;
  /** 確かめて通る日付になったとき、またはそうでなくなったとき（null）に呼びます。打っている途中の文字では呼びません。 */
  onValueChange?: (value: string | null) => void;
  /** 補助文（「例：1990 4 1」）。欄の下に出し、まとまりに aria-describedby で結びます。 */
  hint?: string;
  /** エラー文。渡すと、部品が確かめた文の代わりに出します。 */
  error?: string;
  /** ラベルの横に「必須」の文字を出し、3つの欄に aria-required を付けます。 */
  required?: boolean;
  disabled?: boolean;
  /** これより前の日を通さない（'2026-12-01' の形。日時の文字なら日付の部分を使い、読めない文字は無視します）。 */
  min?: string;
  /** これより後の日を通さない（'2026-12-31' の形。日時の文字なら日付の部分を使い、読めない文字は無視します）。 */
  max?: string;
  /** フォームで送るときの名前。確かめて通った日付を隠した入力で送ります。 */
  name?: string;
  /** 年の欄の id。ErrorSummary から移るときは、ここで決めた id を使います。 */
  id?: string;
  /** 'bday' で、ブラウザの自動入力に生年月日（年・月・日）を伝えます。 */
  autoComplete?: 'bday';
  className?: string;
};
/**
 * 年・月・日を3つの欄に直接入れる日付の入力（生年月日・届け出の日など、カレンダーでは選びにくい日）。
 * 数字は等幅で、全角の数字も受け、欄を離れると半角に直します。
 * まとまりを離れたときに、足りない欄・存在しない日（2月30日）・min と max の外を確かめ、直し方のわかる文を出します。
 */
export function DateField({ defaultValue = null, ...props }: DateFieldProps) {
  return <DateFieldBody defaultValue={defaultValue} {...props} />;
}

/** DateField's body; DatePicker puts its calendar button after the day field. */
function DateFieldBody({
  label,
  value,
  defaultValue = null,
  onValueChange,
  hint,
  error,
  required,
  disabled,
  min,
  max,
  name,
  id,
  autoComplete,
  className,
  trailing,
  keeps,
}: DateFieldProps & { trailing?: ReactNode; keeps?: (active: Element | null) => boolean }) {
  const [parts, setParts] = useState<Parts>(() =>
    partsOf(value !== undefined ? value : defaultValue),
  );
  const [checked, setChecked] = useState(false);
  // The value prop as last seen, and the value this field last reported: a new prop rewrites the
  // fields, unless it is only our own report coming back.
  // A parent may hold "no date" as '' (a form library's empty field): that is the same as null,
  // so our own null coming back as '' leaves the fields being typed in.
  const given = value === '' ? null : value;
  const [seen, setSeen] = useState(given);
  const [reported, setReported] = useState<string | null>(
    given !== undefined ? given : defaultValue || null,
  );
  if (given !== seen) {
    setSeen(given);
    if (given !== undefined && given !== reported) {
      setReported(given);
      setParts(partsOf(given));
    }
  }
  const check = checkDate(parts, { min, max });
  const valid = check.kind === 'ok' ? check.value : null;
  // What the fields hold now may stop passing without any typing: a starting value outside
  // min and max, a bound that moves, or a value from outside that does not pass (while nothing
  // passed before, so valid itself stays null). Tell the caller then too.
  useEffect(() => {
    if (valid !== reported) {
      setReported(valid);
      onValueChange?.(valid);
    }
    // onValueChange follows; a new function each render must not report again.
  }, [valid, reported]);
  const shown = error ?? (checked ? dateCheckMessage(check) : undefined);
  const update = (key: keyof Parts, text: string) => {
    const next = { ...parts, [key]: text };
    setParts(next);
    const result = checkDate(next, { min, max });
    const nextValue = result.kind === 'ok' ? result.value : null;
    if (nextValue !== reported) {
      setReported(nextValue);
      onValueChange?.(nextValue);
    }
  };
  // Check once the focus has settled outside the three fields. Pressing a label, the legend or
  // the gap blurs a field with no relatedTarget before the next field takes the focus, so wait
  // for that rather than reading relatedTarget.
  const group = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const onBlur = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const active = group.current?.ownerDocument.activeElement ?? null;
      // DatePicker's calendar sits in a portal, outside the group, yet still belongs to it.
      if (!group.current?.contains(active) && !keeps?.(active)) setChecked(true);
    }, 0);
  };
  const field = (key: keyof Parts, text: string, chars: number, fieldId?: string) => (
    <TextField
      id={fieldId}
      label={text}
      value={parts[key]}
      onChange={(e) => update(key, e.target.value)}
      inputMode="numeric"
      autoComplete={autoComplete ? `bday-${key}` : undefined}
      chars={chars}
      mono
      halfWidth
      disabled={disabled}
      aria-required={required || undefined}
      aria-invalid={shown ? true : undefined}
    />
  );
  return (
    <div ref={group} onBlur={onBlur} className={cx('lv-date-field', className)}>
      <Fieldset legend={label} hint={hint} error={shown} required={required} disabled={disabled}>
        <div className="lv-date-field-parts">
          {field('year', '年', 4, id)}
          {field('month', '月', 2)}
          {field('day', '日', 2)}
          {trailing}
        </div>
      </Fieldset>
      {name && (
        <input
          type="hidden"
          name={name}
          value={check.kind === 'ok' ? check.value : ''}
          disabled={disabled}
        />
      )}
    </div>
  );
}

export type DatePickerProps = DateFieldProps & {
  /** カレンダーで今日として印を付ける日（'2026-11-22' の形）。省くと端末の今日です。 */
  today?: string;
};
/**
 * 年・月・日の直接入力（DateField）の右に、カレンダーを開くボタンを添えた日付の入力。予約の日・締め切りなど、曜日や近さを見て選ぶ日に使います。
 * 打っても、カレンダーで選んでもかまいません。カレンダーは選んだ日（なければ今日）の月で開き、日を選ぶと欄に書いて閉じ、フォーカスをボタンに戻します。
 * props は DateField と同じで、min・max はカレンダーでも選べない日になります。
 */
export function DatePicker({ defaultValue = null, ...props }: DatePickerProps) {
  return <DatePickerBody defaultValue={defaultValue} {...props} />;
}

/** DatePicker's body; DateRangePicker shows the range in each calendar. */
function DatePickerBody({
  today,
  range,
  defaultValue = null,
  ...props
}: DatePickerProps & { range?: { start?: string | null; end?: string | null } }) {
  const { value, onValueChange, label, min, max, disabled } = props;
  const [inner, setInner] = useState<string | null>(defaultValue);
  const current = value !== undefined ? (value === '' ? null : value) : inner;
  const set = (next: string | null) => {
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  };
  const [open, setOpen] = useState(false);
  const layer = useRef<HTMLDivElement>(null);
  // While the calendar is open, the fields are not checked; nor on the one blur that pressing
  // the button causes. Safari doesn't focus a pressed button (nor a pressed day): the fields
  // blur to the page before the calendar opens. A press that opens nothing (a right click, a
  // touch that turns into a scroll) lets go of that one blur, and the next one checks.
  const holding = useRef(false);
  const pressed = useRef(false);
  const onOpenChange = (next: boolean) => {
    holding.current = next;
    pressed.current = false;
    setOpen(next);
  };
  const keeps = (active: Element | null) => {
    const press = pressed.current;
    pressed.current = false;
    return press || holding.current || !!layer.current?.contains(active);
  };
  return (
    <DateFieldBody
      {...props}
      className={cx('lv-date-picker', props.className)}
      value={current}
      onValueChange={set}
      defaultValue={defaultValue}
      keeps={keeps}
      trailing={
        <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
          <PopoverPrimitive.Trigger asChild>
            <IconButton
              variant="secondary"
              className="lv-date-picker-button"
              label={`${label}をカレンダーから選ぶ`}
              icon={<CalendarDays />}
              disabled={disabled}
              onPointerDown={() => {
                pressed.current = true;
              }}
            />
          </PopoverPrimitive.Trigger>
          <PopoverPrimitive.Portal>
            <PortalSurface>
              <PopoverPrimitive.Content
                ref={layer}
                className="lv-popover lv-date-picker-popover"
                aria-label={`${label}をカレンダーから選ぶ`}
                side="bottom"
                align="end"
                sideOffset={4}
                collisionPadding={8}
                // The focus goes to the chosen day (or today), not to the first button. Here and
                // not in the calendar's own effect: a Dialog around would take back a focus
                // moved before this layer has told it to step aside.
                onOpenAutoFocus={(e) => {
                  e.preventDefault();
                  layer.current
                    ?.querySelector<HTMLElement>('.lv-calendar-day[tabindex="0"]')
                    ?.focus();
                }}
              >
                <Calendar
                  value={current}
                  onValueChange={(next) => {
                    set(next);
                    onOpenChange(false);
                  }}
                  min={min}
                  max={max}
                  today={today}
                  range={range}
                />
              </PopoverPrimitive.Content>
            </PortalSurface>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      }
    />
  );
}

export type DateRange = {
  /** 開始日（'2026-11-22' の形）。未入力や、確かめて通らないあいだは null。 */
  start: string | null;
  /** 終了日（'2026-11-30' の形）。未入力や、確かめて通らないあいだ（開始日より前を含む）は null。 */
  end: string | null;
};
export type DateRangePickerProps = {
  /** 問いの名前（「宿泊の期間」）。開始日と終了日の2つをまとめる legend になります。 */
  label: string;
  /** 期間。渡すと外で持ちます。 */
  value?: DateRange;
  /** 外で持たないときの、はじめの期間。 */
  defaultValue?: DateRange;
  /** 開始日か終了日が、確かめて通る日になったとき、またはそうでなくなったとき（null）に呼びます。 */
  onValueChange?: (value: DateRange) => void;
  /** 開始日の欄の名前。既定は「開始日」。 */
  startLabel?: string;
  /** 終了日の欄の名前。既定は「終了日」。 */
  endLabel?: string;
  /** 補助文。2つの欄の上に出し、まとまりに aria-describedby で結びます。 */
  hint?: string;
  /** エラー文。2つの欄のまとまりに出します（それぞれの欄の確かめは、欄の下に出ます）。 */
  error?: string;
  /** 2つの欄のラベルの横に「必須」の文字を出し、欄に aria-required を付けます。 */
  required?: boolean;
  disabled?: boolean;
  /** 開始日・終了日とも、これより前の日を通さない（'2026-12-01' の形）。 */
  min?: string;
  /** 開始日・終了日とも、これより後の日を通さない（'2026-12-31' の形）。 */
  max?: string;
  /** フォームで送るときの名前。開始日と終了日を、それぞれ隠した入力で送ります。 */
  name?: { start: string; end: string };
  /** カレンダーで今日として印を付ける日（'2026-11-22' の形）。省くと端末の今日です。 */
  today?: string;
  className?: string;
};
/**
 * 開始日と終了日を選ぶ期間の入力。2つの DatePicker を1つの問いにまとめます。予約・絞り込みの期間などに使います。
 * どちらのカレンダーにも開始日から終了日までの期間を示します。終了日は開始日より前にできず、前の日を入れると、直し方のわかる文を出して null にします。
 */
export function DateRangePicker({
  label,
  value,
  defaultValue = { start: null, end: null },
  onValueChange,
  startLabel = '開始日',
  endLabel = '終了日',
  hint,
  error,
  required,
  disabled,
  min,
  max,
  name,
  today,
  className,
}: DateRangePickerProps) {
  const [inner, setInner] = useState<DateRange>(defaultValue);
  const current = value ?? inner;
  // The latest range as of this event, so two changes in one event both land.
  const latest = useRef(current);
  latest.current = current;
  const set = (next: DateRange) => {
    latest.current = next;
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  };
  // The end may not come before the start, nor before min.
  const start = readBound(current.start);
  const low = readBound(min);
  const endMin = start && (!low || start.compare(low) > 0) ? current.start! : min;
  const shared = { required, disabled, max, today, range: current };
  return (
    <Fieldset
      legend={label}
      hint={hint}
      error={error}
      disabled={disabled}
      className={cx('lv-date-range', className)}
    >
      <div className="lv-date-range-parts">
        <DatePickerBody
          {...shared}
          label={startLabel}
          value={current.start}
          min={min}
          name={name?.start}
          onValueChange={(next) => set({ ...latest.current, start: next })}
        />
        <DatePickerBody
          {...shared}
          label={endLabel}
          value={current.end}
          min={endMin}
          name={name?.end}
          onValueChange={(next) => set({ ...latest.current, end: next })}
        />
      </div>
    </Fieldset>
  );
}
