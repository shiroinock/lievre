import {
  forwardRef,
  useId,
  useLayoutEffect,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import {
  Checkbox as CheckboxPrimitive,
  Switch as SwitchPrimitive,
  Select as SelectPrimitive,
  Tabs as TabsPrimitive,
  Tooltip as TooltipPrimitive,
  Progress as ProgressPrimitive,
} from 'radix-ui';
import {
  Check,
  Minus,
  ChevronDown,
  Loader2,
  Info,
  AlertTriangle,
  CircleCheck,
  CircleX,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { cx, PortalSurface } from './system';
import { Field } from './form';
import { describedBy, FieldMessages, RequiredMark } from './field-parts';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  /** 処理中の表示。押せなくなり、aria-busy が付きます。 */
  loading?: boolean;
  icon?: ReactNode;
};
/** 1つの作業領域に主要操作は原則1つ。loading時は再実行を防ぎます。`type` の既定は 'button' なので、フォームの送信には `type="submit"` を付けます。画面の移動には ActionLink を使います。 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    disabled,
    className,
    children,
    icon,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx('lv-button', `lv-button--${variant}`, `lv-button--${size}`, className)}
    >
      {loading ? <Loader2 className="lv-spin" size={16} aria-hidden /> : icon}
      {children}
    </button>
  );
});

export type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'aria-label'
> & {
  /** 読み上げとツールチップに出す名前。何をするかを言葉で書きます（「閉じる」「行の操作」）。 */
  label: string;
  /** アイコン（lucide-react など）。大きさは size に合わせて部品が決め、aria-hidden も部品が付けます。 */
  icon: ReactNode;
  /** 色は Button と同じです。既定は枠のない 'ghost'。 */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** 'md' は密度の操作の高さ（40 / 32px）、'sm' は 32px、'lg' は 48px の正方形。タッチの画面では 44px まで広げます。 */
  size?: 'sm' | 'md' | 'lg';
  /** false にするとツールチップを出しません。すぐ横に同じ言葉が書いてあるときだけ使います。 */
  tooltip?: boolean;
  /** 処理中の表示。押せなくなり、aria-busy が付きます。 */
  loading?: boolean;
};
/** アイコンだけのボタン。label を読み上げとツールチップの両方に使うので、名前を付け忘れません。 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    label,
    icon,
    variant = 'ghost',
    size = 'md',
    tooltip = true,
    loading = false,
    disabled,
    className,
    type = 'button',
    ...props
  },
  ref,
) {
  const button = (
    <button
      {...props}
      ref={ref}
      type={type}
      aria-label={label}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'lv-icon-button',
        `lv-icon-button--${variant}`,
        `lv-icon-button--${size}`,
        className,
      )}
    >
      <span className="lv-icon-button-icon" aria-hidden>
        {loading ? <Loader2 className="lv-spin" /> : icon}
      </span>
    </button>
  );
  // The tree stays the same while loading, so the button keeps its focus.
  return tooltip ? <Tooltip content={label}>{button}</Tooltip> : button;
});

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
/** 色と文字を併用する状態ラベル。色だけでは状態を表さないため、children（「正常」などの文字）は必須です。 */
export function Badge({
  tone = 'neutral',
  emphasis = 'soft',
  size = 'md',
  dot = false,
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  /** 'neutral' | 'success' | 'warning' | 'danger' | 'info'。Toast の 'error' はここでは 'danger'。 */
  tone?: Tone;
  /** 'soft'（既定）は淡い面に状態の色の文字。'strong' は状態の色で塗り、文字を面の色にします。一覧の中で特に目立たせたい1つだけに使います。 */
  emphasis?: 'soft' | 'strong';
  /** 'md'（既定）は高さ 20px、'sm' は 16px。文字はどちらも 12px で、sm は表のセルやタブの中など行の高さが詰まった場所に使います。 */
  size?: 'sm' | 'md';
  /** 状態を補う丸い印。稼働・接続など、続いている状態に付けます。 */
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      {...props}
      className={cx(
        'lv-badge',
        `lv-tone-${tone}`,
        emphasis === 'strong' && 'lv-badge--strong',
        size === 'sm' && 'lv-badge--sm',
        className,
      )}
    >
      {dot && <span className="lv-status-dot" aria-hidden />}
      {children}
    </span>
  );
}

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'prefix'> & {
  /** 見える名前。input と結びます。placeholder の代わりにはしません。 */
  label: string;
  /** 補助文。入力の下に出し、aria-describedby で入力と結びます。 */
  hint?: string;
  /** エラー文。補助文の下に記号を添えて出し、aria-invalid と aria-describedby を付けます。補助文は消しません。 */
  error?: string;
  /** ラベルの横に「必須」の文字を出し、input に required を付けます。 */
  required?: boolean;
  /** input の id。省くと部品が作ります。ErrorSummary から移るときは、ここで決めた id を使います。 */
  id?: string;
  /** 'md'（既定）は密度の操作の高さ（40 / 32px）、'sm' は 32px、'lg' は 48px。'sm' は表の上の絞り込みなど、密度とは別に小さくしたいときに使います。 */
  controlSize?: 'sm' | 'md' | 'lg';
  /** 入力欄の中の先頭に置くアイコン（虫眼鏡など）。飾りなので読み上げません。意味はラベルに書きます。 */
  icon?: ReactNode;
  /** 入力欄の前に置く言葉（「https://」「¥」など）。入力と aria-describedby で結びます。 */
  prefix?: string;
  /** 入力欄の後ろに置く言葉。単位（「円」「件」「%」）はここに書き、値には含めません。入力と aria-describedby で結びます。 */
  suffix?: string;
};
/** ラベル・補助文・エラーと入力を関連付けた標準入力。readOnly は値を読める見た目のまま、枠を破線にして直せないことを示します（disabled と違い、フォーカスが届き、送信にも含まれます）。 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    label,
    hint,
    error,
    controlSize = 'md',
    id,
    required,
    icon,
    prefix,
    suffix,
    className,
    ...props
  },
  ref,
) {
  return (
    <Field {...{ label, hint, error, id, required }}>
      {(control) => {
        const input = (
          <input
            {...props}
            {...control}
            aria-describedby={joinIds(
              prefix && `${control.id}-prefix`,
              suffix && `${control.id}-suffix`,
              control['aria-describedby'],
              props['aria-describedby'],
            )}
            ref={ref}
            className={cx(
              'lv-input',
              controlSize !== 'md' && `lv-control--${controlSize}`,
              !!icon && 'lv-input--icon',
              className,
            )}
          />
        );
        if (!icon && !prefix && !suffix) return input;
        return (
          <div className="lv-input-group">
            {prefix && (
              <span id={`${control.id}-prefix`} className="lv-input-affix">
                {prefix}
              </span>
            )}
            <div className="lv-input-wrap">
              {icon && (
                <span className="lv-input-icon" aria-hidden>
                  {icon}
                </span>
              )}
              {input}
            </div>
            {suffix && (
              <span id={`${control.id}-suffix`} className="lv-input-affix">
                {suffix}
              </span>
            )}
          </div>
        );
      }}
    </Field>
  );
});
/** 複数行の入力。label・hint・error・required・id の扱いは TextField と同じです。 */
export function Textarea({
  label,
  hint,
  error,
  id,
  required,
  className,
  ...props
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  /** 見える名前。textarea と結びます。 */
  label: string;
  /** 補助文。入力の下に出し、aria-describedby で結びます。 */
  hint?: string;
  /** エラー文。補助文の下に記号を添えて出し、aria-invalid を付けます。 */
  error?: string;
  /** ラベルの横に「必須」の文字を出し、required を付けます。 */
  required?: boolean;
  /** textarea の id。省くと部品が作ります。 */
  id?: string;
}) {
  return (
    <Field {...{ label, hint, error, id, required }}>
      {(control) => (
        <textarea
          {...props}
          {...control}
          aria-describedby={joinIds(control['aria-describedby'], props['aria-describedby'])}
          className={cx('lv-input', 'lv-textarea', className)}
        />
      )}
    </Field>
  );
}
const joinIds = (...ids: (string | undefined)[]) => ids.filter(Boolean).join(' ') || undefined;

