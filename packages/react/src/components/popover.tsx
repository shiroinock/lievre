import { DropdownMenu as MenuPrimitive, Popover as PopoverPrimitive } from 'radix-ui';
import { Check, ChevronRight } from 'lucide-react';
import { Fragment, useId, useRef, useState, type ReactNode } from 'react';
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
            className="lv-popover"
            side={side}
            align={align}
            sideOffset={4}
            collisionPadding={8}
            aria-labelledby={id}
          >
            <h2 id={id} className="lv-popover-title">
              {title}
            </h2>
            <div className="lv-popover-body">{children}</div>
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
      /** メニューを閉じて、フォーカスを開いた元に戻してから呼びます。ここから ConfirmDialog や Dialog を開くと、閉じた後のフォーカスもメニューを開いたボタンに戻ります。 */
      onSelect: () => void;
      /** 先頭のアイコン。どれか1つにあれば、全項目の文字の開始位置をアイコンの列の分だけそろえます。 */
      icon?: ReactNode;
      /** 項目の下に出す補足（「選んだ3件を別の拠点へ移します」）。項目に aria-describedby で結びます。 */
      description?: string;
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
  | {
      /** 見出しの付いた項目のまとまり。label は見出しとして出し、中の項目の読み上げに添えます。 */
      type: 'group';
      label: string;
      items: MenuItem[];
    }
  | {
      /** 入れ子のメニュー。右矢印か Enter で開き、左矢印か Escape で戻ります。入れ子は1段までにします。 */
      type: 'submenu';
      label: string;
      icon?: ReactNode;
      items: MenuItem[];
      disabled?: boolean;
    }
  | { type: 'separator' };
export type DropdownMenuProps = {
  /** 開くボタン。Button か IconButton を渡します。メニューの名前はこのボタンの名前になります。 */
  trigger: ReactNode;
  /** 項目。並べた順に出します。区切りは `{ type: 'separator' }`、見出しの付いたまとまりは `{ type: 'group' }`、入れ子は `{ type: 'submenu' }`。 */
  items: MenuItem[];
  /** 開いた元の部品とのそろえ方。表の行の端に置くときは 'end'。 */
  align?: 'start' | 'end';
  /** 開く向き。画面の端で入らないときは反対側に回ります。 */
  side?: 'top' | 'right' | 'bottom' | 'left';
};
/** One icon column for every row of a list, so the text starts at the same place. */
const needsLead = (items: MenuItem[]): boolean =>
  items.some(
    (item) =>
      item.type === 'checkbox' ||
      item.type === 'radio' ||
      (item.type === 'group' && needsLead(item.items)) ||
      ((!item.type || item.type === 'item' || item.type === 'submenu') && !!item.icon),
  );
/** A nested menu. Escape closes only this level and goes back to its row, as ArrowLeft does
 * (Radix closes the whole menu on Escape; the APG menu pattern closes the one holding focus). */
