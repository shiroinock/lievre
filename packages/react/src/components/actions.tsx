import { useState, type ReactNode } from 'react';
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
import { ChevronDown } from 'lucide-react';
import { cx } from './system';
import { Button, IconButton } from './primitives';
import { DropdownMenu, type MenuItem } from './popover';

export type SegmentedItem = {
  value: string;
  /** 選択肢の言葉。アイコンを添えても、言葉は消しません。 */
  label: string;
  /** 言葉の前のアイコン。飾りなので読み上げません。 */
  icon?: ReactNode;
  disabled?: boolean;
};
export type SegmentedControlProps = {
  /** まとまりの名前。画面には出さず、読み上げに使います（「表示の形」）。 */
  label: string;
  items: SegmentedItem[];
  /** 選んでいる値。渡すと外で持ちます。 */
  value?: string;
  defaultValue?: string;
  /** 選んだ値が変わったときに呼びます。選んでいるものをもう一度押しても、選択は外れません。 */
  onValueChange?: (value: string) => void;
  /** 'md'（既定）は密度の操作の高さ、'sm' は 32px。 */
  size?: 'sm' | 'md';
  disabled?: boolean;
};
/** 同じ中身の表示の形を切り替える選択（一覧・カード、日・週・月）。中身の領域を切り替えるなら Tabs、フォームで値を選ぶなら RadioGroup を使います。見た目と操作は ViewSwitch と同じで、矢印キーで移り、選んだものは面と線と太い文字で示します。 */
export function SegmentedControl({
  label,
  items,
  value,
  defaultValue,
  onValueChange,
  size = 'md',
  disabled,
}: SegmentedControlProps) {
  // Always controlled underneath: pressing the chosen item again would clear Radix's own state.
  const [inner, setInner] = useState(defaultValue ?? '');
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      className={cx('lv-segmented', size === 'sm' && 'lv-segmented--sm')}
      aria-label={label}
      value={value ?? inner}
      disabled={disabled}
      onValueChange={(next) => {
        if (!next) return;
        setInner(next);
        onValueChange?.(next);
      }}
    >
      {items.map((item) => (
        <ToggleGroupPrimitive.Item
          key={item.value}
          value={item.value}
          disabled={item.disabled}
          className="lv-segmented-item"
        >
          {item.icon && (
            <span className="lv-segmented-icon" aria-hidden>
              {item.icon}
            </span>
          )}
          {item.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}

export type ButtonGroupProps = {
  /** まとまりの名前。画面には出さず、読み上げに使います（「書式」「行の操作」）。 */
  label: string;
  /** 並べる Button・IconButton。 */
  children: ReactNode;
  /** true でボタンを隙間なくつなげます。間の線は1本（1px）にし、端だけ角を丸めます。関係の強い操作（前へ・次へ、分割ボタン）に使います。 */
  attached?: boolean;
};
/** 関係のあるボタンの並び。role="group" でまとまりの名前を読み上げます。Tab で1つずつ移ります。 */
export function ButtonGroup({ label, children, attached = false }: ButtonGroupProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cx('lv-button-group', attached && 'lv-button-group--attached')}
    >
      {children}
    </div>
  );
}

export type SplitButtonProps = {
  /** 主な操作の言葉（「保存」）。 */
  children: ReactNode;
  /** 主な操作。 */
  onClick: () => void;
  /** 開く側のボタンの名前。「保存のほかの方法」のように、何の続きかを書きます。 */
  menuLabel: string;
  /** 開く側のメニューの項目。DropdownMenu と同じ形です。 */
  items: MenuItem[];
  /** 'primary' は主要操作、'secondary'（既定）はふつうの操作。 */
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
};
/** 主な操作と、そのほかの方法のメニューをつなげたボタン（「保存」と「下書きとして保存」など）。2つは別のボタンで、Tab で順に移ります。 */
export function SplitButton({
  children,
  onClick,
  menuLabel,
  items,
  variant = 'secondary',
  size = 'md',
  disabled,
}: SplitButtonProps) {
  return (
    <ButtonGroup label={menuLabel} attached>
      <Button variant={variant} size={size} onClick={onClick} disabled={disabled}>
        {children}
      </Button>
      <DropdownMenu
        align="end"
        items={items}
        trigger={
          <IconButton
            label={menuLabel}
            icon={<ChevronDown />}
            variant={variant}
            size={size}
            disabled={disabled}
            tooltip={false}
          />
        }
      />
    </ButtonGroup>
  );
}
