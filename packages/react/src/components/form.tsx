import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { Check, CircleX } from 'lucide-react';
import { describedBy, FieldMessages, RequiredMark } from './field-parts';
import { cx } from './system';
import { Stack } from './foundation';

/** Field の children に渡す、入力の要素に付ける属性。 */
export type FieldControlProps = {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  required?: boolean;
};
export type FieldProps = {
  /** 見える名前。入力と label で結びます。placeholder の代わりにはしません。 */
  label: string;
  /** 補助文。入力の下に出し、aria-describedby で結びます。 */
  hint?: string;
  /** エラー文。補助文の下に記号を添えて出し、aria-invalid と aria-describedby を付けます。補助文は消しません。 */
  error?: string;
  /** 必須の入力。ラベルの横に「必須」の文字を出し、入力に required を付けます。読み上げでは入力の required が「必須」と伝えるので、文字は重ねて読みません。 */
  required?: boolean;
  /** 入力の id。省くと部品が作ります。ErrorSummary から入力へ移るときは、ここで決めた id を使います。 */
  id?: string;
  /** 入力を描く関数。受け取った属性（id・aria-describedby・aria-invalid・required）を、入力の要素にそのまま渡します。`{(control) => <input {...control} className="lv-input" />}` */
  children: (control: FieldControlProps) => ReactNode;
  /** 入力のすぐ下の右端に置く表示（文字数など）。補助文とエラーはこの下に出します。 */
  after?: ReactNode;
};
/** ラベル・補助文・エラー・必須の印と、入力を結ぶ入れ物。TextField・Textarea・Select はこれで組んでいます。lievre にない入力（日付や独自の入力）を同じ形にそろえるときに使います。 */
export function Field({ label, hint, error, required, id: givenId, children, after }: FieldProps) {
  const uid = useId();
  const id = givenId ?? uid;
  return (
    <div className="lv-field">
      <label className="lv-label" htmlFor={id}>
        {label}
        {required && <RequiredMark />}
      </label>
      {children({
        id,
        'aria-describedby': describedBy(id, hint, error),
        'aria-invalid': error ? true : undefined,
        required: required || undefined,
      })}
      {after}
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  );
}

export type FieldsetProps = {
  /** まとまりの名前。legend になり、中の入力すべての名前に先立って読み上げます。 */
  legend: string;
  /** 補助文。中身の下に出し、fieldset に aria-describedby で結びます。 */
  hint?: string;
  /** まとまり全体のエラー文（「1つ以上選んでください」）。記号を添えて出します。 */
  error?: string;
  /** 必須のまとまり。legend の横に「必須」の文字を出し、まとまりの名前と一緒に読み上げます。中の入力の required は、それぞれに付けます。 */
  required?: boolean;
  /** true で中の入力をすべて無効にします。 */
  disabled?: boolean;
  /** 中の入力。姓と名、郵便番号と住所のように、1つの問いに答える入力を入れます。 */
  children: ReactNode;
  className?: string;
};
/** 1つの問いに答える複数の入力のまとまり。`<fieldset>` と `<legend>` で、まとまりの名前を中の入力に添えて読み上げます。 */
export function Fieldset({
  legend,
  hint,
  error,
  required,
  disabled,
  children,
  className,
}: FieldsetProps) {
  const id = useId();
  return (
    <fieldset
      className={cx('lv-fieldset', className)}
      disabled={disabled}
      aria-describedby={describedBy(id, hint, error)}
    >
      <legend className="lv-label">
        {legend}
        {required && <RequiredMark spoken />}
      </legend>
      {children}
      <FieldMessages id={id} hint={hint} error={error} />
    </fieldset>
  );
}

