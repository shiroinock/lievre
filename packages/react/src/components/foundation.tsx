import {
  createElement,
  forwardRef,
  useId,
  type AnchorHTMLAttributes,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cx } from './system';
export type Space = 0 | 1 | 2 | 3 | 4 | 6 | 8 | 12;
const space = (n: Space) => (n === 0 ? 0 : `var(--lv-space-${n})`);
/** 用途に依存しない本文。密度と文字の役割を分けて選びます。 */
export function Text({
  as = 'p',
  size = 'body',
  tone = 'default',
  className,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: 'p' | 'span' | 'div';
  size?: 'small' | 'body' | 'lead';
  tone?: 'default' | 'muted';
}): ReactElement {
  return createElement(as, {
    ...props,
    className: cx('lv-text', `lv-text--${size}`, tone === 'muted' && 'lv-muted', className),
  });
}
export const Heading = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement> & {
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    size?: 'section' | 'title' | 'display';
  }
>(function Heading({ level = 2, size = 'section', className, ...props }, ref) {
  return createElement(`h${level}`, {
    ...props,
    ref,
    className: cx('lv-heading', `lv-heading--${size}`, className),
  });
});
export function Link({ className, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} className={cx('lv-link', className)} />;
}
/** 移動にはa要素、処理の実行にはButtonを使います。 */
export function ActionLink({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <a
      {...props}
      className={cx('lv-button', `lv-button--${variant}`, `lv-button--${size}`, className)}
    />
  );
}
export function Container({
  width = 'wide',
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { width?: 'reading' | 'wide' | 'full' }) {
  return <div {...props} className={cx('lv-container', `lv-container--${width}`, className)} />;
}
export function Stack({
  gap = 4,
  direction = 'column',
  align = 'stretch',
  className,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  gap?: Space;
  direction?: 'row' | 'column';
  align?: 'stretch' | 'start' | 'center' | 'end';
}) {
  return (
    <div
      {...props}
      className={cx('lv-stack', className)}
      style={{
        display: 'flex',
        flexDirection: direction,
        flexWrap: direction === 'row' ? 'wrap' : undefined,
        alignItems: align === 'start' ? 'flex-start' : align === 'end' ? 'flex-end' : align,
        gap: space(gap),
        ...style,
      }}
    />
  );
}
export function Grid({
  minWidth = '16rem',
  gap = 6,
  className,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement> & { minWidth?: string; gap?: Space }) {
  return (
    <div
      {...props}
      className={cx('lv-grid', className)}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit,minmax(min(100%,${minWidth}),1fr))`,
        gap: space(gap),
        ...style,
      }}
    />
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
  error,
  required = false,
}: {
  /** まとまりの名前。fieldset の legend になります。 */
  label: string;
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
  /** エラー文。fieldset に aria-describedby で結びます。 */
  error?: string;
  required?: boolean;
}) {
  const id = useId();
  return (
    <fieldset
      className="lv-radio-group"
      disabled={disabled}
      aria-describedby={error ? `${id}-error` : undefined}
    >
      <legend className="lv-label">
        {label}
        {required ? '（必須）' : ''}
      </legend>
      <Stack gap={3}>
        {options.map((o, i) => (
          <label className="lv-radio-option" key={o.value}>
            <input
              type="radio"
              name={name ?? id}
              value={o.value}
              checked={value === undefined ? undefined : value === o.value}
              defaultChecked={value === undefined ? defaultValue === o.value : undefined}
              onChange={() => onValueChange?.(o.value)}
              disabled={o.disabled}
              required={required}
              aria-labelledby={`${id}-${i}-label`}
              aria-invalid={!!error || undefined}
              aria-describedby={o.description ? `${id}-${i}` : undefined}
            />
            <span>
              <span id={`${id}-${i}-label`}>{o.label}</span>
              {o.description && <small id={`${id}-${i}`}>{o.description}</small>}
            </span>
          </label>
        ))}
      </Stack>
      {error && (
        <p id={`${id}-error`} className="lv-field-hint lv-field-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
