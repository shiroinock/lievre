// A field for words to search and a field for numbers: lievre's own, on Field and TextField.
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Search, X } from 'lucide-react';
import { cx } from './system';
import { Field } from './form';
import { TextField } from './primitives';
import { toHalfWidth } from './normalize';
import { fromIme } from './ime';

export type SearchFieldProps = {
  /** 見える名前（「取引先を探す」）。placeholder の代わりにはしません。 */
  label: string;
  /** 入っている文字。渡すと外で持ちます。 */
  value?: string;
  /** 外で持たないときの、はじめの文字。 */
  defaultValue?: string;
  /** 文字が変わったときに呼びます。日本語の変換中は呼ばず、確定したときに呼びます（打ちながら絞り込むときに、変換前のかなで絞らないため）。 */
  onValueChange?: (value: string) => void;
  /** Enter で呼びます（前後の空白を除いた文字）。変換を確定する Enter では呼びません。 */
  onSearch?: (value: string) => void;
  /** 欄の中に薄く出す例（「名前か読み」）。ラベルの代わりにはしません。 */
  placeholder?: string;
  /** 補助文。入力の下に出し、aria-describedby で結びます。 */
  hint?: string;
  /** エラー文。補助文の下に記号を添えて出します。 */
  error?: string;
  disabled?: boolean;
  /** フォームで送るときの名前。 */
  name?: string;
  /** input の id。省くと部品が作ります。 */
  id?: string;
  /** 高さは TextField と同じ段です。表の上の絞り込みには 'sm'。 */
  controlSize?: 'sm' | 'md' | 'lg';
  /** 文字を消すボタンの名前。 */
  clearLabel?: string;
};

/**
 * 探す言葉を入れる欄（type="search"、先頭に虫眼鏡）。Enter で onSearch を呼びます。日本語の変換を確定する Enter では呼びません。
 * 文字があるときは右端に消すボタンを出し、Esc でも消します。消したあとも、フォーカスは入力欄に残ります。
 */
export function SearchField({
  label,
  value,
  defaultValue = '',
  onValueChange,
  onSearch,
  placeholder,
  hint,
  error,
  disabled,
  name,
  id,
  controlSize = 'md',
  clearLabel = '文字を消す',
}: SearchFieldProps) {
  // The text shown, converting or not; the caller hears only committed text.
  const [text, setText] = useState(value ?? defaultValue);
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (value !== undefined) setText(value);
  }
  const composing = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const report = (next: string) => onValueChange?.(next);
  const clear = () => {
    setText('');
    report('');
    input.current?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (fromIme(e.nativeEvent)) return;
    if (e.key === 'Enter') onSearch?.(text.trim());
    if (e.key === 'Escape' && text) {
      // The browser's own clearing of a search field would skip onValueChange.
      e.preventDefault();
      clear();
    }
  };
  return (
    <Field {...{ label, hint, error, id }}>
      {(control) => (
        <div className="lv-input-wrap lv-search-field">
          <span className="lv-input-icon" aria-hidden>
            <Search />
          </span>
          <input
            {...control}
            ref={input}
            type="search"
            name={name}
            value={text}
            placeholder={placeholder}
            disabled={disabled}
            // The browser's own suggestions of past searches would cover the results.
            autoComplete="off"
            enterKeyHint="search"
            className={cx(
              'lv-input',
              'lv-input--icon',
              'lv-search-field-input',
              controlSize !== 'md' && `lv-control--${controlSize}`,
            )}
            onChange={(e) => {
              setText(e.target.value);
              if (!composing.current) report(e.target.value);
            }}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={(e) => {
              composing.current = false;
              report(e.currentTarget.value);
            }}
            onKeyDown={onKeyDown}
          />
          {text && !disabled && (
            <button
              type="button"
              className="lv-search-field-clear"
              aria-label={clearLabel}
              // Pressing it keeps the focus in the field.
              onMouseDown={(e) => e.preventDefault()}
              onClick={clear}
            >
              <X size={16} aria-hidden />
            </button>
          )}
        </div>
      )}
    </Field>
  );
}