export type RadioOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};
/** ネイティブradioの矢印キー操作・フォーム送信を保つ単一選択。 */
export function RadioGroup({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  disabled = false,
  hint,
  error,
  required = false,
  id: givenId,
  orientation = 'vertical',
  variant = 'list',
}: {
  /** まとまりの名前。fieldset の legend になります。 */
  label: string;
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
  /** 補助文。選択肢の下に出し、fieldset に aria-describedby で結びます。 */
  hint?: string;
  /** エラー文。記号を添えて出し、fieldset に aria-describedby で結びます。 */
  error?: string;
  /** legend の横に「必須」の文字を出し、選択肢に required を付けます。 */
  required?: boolean;
  /** 最初の選択肢の id。ErrorSummary からこのまとまりへ移るときに使います。 */
  id?: string;
  /** 'vertical'（既定）は縦に並べ、'horizontal' は横に並べます。「はい・いいえ」など短い選択肢に使い、幅が足りないと折り返します。矢印キーの動きはどちらも同じです。 */
  orientation?: 'vertical' | 'horizontal';
  /** 'list'（既定）は丸と文字を並べ、'card' は選択肢ごとに枠で囲みます。料金の種類のように、選択肢ごとの説明を比べて選ぶときに使います。枠全体が押せて、選んだ枠は線と面の両方で示します。'horizontal' と組み合わせると、幅に合わせて段に並べます。 */
  variant?: 'list' | 'card';
}) {
  const uid = useId();
  return (
    <Fieldset
      className="lv-radio-group"
      legend={label}
      hint={hint}
      error={error}
      required={required}
      disabled={disabled}
    >
      <Stack
        className={cx(variant === 'card' && 'lv-radio-cards')}
        data-orientation={orientation}
        gap={variant === 'card' ? 3 : orientation === 'horizontal' ? 6 : 3}
        direction={orientation === 'horizontal' ? 'row' : 'column'}
      >
        {options.map((o, i) => (
          <label
            className={cx('lv-radio-option', variant === 'card' && 'lv-radio-card')}
            key={o.value}
          >
            <input
              type="radio"
              id={i === 0 && givenId ? givenId : `${uid}-${i}-input`}
              name={name ?? uid}
              value={o.value}
              checked={value === undefined ? undefined : value === o.value}
              defaultChecked={value === undefined ? defaultValue === o.value : undefined}
              onChange={() => onValueChange?.(o.value)}
              disabled={o.disabled}
              required={required}
              aria-labelledby={`${uid}-${i}-label`}
              aria-invalid={!!error || undefined}
              aria-describedby={o.description ? `${uid}-${i}` : undefined}
            />
            <span>
              <span id={`${uid}-${i}-label`}>{o.label}</span>
              {o.description && <small id={`${uid}-${i}`}>{o.description}</small>}
            </span>
          </label>
        ))}
      </Stack>
    </Fieldset>
  );
}

