import type { ReactNode } from 'react';
import { Accordion as AccordionPrimitive, Collapsible as CollapsiblePrimitive } from 'radix-ui';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cx } from './system';

export type AccordionItem = {
  /** 項目を見分ける値。value・defaultValue・onValueChange で使います。 */
  value: string;
  /** 見出し。押すと開閉するボタンの名前になります。 */
  title: string;
  /** 開いたときの中身。見出しの名前の付いた領域（region）になります。 */
  content: ReactNode;
  disabled?: boolean;
};
export type AccordionProps = {
  items: AccordionItem[];
  /** 見出しのレベル（h2〜h6）。ページの見出しの並びに合わせます。既定は 3。 */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** 同時に複数を開けるか。既定は1つだけで、別の項目を開くと前の項目は閉じます。 */
  multiple?: boolean;
  /** 開いている項目の値。渡すと外で持ちます。1つだけのときも配列で渡します。 */
  value?: string[];
  /** 外で持たないときの、はじめに開いている項目。 */
  defaultValue?: string[];
  /** 開いている項目が変わったときに呼びます。 */
  onValueChange?: (value: string[]) => void;
};
/**
 * 見出しを押して中身を開閉する並び（よくある質問、申し込みの補足、詳しい条件）。
 * 開閉は矢印の向きに加えて、ボタンの aria-expanded で「展開」「折りたたみ」を読み上げます。
 * 上下の矢印キーで見出しの間を移り、Home・End で最初と最後へ移ります。項目の間は 1px の線で区切ります。
 * 1つの補足だけを開閉するなら Disclosure を使います。
 */
export function Accordion({
  items,
  headingLevel = 3,
  multiple = false,
  value,
  defaultValue,
  onValueChange,
}: AccordionProps) {
  const Heading = `h${headingLevel}` as const;
  const body = items.map((item) => (
    <AccordionPrimitive.Item
      key={item.value}
      value={item.value}
      disabled={item.disabled}
      className="lv-accordion-item"
    >
      <AccordionPrimitive.Header asChild>
        <Heading className="lv-accordion-heading">
          <AccordionPrimitive.Trigger className="lv-accordion-trigger">
            <span className="lv-accordion-title">{item.title}</span>
            <span className="lv-accordion-icon" aria-hidden>
              <ChevronDown size={16} />
            </span>
          </AccordionPrimitive.Trigger>
        </Heading>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content className="lv-accordion-content">
        {item.content}
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  ));
  if (multiple)
    return (
      <AccordionPrimitive.Root
        type="multiple"
        className="lv-accordion"
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
      >
        {body}
      </AccordionPrimitive.Root>
    );
  return (
    <AccordionPrimitive.Root
      type="single"
      collapsible
      className="lv-accordion"
      value={value === undefined ? undefined : (value[0] ?? '')}
      defaultValue={defaultValue?.[0]}
      onValueChange={(next) => onValueChange?.(next ? [next] : [])}
    >
      {body}
    </AccordionPrimitive.Root>
  );
}
export type DisclosureProps = {
  /** 開閉するボタンの言葉（「詳しい条件」）。 */
  summary: string;
  /** 開いたときの中身。左端はボタンの文字の左端にそろえます。 */
  children: ReactNode;
  /** 開いているか。渡すと外で持ちます。 */
  open?: boolean;
  /** 外で持たないときの、はじめの開閉。 */
  defaultOpen?: boolean;
  /** 開閉が変わったときに呼びます。 */
  onOpenChange?: (open: boolean) => void;
  className?: string;
};
/**
 * 1つの補足を開閉する小さなボタンと中身。Accordion と違って見出しを持たず、文の流れの中に置きます。
 * 開閉は矢印の向きに加えて、ボタンの aria-expanded で読み上げます。
 */
export function Disclosure({
  summary,
  children,
  open,
  defaultOpen,
  onOpenChange,
  className,
}: DisclosureProps) {
  return (
    <CollapsiblePrimitive.Root
      className={cx('lv-disclosure', className)}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
    >
      <CollapsiblePrimitive.Trigger className="lv-disclosure-trigger">
        <span className="lv-disclosure-icon" aria-hidden>
          <ChevronRight size={16} />
        </span>
        <span className="lv-disclosure-summary">{summary}</span>
      </CollapsiblePrimitive.Trigger>
      <CollapsiblePrimitive.Content className="lv-disclosure-content">
        {children}
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  );
}