export type NumberCheck =
  | { kind: 'empty' }
  | { kind: 'not-number' }
  | { kind: 'too-many-decimals'; fractionDigits: number; value: number }
  | { kind: 'below-min'; min: number; value: number }
  | { kind: 'above-max'; max: number; value: number }
  | { kind: 'ok'; value: number };

/** 入れた文字を確かめて数にします。全角の数字・記号と桁区切り（1,234）も受けます。数でない文字や、小数の桁の超え、min・max の外は、その理由を返します。 */
export function checkNumber(
  text: string,
  rules: { min?: number; max?: number; fractionDigits?: number } = {},
): NumberCheck {
  const plain = toHalfWidth(text, { dashes: true }).trim().replace(/,/g, '');
  if (plain === '') return { kind: 'empty' };
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(plain)) return { kind: 'not-number' };
  const value = Number(plain);
  const decimals = plain.split('.')[1]?.length ?? 0;
  const { min, max, fractionDigits } = rules;
  if (fractionDigits !== undefined && decimals > fractionDigits)
    return { kind: 'too-many-decimals', fractionDigits, value };
  if (min !== undefined && value < min) return { kind: 'below-min', min, value };
  if (max !== undefined && value > max) return { kind: 'above-max', max, value };
  return { kind: 'ok', value: Object.is(value, -0) ? 0 : value };
}

/** The value in the same digits and grouping as the field shows it, without rounding it. */
function written(value: number, fractionDigits?: number) {
  return new Intl.NumberFormat('ja-JP', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits ?? 20,
  }).format(value);
}

/** checkNumber の結果を、直し方のわかる文にします。通ったとき（ok）と空（empty）は undefined です。 */
export function numberCheckMessage(check: NumberCheck, unit = '') {
  switch (check.kind) {
    case 'not-number':
      return '数字で入れてください。';
    case 'too-many-decimals':
      return check.fractionDigits === 0
        ? '小数ではなく、整数で入れてください。'
        : `小数は${check.fractionDigits}桁までで入れてください。`;
    case 'below-min':
      return `${written(check.min)}${unit}以上の数を入れてください。`;
    case 'above-max':
      return `${written(check.max)}${unit}以下の数を入れてください。`;
    default:
      return undefined;
  }
}

export type NumberFieldProps = {
  /** 見える名前（「数量」「金額」）。 */
  label: string;
  /** 数。渡すと外で持ちます。未入力や、確かめて通らないあいだは null。 */
  value?: number | null;
  /** 外で持たないときの、はじめの数。 */
  defaultValue?: number | null;
  /** 確かめて通る数になったとき、またはそうでなくなったとき（null）に呼びます。 */
  onValueChange?: (value: number | null) => void;
  /** これより小さい数を通しません。↓ もここで止まります。 */
  min?: number;
  /** これより大きい数を通しません。↑ もここで止まります。 */
  max?: number;
  /** ↑・↓ で増やす・減らす幅。省くと矢印では変わりません。 */
  step?: number;
  /** 小数の桁。決めると、それより多い桁を通さず、離れたときにその桁まで0を埋めて出します（1.5 → 1.50）。0 で整数だけ。 */
  fractionDigits?: number;
  /** 数の後ろに出す単位（「円」「個」）。値には含めず、読み上げでは入力と結びます。 */
  unit?: string;
  /** 補助文（「1から99まで」）。 */
  hint?: string;
  /** エラー文。渡すと、部品が確かめた文の代わりに出します。 */
  error?: string;
  /** ラベルの横に「必須」の文字を出し、入力に required を付けます。空のときに文を出すのは呼び出す側です（error で伝えます）。 */
  required?: boolean;
  disabled?: boolean;
  /** フォームで送るときの名前。確かめて通った数を、桁区切りのない形（1234.5）で送ります。 */
  name?: string;
  /** input の id。 */
  id?: string;
  /** 入る文字の数（半角で数えます）。入力欄の幅をこの文字数に合わせます。 */
  chars?: number;
  /** 高さは TextField と同じ段です。 */
  controlSize?: 'sm' | 'md' | 'lg';
  /** 欄の中に薄く出す例。ラベルや単位の代わりにはしません。 */
  placeholder?: string;
};

