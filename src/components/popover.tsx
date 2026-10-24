import { DropdownMenu as MenuPrimitive, Popover as PopoverPrimitive } from 'radix-ui';
import { Check } from 'lucide-react';
import { Fragment, useId, type ReactNode } from 'react';
import { PortalSurface } from './system';

export type PopoverProps = {
  /** 開くボタン。Button か IconButton を渡します。閉じるとフォーカスはここに戻ります。 */
  trigger: ReactNode;
  /** パネルの見出し。画面に出し、aria-labelledby でパネルと結びます。 */
  title: string;
  /** 中身。絞り込みの条件や設定など、操作できるものを置きます。説明だけなら Tooltip を使います。 */
  children: ReactNode;
  /** 開く向き。画面の端で入らないときは反対側に回ります。 */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** 開いた元の部品とのそろえ方。 */
  align?: 'start' | 'center' | 'end';
  /** 中の「適用」などで閉じるときは、open と onOpenChange で開閉を持ちます。 */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};
/** 押すと開く、操作できる中身のパネル。Escape と外側を押すと閉じ、フォーカスを開いた元に戻します。影を使わず、1px の線と面で浮かせます。 */
export function Popover({
  trigger,
  title,
  children,
  side = 'bottom',
  align = 'start',
  open,
  onOpenChange,
}: PopoverProps) {
  const id = useId();
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PortalSurface>
          <PopoverPrimitive.Content
            className="k-popover"
            side={side}
            align={align}
            sideOffset={4}
            collisionPadding={8}
            aria-labelledby={id}
          >
            <h2 id={id} className="k-popover-title">
              {title}
            </h2>
            <div className="k-popover-body">{children}</div>
          </PopoverPrimitive.Content>
        </PortalSurface>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export type MenuItem =
  | {
      type?: 'item';
      label: string;
      onSelect: () => void;
      /** 先頭のアイコン。どれか1つにあれば、全項目の文字の開始位置をアイコンの列の分だけそろえます。 */
      icon?: ReactNode;
      /** 右端に出すキーの組み合わせ（"⌘D"）。押したときの処理は利用する側で付けます。 */
      shortcut?: string;
      /** 'danger' は削除など取り消せない操作。赤の文字にするので、label にも「削除」など何が起きるかを書きます。 */
      tone?: 'danger';
      disabled?: boolean;
    }
  | {
      /** 入り切りの項目。押してもメニューは閉じません。 */
      type: 'checkbox';
      label: string;
      checked: boolean;
      onCheckedChange: (checked: boolean) => void;
      disabled?: boolean;
    }
  | {
      /** 1つを選ぶ項目の組（並べ替えの順など）。label は組の見出しとして出します。 */
      type: 'radio';
      label: string;
      value: string;
      onValueChange: (value: string) => void;
      options: { value: string; label: string; disabled?: boolean }[];
    }
  | { type: 'separator' };
export type DropdownMenuProps = {
  /** 開くボタン。Button か IconButton を渡します。メニューの名前はこのボタンの名前になります。 */
  trigger: ReactNode;
  /** 項目。並べた順に出します。区切りは `{ type: 'separator' }`。 */
  items: MenuItem[];
  /** 開いた元の部品とのそろえ方。表の行の端に置くときは 'end'。 */
  align?: 'start' | 'end';
};
/** 押すと開く操作の一覧。矢印キー・Home / End・文字での選択・Escape に対応し、閉じるとフォーカスを開いた元に戻します。 */
export function DropdownMenu({ trigger, items, align = 'start' }: DropdownMenuProps) {
  const id = useId();
  // One icon column for every row, so the text starts at the same place with or without an icon.
  const lead = items.some(
    (item) =>
      item.type === 'checkbox' ||
      item.type === 'radio' ||
      ((!item.type || item.type === 'item') && !!item.icon),
  );
  const leadCell = (content?: ReactNode) =>
    lead && (
      <span className="k-menu-lead" aria-hidden>
        {content}
      </span>
    );
  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger asChild>{trigger}</MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <PortalSurface>
          <MenuPrimitive.Content
            className="k-menu"
            align={align}
            sideOffset={4}
            collisionPadding={8}
            data-lead={lead || undefined}
          >
            {items.map((item, i) => {
              if (item.type === 'separator')
                return <MenuPrimitive.Separator key={i} className="k-menu-separator" />;
              if (item.type === 'checkbox')
                return (
                  <MenuPrimitive.CheckboxItem
                    key={i}
                    className="k-menu-item"
                    checked={item.checked}
                    onCheckedChange={item.onCheckedChange}
                    disabled={item.disabled}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {leadCell(
                      <MenuPrimitive.ItemIndicator className="k-menu-indicator">
                        <Check />
                      </MenuPrimitive.ItemIndicator>,
                    )}
                    <span className="k-menu-label">{item.label}</span>
                  </MenuPrimitive.CheckboxItem>
                );
              if (item.type === 'radio')
                return (
                  <Fragment key={i}>
                    <MenuPrimitive.Label id={`${id}-${i}`} className="k-menu-heading">
                      {item.label}
                    </MenuPrimitive.Label>
                    <MenuPrimitive.RadioGroup
                      value={item.value}
                      onValueChange={item.onValueChange}
                      aria-labelledby={`${id}-${i}`}
                    >
                      {item.options.map((option) => (
                        <MenuPrimitive.RadioItem
                          key={option.value}
                          className="k-menu-item"
                          value={option.value}
                          disabled={option.disabled}
                        >
                          {leadCell(
                            <MenuPrimitive.ItemIndicator className="k-menu-indicator">
                              <Check />
                            </MenuPrimitive.ItemIndicator>,
                          )}
                          <span className="k-menu-label">{option.label}</span>
                        </MenuPrimitive.RadioItem>
                      ))}
                    </MenuPrimitive.RadioGroup>
                  </Fragment>
                );
              return (
                <MenuPrimitive.Item
                  key={i}
                  className="k-menu-item"
                  onSelect={item.onSelect}
                  disabled={item.disabled}
                  data-tone={item.tone}
                >
                  {leadCell(item.icon)}
                  <span className="k-menu-label">{item.label}</span>
                  {item.shortcut && <kbd className="k-menu-shortcut">{item.shortcut}</kbd>}
                </MenuPrimitive.Item>
              );
            })}
          </MenuPrimitive.Content>
        </PortalSurface>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}