export type CheckboxProps = {
  label: string;
  /** 補助文。ラベルの下に出し、aria-describedby で結びます。 */
  hint?: string;
  /** エラー文。記号を添えて出し、aria-invalid と aria-describedby を付けます。 */
  error?: string;
  checked?: boolean | 'indeterminate';
  defaultChecked?: boolean;
  /** 'indeterminate' も来るため、boolean の state には `(c) => setX(c === true)` で渡します。 */
  onCheckedChange?: (checked: boolean | 'indeterminate') => void;
  disabled?: boolean;
  name?: string;
  /** ラベルの横に「必須」の文字を出し、required を付けます（同意の確認など）。 */
  required?: boolean;
  id?: string;
};
/** 1つの入り切り。複数の選択肢をまとめるときは CheckboxGroup を使います。 */
export function Checkbox({ label, hint, error, id: givenId, ...props }: CheckboxProps) {
  const uid = useId();
  const id = givenId ?? uid;
  return (
    <div className="lv-check-field">
      <CheckboxPrimitive.Root
        {...props}
        id={id}
        className="lv-checkbox"
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy(id, hint, error)}
      >
        <CheckboxPrimitive.Indicator>
          {props.checked === 'indeterminate' ? (
            <Minus size={14} strokeWidth={3} />
          ) : (
            <Check size={14} strokeWidth={3} />
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <div>
        <label htmlFor={id} className="lv-check-label">
          {label}
          {props.required && <RequiredMark />}
        </label>
        <FieldMessages id={id} hint={hint} error={error} />
      </div>
    </div>
  );
}
export type SwitchProps = {
  label: string;
  hint?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  /** onChange ではなくこちらを使います。 */
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
};
/** 即時に切り替わる設定。label は部品の中で Switch と結ぶため、id や外の label は使いません。 */
export function Switch({ label, hint, ...props }: SwitchProps) {
  const id = useId();
  return (
    <div className="lv-switch-field">
      <div>
        <label className="lv-check-label" htmlFor={id}>
          {label}
        </label>
        {hint && (
          <p className="lv-field-hint" id={`${id}-hint`}>
            {hint}
          </p>
        )}
      </div>
      <SwitchPrimitive.Root
        {...props}
        id={id}
        className="lv-switch"
        aria-describedby={hint ? `${id}-hint` : undefined}
      >
        <SwitchPrimitive.Thumb className="lv-switch-thumb" />
      </SwitchPrimitive.Root>
    </div>
  );
}

export type SelectOption = { value: string; label: string; disabled?: boolean };
/** 選択肢のまとまり。label は一覧の中に見出しとして出し、中の選択肢の読み上げに添えます。 */
export type SelectOptionGroup = { label: string; options: SelectOption[] };
export type SelectProps = {
  label: string;
  /** 選択肢。子要素（option）では渡しません。`{ label, options }` を混ぜると、見出しの付いたまとまりにします。 */
  options: (SelectOption | SelectOptionGroup)[];
  placeholder?: string;
  /** 未選択は ''。 */
  value?: string;
  defaultValue?: string;
  /** onChange ではなくこちらを使います。 */
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  /** ラベルの横に「必須」の文字を出し、required を付けます。 */
  required?: boolean;
  name?: string;
  /** 補助文。選択の欄の下に出し、aria-describedby で結びます。 */
  hint?: string;
  /** エラー文。記号を添えて出し、aria-invalid と aria-describedby を付けます。 */
  error?: string;
  /** 開くボタンの id。省くと部品が作ります。ErrorSummary から移るときは、ここで決めた id を使います。 */
  id?: string;
  /** 高さは TextField と同じ段です。'md'（既定）は密度の操作の高さ、'sm' は 32px、'lg' は 48px。並べる TextField と同じ値にします。 */
  controlSize?: 'sm' | 'md' | 'lg';
};
function SelectItem({ option }: { option: SelectOption }) {
  return (
    <SelectPrimitive.Item
      value={option.value}
      disabled={option.disabled}
      className="lv-select-item"
    >
      <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="lv-select-indicator">
        <Check size={14} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}
/** 矢印キー・文字検索・Escapeに対応した単一選択。 */
export function Select({
  label,
  options,
  placeholder = '選択してください',
  hint,
  error,
  id,
  controlSize = 'md',
  ...props
}: SelectProps) {
  return (
    <Field {...{ label, hint, error, id, required: props.required }}>
      {({ required: _required, ...control }) => (
        <SelectPrimitive.Root {...props}>
          <SelectPrimitive.Trigger
            {...control}
            className={cx(
              'lv-select-trigger',
              controlSize !== 'md' && `lv-control--${controlSize}`,
            )}
          >
            <SelectPrimitive.Value placeholder={placeholder} />
            <SelectPrimitive.Icon className="lv-select-icon">
              <ChevronDown size={16} />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>
          <SelectPrimitive.Portal>
            <PortalSurface>
              <SelectPrimitive.Content
                position="popper"
                sideOffset={5}
                className="lv-select-content"
                data-size={controlSize}
              >
                <SelectPrimitive.Viewport>
                  {options.map((option, i) =>
                    'options' in option ? (
                      <SelectPrimitive.Group key={`group-${i}`} className="lv-select-group">
                        <SelectPrimitive.Label className="lv-select-label">
                          {option.label}
                        </SelectPrimitive.Label>
                        {option.options.map((item) => (
                          <SelectItem key={item.value} option={item} />
                        ))}
                      </SelectPrimitive.Group>
                    ) : (
                      <SelectItem key={option.value} option={option} />
                    ),
                  )}
                </SelectPrimitive.Viewport>
              </SelectPrimitive.Content>
            </PortalSurface>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
      )}
    </Field>
  );
}

export function Card({
  title,
  eyebrow,
  action,
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { title?: string; eyebrow?: string; action?: ReactNode }) {
  return (
    <section {...props} className={cx('lv-card', className)}>
      {(title || eyebrow || action) && (
        <header className="lv-card-header">
          <div>
            {eyebrow && <div className="lv-eyebrow">{eyebrow}</div>}
            {title && <h2 className="lv-card-title">{title}</h2>}
          </div>
          {action}
        </header>
      )}
      <div className="lv-card-body">{children}</div>
    </section>
  );
}
export type AlertProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  /** 'info'（既定）| 'success' | 'warning' | 'danger' | 'neutral'。'danger' は role="alert"、それ以外は role="status" で伝えます。 */
  tone?: Tone;
  /** 何が起きたかを短く。状態の色とアイコンに加えて、言葉でも状態が分かるように書きます。 */
  title: string;
  /** 操作の場所。本文の下に並べます。「再読み込み」「詳細を見る」など、この知らせを受けてすることを Button の size="sm" で置きます。 */
  action?: ReactNode;
  /** 渡すと右上に閉じるボタンを出し、押したときに呼びます。Alert を消すのは呼び出す側です。閉じるボタンにあったフォーカスは消えるので、消したあとに続きの場所（見出しや次の操作）へフォーカスを移します。 */
  onDismiss?: () => void;
  /** 閉じるボタンの名前。既定は「閉じる」。画面に知らせが複数あるときは「同期のお知らせを閉じる」のように何を閉じるかを書きます。 */
  dismissLabel?: string;
};
/** 画面に残しておく知らせ。状態の色・アイコン・見出しの言葉の3つで状態を示します。一時的な結果の通知は Toast を使います。 */
export function Alert({
  tone = 'info',
  title,
  action,
  onDismiss,
  dismissLabel = '閉じる',
  children,
  className,
  ...props
}: AlertProps) {
  const Icon =
    tone === 'danger'
      ? CircleX
      : tone === 'warning'
        ? AlertTriangle
        : tone === 'success'
          ? CircleCheck
          : Info;
  return (
    <div
      {...props}
      className={cx('lv-alert', `lv-tone-${tone}`, className)}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <Icon size={20} aria-hidden />
      <div className="lv-alert-content">
        <strong>{title}</strong>
        {children && <div className="lv-alert-description">{children}</div>}
        {action && <div className="lv-alert-actions">{action}</div>}
      </div>
      {onDismiss && (
        <IconButton
          className="lv-alert-dismiss"
          size="sm"
          label={dismissLabel}
          icon={<X />}
          onClick={onDismiss}
        />
      )}
    </div>
  );
}

export type TabItem = {
  value: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
  count?: number;
};
export function Tabs({
  items,
  label,
  defaultValue,
  value,
  onValueChange,
}: {
  items: TabItem[];
  /** タブの並びの名前。画面には出さず、読み上げに使います。 */
  label: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <TabsPrimitive.Root
      defaultValue={defaultValue ?? items[0]?.value}
      value={value}
      onValueChange={onValueChange}
    >
      <TabsPrimitive.List className="lv-tabs-list" aria-label={label}>
        {items.map((item) => (
          <TabsPrimitive.Trigger
            className="lv-tab"
            key={item.value}
            value={item.value}
            disabled={item.disabled}
          >
            {item.label}
            {item.count !== undefined && <span className="lv-tab-count">{item.count}</span>}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content className="lv-tab-content" key={item.value} value={item.value}>
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
export function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={250}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <PortalSurface>
            <TooltipPrimitive.Content className="lv-tooltip" sideOffset={7}>
              {content}
              <TooltipPrimitive.Arrow className="lv-tooltip-arrow" />
            </TooltipPrimitive.Content>
          </PortalSurface>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export type ProgressProps = {
  /** 0〜100。範囲の外は丸めます。省くと「値の分からない処理中」の形になり、数値の代わりに「処理中」と出します。 */
  value?: number;
  /** 何の進み具合か。画面に出し、読み上げの名前にも使います。 */
  label: string;
  /** 数値（%）を出すかどうか。既定は true。 */
  showValue?: boolean;
  /** 'default'（既定）は進行中。'success' は完了、'danger' は失敗で、棒の色に加えて見出しの横にアイコンと言葉（「完了」「失敗」）を出します。 */
  tone?: 'default' | 'success' | 'danger';
  /** tone の言葉を変えるとき。「3件が失敗」のように、何が起きたかを書けます。 */
  statusLabel?: string;
};
/** 処理の進み具合。数値は0〜100に丸め、色に加えて数値か言葉を併記します。値の分からない処理は value を省きます。動きを減らす設定では、値の分からない形も動かさずに縞で示します。 */
export function Progress({
  value,
  label,
  showValue = true,
  tone = 'default',
  statusLabel,
}: ProgressProps) {
  const id = useId();
  const indeterminate = value === undefined;
  const safe = indeterminate ? 0 : Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const status =
    tone === 'default' ? undefined : (statusLabel ?? (tone === 'success' ? '完了' : '失敗'));
  const StatusIcon = tone === 'success' ? CircleCheck : CircleX;
  return (
    <div className={cx('lv-progress-wrap', tone !== 'default' && `lv-progress--${tone}`)}>
      <div className="lv-progress-label">
        <span>{label}</span>
        {(status || showValue) && (
          <span className="lv-progress-value">
            {status && (
              <span className="lv-progress-status" id={`${id}-status`}>
                <StatusIcon aria-hidden />
                {status}
              </span>
            )}
            {showValue &&
              (indeterminate ? (
                <span>処理中</span>
              ) : (
                <span>
                  <span className="lv-mono">{safe}</span>%
                </span>
              ))}
          </span>
        )}
      </div>
      <ProgressPrimitive.Root
        className="lv-progress"
        value={indeterminate ? null : safe}
        aria-label={label}
        aria-describedby={status ? `${id}-status` : undefined}
      >
        <ProgressPrimitive.Indicator
          className="lv-progress-indicator"
          style={indeterminate ? undefined : { transform: `translateX(-${100 - safe}%)` }}
        />
      </ProgressPrimitive.Root>
    </div>
  );
}
export function Skeleton({
  width = '100%',
  height = 16,
  label = '読み込み中',
}: {
  width?: string | number;
  height?: string | number;
  label?: string;
}) {
  return (
    <span className="lv-skeleton" role="status" aria-label={label} style={{ width, height }} />
  );
}
/** 画面には出さず、読み上げにだけ伝える文字。表の行の「詳細」ボタンに「（W-1024）」を足すときなどに使います。配置には影響しません。 */
export function VisuallyHidden({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) {
  return <span {...props} className={cx('lv-sr-only', className)} />;
}
/** 読み込み中の印。label を読み上げ（role="status"）、動きを減らす設定では回転を止めます。ボタンの中は Button の loading、表や一覧の形が分かるときは Skeleton を使います。 */
export function Spinner({
  label = '読み込み中',
  showLabel = false,
  size = 'sm',
}: {
  /** 読み上げる文。何を待っているかを書くと伝わります（「一覧を読み込み中」）。 */
  label?: string;
  /** true で label を画面にも出します。パネル全体の読み込みに使います。 */
  showLabel?: boolean;
  /** 'sm' は 16px、'md' は 24px。文字の大きさと行の高さは置いた場所から引き継ぎます。 */
  size?: 'sm' | 'md';
}) {
  return (
    <span className={cx('lv-spinner', `lv-spinner--${size}`)} role="status">
      <Loader2 className="lv-spin" aria-hidden />
      {showLabel ? <span>{label}</span> : <VisuallyHidden>{label}</VisuallyHidden>}
    </span>
  );
}
export function EmptyState({
  title,
  description,
  action,
  icon,
  eyebrow,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="lv-empty">
      {icon && (
        <span className="lv-empty-icon" aria-hidden>
          {icon}
        </span>
      )}
      {eyebrow && <div className="lv-eyebrow">{eyebrow}</div>}
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Divider({ label }: { label?: string }) {
  return (
    <div className="lv-divider" role="separator">
      {label && <span>{label}</span>}
    </div>
  );
}
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="lv-kbd">{children}</kbd>;
}
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <span
      className={cx('lv-avatar', size === 'sm' && 'lv-avatar--sm')}
      role="img"
      aria-label={name}
    >
      {Array.from(name)
        .slice(0, size === 'sm' ? 1 : 2)
        .join('')}
    </span>
  );
}
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="パンくず">
      <ol className="lv-breadcrumb">
        {items.map((item, i) => (
          <li key={i}>
            {i > 0 && <span aria-hidden>/</span>}
            {item.href && i < items.length - 1 ? (
              <a href={item.href}>{item.label}</a>
            ) : (
              <span aria-current={i === items.length - 1 ? 'page' : undefined}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** 前後のページ送り。いまのページを「5ページ中2ページ目」と読み上げ、ページが変わると知らせます。端のページで押したボタンが無効になったら、フォーカスを反対のボタンへ移します。DataTable のページ送りには、これを横に置かずに DataTable の pageSize を使います。 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  /** 1 始まり。 */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const total = Math.max(1, Math.floor(totalPages));
  const current = Math.min(total, Math.max(1, page));
  const prev = useRef<HTMLButtonElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const pressed = useRef<'prev' | 'next' | null>(null);
  // A disabled button drops focus to the body. Hand it to the other button so keyboard and
  // screen reader users stay in the pagination after reaching the first or last page.
  useLayoutEffect(() => {
    if (!pressed.current) return;
    const [from, to] = pressed.current === 'next' ? [next, prev] : [prev, next];
    pressed.current = null;
    const active = document.activeElement;
    if (from.current?.disabled && (active === from.current || active === document.body))
      to.current?.focus();
  }, [current, total]);
  return (
    <nav className="lv-pagination" aria-label="ページ切り替え">
      <span role="status">
        <span aria-hidden>
          {current} / {total}
        </span>
        <VisuallyHidden>
          {total}ページ中 {current}ページ目
        </VisuallyHidden>
      </span>
      <Button
        ref={prev}
        size="sm"
        disabled={current === 1}
        onClick={() => {
          pressed.current = 'prev';
          onPageChange(current - 1);
        }}
        aria-label="前のページ"
      >
        <ChevronLeft size={16} aria-hidden />
      </Button>
      <Button
        ref={next}
        size="sm"
        disabled={current === total}
        onClick={() => {
          pressed.current = 'next';
          onPageChange(current + 1);
        }}
        aria-label="次のページ"
      >
        <ChevronRight size={16} aria-hidden />
      </Button>
    </nav>
  );
}
