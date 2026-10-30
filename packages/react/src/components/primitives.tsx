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
} from 'lucide-react';
import { cx, PortalSurface } from './system';

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
  dot = false,
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  /** 'neutral' | 'success' | 'warning' | 'danger' | 'info'。Toast の 'error' はここでは 'danger'。 */
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span {...props} className={cx('lv-badge', `lv-tone-${tone}`, className)}>
      {dot && <span className="lv-status-dot" aria-hidden />}
      {children}
    </span>
  );
}

function FieldFrame({
  label,
  hint,
  error,
  id,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  id: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="lv-field">
      <label className="lv-label" htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden className="lv-required">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {(error || hint) && (
        <p id={`${id}-description`} className={cx('lv-field-hint', error && 'lv-field-error')}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  /** 見える名前。input と結びます。placeholder の代わりにはしません。 */
  label: string;
  /** 補助文。aria-describedby で入力と結びます。 */
  hint?: string;
  /** エラー文。渡すと hint の代わりに表示し、aria-invalid と aria-describedby を付けます。 */
  error?: string;
  controlSize?: 'md' | 'lg';
};
/** ラベル・補助文・エラーと入力を関連付けた標準入力。 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, controlSize = 'md', id: givenId, required, className, ...props },
  ref,
) {
  const uid = useId();
  const id = givenId ?? uid;
  return (
    <FieldFrame {...{ label, hint, error, id, required }}>
      <input
        {...props}
        ref={ref}
        id={id}
        required={required}
        className={cx('lv-input', controlSize === 'lg' && 'lv-control--lg', className)}
        aria-invalid={!!error || undefined}
        aria-describedby={hint || error ? `${id}-description` : props['aria-describedby']}
      />
    </FieldFrame>
  );
});
/** 複数行の入力。label・hint・error の扱いは TextField と同じです。 */
export function Textarea({
  label,
  hint,
  error,
  id: givenId,
  required,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; error?: string }) {
  const uid = useId();
  const id = givenId ?? uid;
  return (
    <FieldFrame {...{ label, hint, error, id, required }}>
      <textarea
        {...props}
        id={id}
        required={required}
        className={cx('lv-input', 'lv-textarea', className)}
        aria-invalid={!!error || undefined}
        aria-describedby={hint || error ? `${id}-description` : props['aria-describedby']}
      />
    </FieldFrame>
  );
}

export type CheckboxProps = {
  label: string;
  hint?: string;
  /** エラー文。aria-invalid と aria-describedby を付けます。 */
  error?: string;
  checked?: boolean | 'indeterminate';
  defaultChecked?: boolean;
  /** 'indeterminate' も来るため、boolean の state には `(c) => setX(c === true)` で渡します。 */
  onCheckedChange?: (checked: boolean | 'indeterminate') => void;
  disabled?: boolean;
  name?: string;
  required?: boolean;
  id?: string;
};
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
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
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
        </label>
        {hint && (
          <p className="lv-field-hint" id={`${id}-hint`}>
            {hint}
          </p>
        )}
        {error && (
          <p className="lv-field-hint lv-field-error" id={`${id}-error`}>
            {error}
          </p>
        )}
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

export type SelectProps = {
  label: string;
  /** 選択肢。子要素（option）では渡しません。 */
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
  /** 未選択は ''。 */
  value?: string;
  defaultValue?: string;
  /** onChange ではなくこちらを使います。 */
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  hint?: string;
  /** エラー文。aria-invalid と aria-describedby を付けます。 */
  error?: string;
};
/** 矢印キー・文字検索・Escapeに対応した単一選択。 */
export function Select({
  label,
  options,
  placeholder = '選択してください',
  hint,
  error,
  ...props
}: SelectProps) {
  const id = useId();
  return (
    <FieldFrame {...{ label, hint, error, id, required: props.required }}>
      <SelectPrimitive.Root {...props}>
        <SelectPrimitive.Trigger
          id={id}
          className="lv-select-trigger"
          aria-invalid={!!error || undefined}
          aria-describedby={hint || error ? `${id}-description` : undefined}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon className="lv-select-icon">
            <ChevronDown size={16} />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <PortalSurface>
            <SelectPrimitive.Content position="popper" sideOffset={5} className="lv-select-content">
              <SelectPrimitive.Viewport>
                {options.map((option) => (
                  <SelectPrimitive.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className="lv-select-item"
                  >
                    <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                    <SelectPrimitive.ItemIndicator className="lv-select-indicator">
                      <Check size={14} />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </PortalSurface>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </FieldFrame>
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
export function Alert({
  tone = 'info',
  title,
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: Tone; title: string }) {
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
      <div>
        <strong>{title}</strong>
        {children && <div className="lv-alert-description">{children}</div>}
      </div>
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

/** 0〜100に丸め、色に加えて数値を併記します。 */
export function Progress({
  value,
  label,
  showValue = true,
}: {
  value: number;
  label: string;
  showValue?: boolean;
}) {
  const safe = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div className="lv-progress-wrap">
      <div className="lv-progress-label">
        <span>{label}</span>
        {showValue && (
          <span>
            <span className="lv-mono">{safe}</span>%
          </span>
        )}
      </div>
      <ProgressPrimitive.Root className="lv-progress" value={safe} aria-label={label}>
        <ProgressPrimitive.Indicator
          className="lv-progress-indicator"
          style={{ transform: `translateX(-${100 - safe}%)` }}
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
