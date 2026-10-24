import { Popover as PopoverPrimitive } from 'radix-ui';
import { useId, type ReactNode } from 'react';
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