function MenuSub({
  label,
  lead,
  disabled,
  nestedLead,
  children,
}: {
  label: string;
  lead: ReactNode;
  disabled?: boolean;
  nestedLead: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  return (
    <MenuPrimitive.Sub open={open} onOpenChange={setOpen}>
      <MenuPrimitive.SubTrigger ref={rowRef} className="lv-menu-item" disabled={disabled}>
        {lead}
        <span className="lv-menu-label">{label}</span>
        <ChevronRight className="lv-menu-sub-icon" aria-hidden />
      </MenuPrimitive.SubTrigger>
      <MenuPrimitive.Portal>
        <PortalSurface>
          <MenuPrimitive.SubContent
            className="lv-menu"
            sideOffset={4}
            alignOffset={-5}
            collisionPadding={8}
            data-lead={nestedLead || undefined}
            onEscapeKeyDown={(event) => {
              event.preventDefault();
              setOpen(false);
              rowRef.current?.focus();
            }}
          >
            {children}
          </MenuPrimitive.SubContent>
        </PortalSurface>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Sub>
  );
}
/** 押すと開く操作の一覧。矢印キー・Home / End・文字での選択・Escape に対応し、閉じるとフォーカスを開いた元に戻します。 */
export function DropdownMenu({
  trigger,
  items,
  align = 'start',
  side = 'bottom',
}: DropdownMenuProps) {
  const id = useId();
  // Run the chosen action once the menu has given focus back to its trigger. A dialog opened
  // from the item then remembers the trigger, not the vanishing item, as where focus returns.
  const chosen = useRef<(() => void) | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const renderList = (list: MenuItem[], path: string): ReactNode => {
    const lead = needsLead(list);
    const leadCell = (content?: ReactNode) =>
      lead && (
        <span className="lv-menu-lead" aria-hidden>
          {content}
        </span>
      );
    const renderItem = (item: MenuItem, key: string): ReactNode => {
      if (item.type === 'separator')
        return <MenuPrimitive.Separator key={key} className="lv-menu-separator" />;
      if (item.type === 'checkbox')
        return (
          <MenuPrimitive.CheckboxItem
            key={key}
            className="lv-menu-item"
            checked={item.checked}
            onCheckedChange={item.onCheckedChange}
            disabled={item.disabled}
            onSelect={(e) => e.preventDefault()}
          >
            {leadCell(
              <MenuPrimitive.ItemIndicator className="lv-menu-indicator">
                <Check />
              </MenuPrimitive.ItemIndicator>,
            )}
            <span className="lv-menu-label">{item.label}</span>
          </MenuPrimitive.CheckboxItem>
        );
      if (item.type === 'radio')
        return (
          <Fragment key={key}>
            <MenuPrimitive.Label id={`${id}-${key}`} className="lv-menu-heading">
              {item.label}
            </MenuPrimitive.Label>
            <MenuPrimitive.RadioGroup
              value={item.value}
              onValueChange={item.onValueChange}
              aria-labelledby={`${id}-${key}`}
            >
              {item.options.map((option) => (
                <MenuPrimitive.RadioItem
                  key={option.value}
                  className="lv-menu-item"
                  value={option.value}
                  disabled={option.disabled}
                >
                  {leadCell(
                    <MenuPrimitive.ItemIndicator className="lv-menu-indicator">
                      <Check />
                    </MenuPrimitive.ItemIndicator>,
                  )}
                  <span className="lv-menu-label">{option.label}</span>
                </MenuPrimitive.RadioItem>
              ))}
            </MenuPrimitive.RadioGroup>
          </Fragment>
        );
      if (item.type === 'group')
        return (
          <MenuPrimitive.Group key={key} aria-labelledby={`${id}-${key}`}>
            <MenuPrimitive.Label id={`${id}-${key}`} className="lv-menu-heading">
              {item.label}
            </MenuPrimitive.Label>
            {item.items.map((child, i) => renderItem(child, `${key}-${i}`))}
          </MenuPrimitive.Group>
        );
      if (item.type === 'submenu')
        return (
          <MenuSub
            key={key}
            label={item.label}
            lead={leadCell(item.icon)}
            disabled={item.disabled}
            nestedLead={needsLead(item.items)}
          >
            {renderList(item.items, `${key}-`)}
          </MenuSub>
        );
      const describedId = item.description ? `${id}-${key}-description` : undefined;
      return (
        <MenuPrimitive.Item
          key={key}
          className="lv-menu-item"
          onSelect={() => {
            chosen.current = item.onSelect;
          }}
          disabled={item.disabled}
          data-tone={item.tone}
          data-described={item.description ? true : undefined}
          // The note is inside the row; name the row by its label alone.
          aria-labelledby={item.description ? `${id}-${key}-label` : undefined}
          aria-describedby={describedId}
        >
          {leadCell(item.icon)}
          {item.description ? (
            <span className="lv-menu-text">
              <span id={`${id}-${key}-label`} className="lv-menu-label">
                {item.label}
              </span>
              <span id={describedId} className="lv-menu-description">
                {item.description}
              </span>
            </span>
          ) : (
            <span className="lv-menu-label">{item.label}</span>
          )}
          {item.shortcut && <kbd className="lv-menu-shortcut">{item.shortcut}</kbd>}
        </MenuPrimitive.Item>
      );
    };
    return list.map((item, i) => renderItem(item, `${path}${i}`));
  };
  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger asChild ref={triggerRef}>
        {trigger}
      </MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <PortalSurface>
          <MenuPrimitive.Content
            className="lv-menu"
            align={align}
            side={side}
            sideOffset={4}
            collisionPadding={8}
            data-lead={needsLead(items) || undefined}
            onCloseAutoFocus={(event) => {
              const run = chosen.current;
              if (!run) return;
              chosen.current = null;
              // Focus first, so an action that moves focus itself keeps it.
              event.preventDefault();
              triggerRef.current?.focus();
              run();
            }}
          >
            {renderList(items, '')}
          </MenuPrimitive.Content>
        </PortalSurface>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}
