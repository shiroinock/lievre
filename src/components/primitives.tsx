import {
  forwardRef,
  useId,
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
      className={cx('k-button', `k-button--${variant}`, `k-button--${size}`, className)}
    >
      {loading ? <Loader2 className="k-spin" size={16} aria-hidden /> : icon}
      {children}
    </button>
  );
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
    <span {...props} className={cx('k-badge', `k-tone-${tone}`, className)}>
      {dot && <span className="k-status-dot" aria-hidden />}
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
    <div className="k-field">
      <label className="k-label" htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden className="k-required">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {(error || hint) && (
        <p id={`${id}-description`} className={cx('k-field-hint', error && 'k-field-error')}>
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
        className={cx('k-input', controlSize === 'lg' && 'k-control--lg', className)}
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
        className={cx('k-input', 'k-textarea', className)}
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
    <div className="k-check-field">
      <CheckboxPrimitive.Root
        {...props}
        id={id}
        className="k-checkbox"
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
        <label htmlFor={id} className="k-check-label">
          {label}
        </label>
        {hint && (
          <p className="k-field-hint" id={`${id}-hint`}>
            {hint}
          </p>
        )}
        {error && (
          <p className="k-field-hint k-field-error" id={`${id}-error`}>
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
    <div className="k-switch-field">
      <div>
        <label className="k-check-label" htmlFor={id}>
          {label}
        </label>
        {hint && (
          <p className="k-field-hint" id={`${id}-hint`}>
            {hint}
          </p>
        )}
      </div>
      <SwitchPrimitive.Root
        {...props}
        id={id}
        className="k-switch"
        aria-describedby={hint ? `${id}-hint` : undefined}
      >
        <SwitchPrimitive.Thumb className="k-switch-thumb" />
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
          className="k-select-trigger"
          aria-invalid={!!error || undefined}
          aria-describedby={hint || error ? `${id}-description` : undefined}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon>
            <ChevronDown size={15} />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <PortalSurface>
            <SelectPrimitive.Content position="popper" sideOffset={5} className="k-select-content">
              <SelectPrimitive.Viewport>
                {options.map((option) => (
                  <SelectPrimitive.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className="k-select-item"
                  >
                    <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                    <SelectPrimitive.ItemIndicator>
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
    <section {...props} className={cx('k-card', className)}>
      {(title || eyebrow || action) && (
        <header className="k-card-header">
          <div>
            {eyebrow && <div className="k-eyebrow">{eyebrow}</div>}
            {title && <h2 className="k-card-title">{title}</h2>}
          </div>
          {action}
        </header>
      )}
      <div className="k-card-body">{children}</div>
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
      className={cx('k-alert', `k-tone-${tone}`, className)}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <Icon size={18} aria-hidden />
      <div>
        <strong>{title}</strong>
        {children && <div className="k-alert-description">{children}</div>}
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
      <TabsPrimitive.List className="k-tabs-list" aria-label={label}>
        {items.map((item) => (
          <TabsPrimitive.Trigger
            className="k-tab"
            key={item.value}
            value={item.value}
            disabled={item.disabled}
          >
            {item.label}
            {item.count !== undefined && <span className="k-tab-count">{item.count}</span>}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content className="k-tab-content" key={item.value} value={item.value}>
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
            <TooltipPrimitive.Content className="k-tooltip" sideOffset={7}>
              {content}
              <TooltipPrimitive.Arrow className="k-tooltip-arrow" />
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
    <div className="k-progress-wrap">
      <div className="k-progress-label">
        <span>{label}</span>
        {showValue && (
          <span>
            <span className="k-mono">{safe}</span>%
          </span>
        )}
      </div>
      <ProgressPrimitive.Root className="k-progress" value={safe} aria-label={label}>
        <ProgressPrimitive.Indicator
          className="k-progress-indicator"
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
  return <span className="k-skeleton" role="status" aria-label={label} style={{ width, height }} />;
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
    <div className="k-empty">
      {icon && (
        <span className="k-empty-icon" aria-hidden>
          {icon}
        </span>
      )}
      {eyebrow && <div className="k-eyebrow">{eyebrow}</div>}
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Divider({ label }: { label?: string }) {
  return (
    <div className="k-divider" role="separator">
      {label && <span>{label}</span>}
    </div>
  );
}
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="k-kbd">{children}</kbd>;
}
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <span className={cx('k-avatar', size === 'sm' && 'k-avatar--sm')} role="img" aria-label={name}>
      {Array.from(name).slice(0, 2).join('')}
    </span>
  );
}
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="パンくず">
      <ol className="k-breadcrumb">
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

/** 前後のページ送り。DataTable と組み合わせるときは、全件を並べ替えてから区切った rows を渡します。 */
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
  return (
    <nav className="k-pagination" aria-label="ページ切り替え">
      <span>
        {current} / {total}
      </span>
      <Button
        size="sm"
        disabled={current === 1}
        onClick={() => onPageChange(current - 1)}
        aria-label="前のページ"
      >
        <ChevronLeft size={16} aria-hidden />
      </Button>
      <Button
        size="sm"
        disabled={current === total}
        onClick={() => onPageChange(current + 1)}
        aria-label="次のページ"
      >
        <ChevronRight size={16} aria-hidden />
      </Button>
    </nav>
  );
}
