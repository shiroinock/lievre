// Dates typed in as year, month and day (the GOV.UK date input pattern). The calendar arithmetic
// is @internationalized/date's; the fields are lievre's own TextFields in a Fieldset.
import { useRef, useState, type FocusEvent } from 'react';
import { CalendarDate, parseDate } from '@internationalized/date';
import { cx } from './system';
import { Fieldset } from './form';
import { TextField } from './primitives';
import { toHalfWidth } from './normalize';
import { formatDate } from './format';

type Parts = { year: string; month: string; day: string };
const EMPTY: Parts = { year: '', month: '', day: '' };

function partsOf(value: string | null | undefined): Parts {
  if (!value) return EMPTY;
  try {
    const date = parseDate(value);
    return { year: String(date.year), month: String(date.month), day: String(date.day) };
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
  if (range.min && date.compare(parseDate(range.min)) < 0)
    return { kind: 'before-min', min: range.min };
  if (range.max && date.compare(parseDate(range.max)) > 0)
    return { kind: 'after-max', max: range.max };
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
  /** 日付（ISO 8601、'2026-11-22'）。未入力や、確かめて通らないあいだは null。渡すと外で持ちます。 */
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
  /** これより前の日を通さない（ISO 8601）。 */
  min?: string;
  /** これより後の日を通さない（ISO 8601）。 */
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
export function DateField({
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
}: DateFieldProps) {
  const [parts, setParts] = useState<Parts>(() =>
    partsOf(value !== undefined ? value : defaultValue),
  );
  const [checked, setChecked] = useState(false);
  // The last value this field reported, to tell a new value from outside apart from our own.
  const reported = useRef<string | null>(value !== undefined ? value : defaultValue);
  if (value !== undefined && value !== reported.current) {
    reported.current = value;
    setParts(partsOf(value));
  }
  const check = checkDate(parts, { min, max });
  const shown = error ?? (checked ? dateCheckMessage(check) : undefined);
  const update = (key: keyof Parts, text: string) => {
    const next = { ...parts, [key]: text };
    setParts(next);
    const result = checkDate(next, { min, max });
    const nextValue = result.kind === 'ok' ? result.value : null;
    if (nextValue !== reported.current) {
      reported.current = nextValue;
      onValueChange?.(nextValue);
    }
  };
  // Check once the focus leaves the three fields, not while moving between them.
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setChecked(true);
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
    <div onBlur={onBlur} className={cx('lv-date-field', className)}>
      <Fieldset legend={label} hint={hint} error={shown} required={required} disabled={disabled}>
        <div className="lv-date-field-parts">
          {field('year', '年', 4, id)}
          {field('month', '月', 2)}
          {field('day', '日', 2)}
        </div>
      </Fieldset>
      {name && <input type="hidden" name={name} value={check.kind === 'ok' ? check.value : ''} />}
    </div>
  );
}
