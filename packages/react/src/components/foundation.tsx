import {
  createElement,
  forwardRef,
  type AnchorHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cx } from './system';
import { FamilyScope } from './theme-context';
export type Space = 0 | 1 | 2 | 3 | 4 | 6 | 8 | 12;
const space = (n: Space) => (n === 0 ? 0 : `var(--lv-space-${n})`);
/** 用途に依存しない本文。密度と文字の役割を分けて選びます。 */
export function Text({
  as = 'p',
  size = 'body',
  tone = 'default',
  weight,
  maxLines,
  mono = false,
  className,
  style,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: 'p' | 'span' | 'div';
  /** 'small' は 12px（補助）、'body' は本文（文字の設定で 16 / 14px）、'lead' は 18px（導入の文）。 */
  size?: 'small' | 'body' | 'lead';
  /** 'muted' は補助の色。どちらも面に対して 4.5:1 を超えます。 */
  tone?: 'default' | 'muted';
  /** 文字の太さ。既定は本文の太さ（regular）。'medium' は少し強く、'bold' は強調。強調は太さだけにし、色は変えません。 */
  weight?: 'regular' | 'medium' | 'bold';
  /** この行数で切り、末尾に「…」を出します。表の長い件名やカードの説明に使います。切った分は読み上げでは読まれますが、目では見えないので、全文は詳細の画面などで読めるようにします。 */
  maxLines?: number;
  /** 日本語も含めて等幅にします。ログ・コマンドの出力・コードのように、字の桁をそろえて読む文に使います。英数字 1 対日本語 2 の幅でそろい、14.4px より小さくしません。中に置いた部品も、中から開くツールチップなどのポータルも等幅になります。 */
  mono?: boolean;
}): ReactElement {
  const text = createElement(as, {
    ...props,
    style: maxLines ? ({ ...style, '--lines': maxLines } as CSSProperties) : style,
    className: cx(
      'lv-text',
      `lv-text--${size}`,
      tone === 'muted' && 'lv-muted',
      weight && `lv-weight--${weight}`,
      !!maxLines && 'lv-text--clamp',
      mono && 'lv-family-mono',
      className,
    ),
  });
  return <FamilyScope mono={mono}>{text}</FamilyScope>;
}
export type HeadingSize = 'minor' | 'subsection' | 'section' | 'title' | 'display';
export const Heading = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement> & {
    /** 見出しの段（h1〜h6）。文書の構造に合わせ、大きさとは別に選びます。 */
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    /** 大きさ。'minor' 16px・'subsection' 18px・'section' 22px（既定）・'title' 28〜36px・'display' 36〜52px。'title' と 'display' は画面の幅で伸び縮みします。 */
    size?: HeadingSize;
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
  justify = 'start',
  wrap,
  className,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  /** 間の広さ（4px の格子の段）。 */
  gap?: Space;
  direction?: 'row' | 'column';
  /** 交わる向きのそろえ方。 */
  align?: 'stretch' | 'start' | 'center' | 'end';
  /** 並ぶ向きのそろえ方。'between' は両端に寄せて間を均等に空けます（見出しと操作を左右に分けるときなど）。 */
  justify?: 'start' | 'center' | 'end' | 'between';
  /** 折り返すかどうか。既定は row で折り返し、column で折り返しません。 */
  wrap?: boolean;
}) {
  return (
    <div
      {...props}
      className={cx('lv-stack', className)}
      style={{
        display: 'flex',
        flexDirection: direction,
        flexWrap: (wrap ?? direction === 'row') ? 'wrap' : undefined,
        justifyContent:
          justify === 'between'
            ? 'space-between'
            : justify === 'start'
              ? undefined
              : justify === 'end'
                ? 'flex-end'
                : justify,
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