export type CheckboxOption = {
  value: string;
  label: string;
  /** 選択肢の下に出す補足。選択肢に aria-describedby で結びます。 */
  description?: string;
  disabled?: boolean;
};
export type CheckboxGroupProps = {
  /** まとまりの名前。fieldset の legend になります。 */
  label: string;
  options: CheckboxOption[];
  /** 選んでいる値。渡すと外で持ちます。 */
  value?: string[];
  defaultValue?: string[];
  /** 選んだ値が変わったときに、選択肢の並び順で呼びます。 */
  onValueChange?: (value: string[]) => void;
  /** フォームで送るときの名前。選んだ選択肢ごとに、この名前で value を送ります。 */
  name?: string;
  disabled?: boolean;
  /** 補助文。選択肢の下に出し、fieldset に aria-describedby で結びます。 */
  hint?: string;
  /** まとまり全体のエラー文（「1つ以上選んでください」）。記号を添えて出し、選択肢に aria-invalid を付けます。 */
  error?: string;
  /** legend の横に「必須」の文字を出します。「1つ以上」の検査は呼び出す側で行い、error で伝えます。 */
  required?: boolean;
  /** 最初の選択肢の id。ErrorSummary からこのまとまりへ移るときに使います。 */
  id?: string;
};
/** 複数を選べる選択肢のまとまり。1つだけの入り切りは Checkbox、1つを選ぶなら RadioGroup を使います。 */
export function CheckboxGroup({
  label,
  options,
  value,
  defaultValue = [],
  onValueChange,
  name,
  disabled,
  hint,
  error,
  required,
  id: givenId,
}: CheckboxGroupProps) {
  const uid = useId();
  const [inner, setInner] = useState(defaultValue);
  const selected = value ?? inner;
  const toggle = (option: string, on: boolean) => {
    const set = new Set(selected);
    if (on) set.add(option);
    else set.delete(option);
    const next = options.map((o) => o.value).filter((v) => set.has(v));
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  };
  return (
    <Fieldset
      className="lv-checkbox-group"
      legend={label}
      hint={hint}
      error={error}
      required={required}
      disabled={disabled}
    >
      <Stack gap={3}>
        {options.map((o, i) => {
          const id = i === 0 && givenId ? givenId : `${uid}-${i}`;
          return (
            <div className="lv-check-field" key={o.value}>
              <CheckboxPrimitive.Root
                id={id}
                className="lv-checkbox"
                name={name}
                value={o.value}
                checked={selected.includes(o.value)}
                onCheckedChange={(c) => toggle(o.value, c === true)}
                disabled={disabled || o.disabled}
                aria-invalid={!!error || undefined}
                aria-describedby={o.description ? `${id}-hint` : undefined}
              >
                <CheckboxPrimitive.Indicator>
                  <Check size={14} strokeWidth={3} />
                </CheckboxPrimitive.Indicator>
              </CheckboxPrimitive.Root>
              <div>
                <label htmlFor={id} className="lv-check-label">
                  {o.label}
                </label>
                {o.description && (
                  <p className="lv-field-hint" id={`${id}-hint`}>
                    {o.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </Stack>
    </Fieldset>
  );
}
export type ErrorSummaryItem = {
  /** 誤りのある入力の id。Field・TextField などの id、RadioGroup・CheckboxGroup では最初の選択肢の id です。 */
  id: string;
  /** 何をどう直すか（「メールアドレスを入力してください」）。入力の下のエラー文と同じ言葉にします。 */
  message: string;
};
export type ErrorSummaryProps = {
  /** 見出し。既定は「入力の内容を確かめてください」。 */
  title?: string;
  /** 誤りの一覧。入力の並び順に渡します。空なら何も描きません。 */
  errors: ErrorSummaryItem[];
  /** 誤りが0件から1件以上になったとき（送信のあと）、この一覧へフォーカスを移します。既定は true。 */
  autoFocus?: boolean;
};
/** 送信したあとに、誤りをフォームの先頭でまとめて示す一覧。各項目のリンクで、誤りのある入力へフォーカスを移します。入力ごとのエラー文（error）も、あわせて出します。 */
export const ErrorSummary = forwardRef<HTMLDivElement, ErrorSummaryProps>(function ErrorSummary(
  { title = '入力の内容を確かめてください', errors, autoFocus = true },
  ref,
) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => box.current as HTMLDivElement);
  const shown = errors.length > 0;
  const wasShown = useRef(false);
  useEffect(() => {
    // Move focus once, when the errors appear: a second submit with the same errors keeps
    // the reader where they are fixing things.
    if (shown && !wasShown.current && autoFocus) box.current?.focus();
    wasShown.current = shown;
  }, [shown, autoFocus]);
  if (!shown) return null;
  return (
    <div
      ref={box}
      className="lv-alert lv-tone-danger lv-error-summary"
      role="alert"
      tabIndex={-1}
      aria-labelledby={`${id}-title`}
    >
      <CircleX size={20} aria-hidden />
      <div className="lv-alert-content">
        <h2 id={`${id}-title`} className="lv-error-summary-title">
          {title}
        </h2>
        <ul className="lv-error-summary-list">
          {errors.map((error) => (
            <li key={error.id}>
              <a
                href={`#${error.id}`}
                onClick={(event) => {
                  const target = document.getElementById(error.id);
                  if (!target) return;
                  event.preventDefault();
                  target.focus();
                }}
              >
                {error.message}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
});
