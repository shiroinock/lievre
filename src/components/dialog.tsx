import { Dialog as DialogPrimitive } from 'radix-ui';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { PortalSurface } from './system';
export type DialogProps = {
  trigger: ReactNode;
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};
/** フォーカストラップ・Escape・閉じた後のフォーカス復帰を備えたダイアログ。 */
export function Dialog({
  trigger,
  eyebrow,
  title,
  description,
  children,
  footer,
  open,
  onOpenChange,
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <PortalSurface>
          <DialogPrimitive.Overlay className="k-dialog-overlay" />
          <DialogPrimitive.Content className="k-dialog">
            <header className="k-dialog-header">
              <div>
                {eyebrow && <div className="k-eyebrow">{eyebrow}</div>}
                <DialogPrimitive.Title className="k-dialog-title">{title}</DialogPrimitive.Title>
                <DialogPrimitive.Description className="k-dialog-description">
                  {description}
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close className="k-icon-button" aria-label="ダイアログを閉じる">
                <X size={18} />
              </DialogPrimitive.Close>
            </header>
            <div className="k-dialog-body">{children}</div>
            {footer && <footer className="k-dialog-footer">{footer}</footer>}
          </DialogPrimitive.Content>
        </PortalSurface>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
export const DialogClose = DialogPrimitive.Close;