/**
 * 数を入れる欄。数字は等幅で、全角の数字・記号も受け、離れると半角に直して桁区切りの書式（1,234.5）にします。
 * step を決めると ↑・↓ で増減し、min・max で止まります。数でない文字・小数の桁の超え・min と max の外は、離れたときに直し方のわかる文を出し、値は null にします。
 * type="number" は使いません（ホイールで値が変わる・全角を受けない・読み上げが揃わないため）。
 */
export function NumberField({
  label,
  value,
  defaultValue = null,
  onValueChange,
  min,
  max,
  step,
  fractionDigits,
  unit,
  hint,
  error,
  required,
  disabled,
  name,
  id,
  chars,
  controlSize,
  placeholder,
}: NumberFieldProps) {
  const start = value !== undefined ? value : defaultValue;
  const [text, setText] = useState(start === null ? '' : written(start, fractionDigits));
  const [checked, setChecked] = useState(false);
  const [seen, setSeen] = useState(value);
  const [reported, setReported] = useState<number | null>(start);
  if (value !== seen) {
    setSeen(value);
    if (value !== undefined && value !== reported) {
      setReported(value);
      setText(value === null ? '' : written(value, fractionDigits));
    }
  }
  const rules = { min, max, fractionDigits };
  const check = checkNumber(text, rules);
  const valid = check.kind === 'ok' ? check.value : null;
  // What the field holds may not pass without any typing: a starting value or one from outside
  // beyond min, max or the decimals, or a bound that moves. Tell the caller then too.
  useEffect(() => {
    if (valid !== reported) {
      setReported(valid);
      onValueChange?.(valid);
    }
    // onValueChange follows; a new function each render must not report again.
  }, [valid, reported]);
  const report = (next: string) => {
    const result = checkNumber(next, rules);
    const nextValue = result.kind === 'ok' ? result.value : null;
    if (nextValue !== reported) {
      setReported(nextValue);
      onValueChange?.(nextValue);
    }
  };
  const write = (next: string) => {
    setText(next);
    report(next);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!step || fromIme(e.nativeEvent)) return;
    const up = e.key === 'ArrowUp';
    if (!up && e.key !== 'ArrowDown') return;
    e.preventDefault();
    // From the number typed, even one that does not pass (150 over a max of 100 steps down to
    // 100); from min, or 0, only when nothing readable is there.
    const base = 'value' in check ? check.value : (min ?? 0);
    // Round to the decimals of the step and of the number (0.1 + 0.2 is 0.30000000000000004),
    // never fewer than either: 12.5 steps by 1 to 13.5.
    const decimals = (n: number) => String(n).split('.')[1]?.length ?? 0;
    const places = Math.max(decimals(step), decimals(base), fractionDigits ?? 0);
    let next = Number((base + (up ? step : -step)).toFixed(places));
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    write(written(next, fractionDigits));
  };
  const shown = error ?? (checked ? numberCheckMessage(check, unit) : undefined);
  return (
    <>
      <TextField
        label={label}
        hint={hint}
        error={shown}
        required={required}
        disabled={disabled}
        id={id}
        chars={chars}
        controlSize={controlSize}
        placeholder={placeholder}
        suffix={unit}
        mono
        value={text}
        // Phone number pads have no minus sign: they only fit a field that takes no negative.
        inputMode={
          min !== undefined && min >= 0 ? (fractionDigits === 0 ? 'numeric' : 'decimal') : undefined
        }
        autoComplete="off"
        onChange={(e) => write(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          setChecked(true);
          // Written back in the field's own form once it passes: 1234.5 → 1,234.5.
          if (check.kind === 'ok') setText(written(check.value, fractionDigits));
        }}
      />
      {name && (
        <input
          type="hidden"
          name={name}
          value={check.kind === 'ok' ? String(check.value) : ''}
          disabled={disabled}
        />
      )}
    </>
  );
}
