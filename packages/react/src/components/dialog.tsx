import { Dialog as DialogPrimitive } from 'radix-ui';
import { X } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { PortalSurface } from './system';
import { Button } from './primitives';
export type DialogProps = {
  trigger: ReactNode;
  eyebrow?: string;
  title: string;
  /** 何が起きるかの説明。aria-describedby で結びます。 */
  description: string;
  /** 本文。フォームや詳細を置きます。 */
  children: ReactNode;
  /** 操作。閉じるだけのボタンは `<DialogClose asChild><Button>…</Button></DialogClose>` で包みます。 */
  footer?: ReactNode;
  /** 幅。'sm' は 400px（短い知らせ・入力1つ）、'md'（既定）は 520px（ふつうのフォーム）、'lg' は 720px（表や詳細を見せる）。狭い画面では、どれも画面の幅から左右 16px を引いた幅に縮みます。 */
  size?: 'sm' | 'md' | 'lg';
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
  size = 'md',
  open,
  onOpenChange,
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <PortalSurface>
          <DialogPrimitive.Overlay className="lv-dialog-overlay" />
          <DialogPrimitive.Content className="lv-dialog" data-size={size}>
            <header className="lv-dialog-header">
              <div>
                {eyebrow && <div className="lv-eyebrow">{eyebrow}</div>}
                <DialogPrimitive.Title className="lv-dialog-title">{title}</DialogPrimitive.Title>
                <DialogPrimitive.Description className="lv-dialog-description">
                  {description}
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close className="lv-icon-button" aria-label="ダイアログを閉じる">
                <X size={16} />
              </DialogPrimitive.Close>
            </header>
            <div className="lv-dialog-body">{children}</div>
            {footer && <footer className="lv-dialog-footer">{footer}</footer>}
          </DialogPrimitive.Content>
        </PortalSurface>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
/** 押すと Dialog を閉じます。`<DialogClose asChild><Button>キャンセル</Button></DialogClose>` のように asChild で包みます。 */
export const DialogClose = DialogPrimitive.Close;

export type ConfirmDialogProps = {
  /** 開くボタン。メニューの項目などから開くときは省き、open と onOpenChange で開閉を持ちます。 */
  trigger?: ReactNode;
  /** 確かめる問い。「3件の作業を削除しますか？」のように、何に何をするかを書きます。 */
  title: string;
  /** 実行すると何が起きるか、取り消せるか。aria-describedby で結びます。 */
  description: string;
  /** 補足。対象の一覧など。 */
  children?: ReactNode;
  /** 実行のボタンの文字。何が起きるかを動詞で書きます（「3件を削除」）。「OK」「はい」にはしません。 */
  confirmLabel: string;
  cancelLabel?: string;
  /** 'danger' は削除など取り消せない操作。実行のボタンを赤にします。 */
  tone?: 'default' | 'danger';
  /** 実行したときに呼びます。Promise を返すと、終わるまで実行のボタンを処理中にして閉じさせず、終わったら閉じます。失敗（reject）したら開いたままにして、もう一度押せるようにします。部品は失敗の理由を出さないので、onConfirm の中で Toast などで知らせます。 */
  onConfirm: () => void | Promise<unknown>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};
/** 取り消せない操作の前の確認。初めのフォーカスは取り消し側に置き、Escape・外側を押す・閉じるボタンはどれも取り消しになります。 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = 'キャンセル',
  tone = 'default',
  onConfirm,
  open,
  onOpenChange,
}: ConfirmDialogProps) {
  const [innerOpen, setInnerOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const cancel = useRef<HTMLButtonElement>(null);
  // Without a trigger, Radix has nowhere to return focus, so remember where it came from.
  const opener = useRef<HTMLElement | null>(null);
  const isOpen = open ?? innerOpen;
  const setOpen = (next: boolean) => {
    // While the action runs, closing would hide whether it finished.
    if (!next && pending) return;
    setInnerOpen(next);
    onOpenChange?.(next);
  };
  const confirm = async () => {
    setPending(true);
    try {
      await onConfirm();
      setInnerOpen(false);
      onOpenChange?.(false);
    } catch {
      // A rejected action keeps the dialog open; the caller reports why.
    } finally {
      setPending(false);
    }
  };
  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
      <DialogPrimitive.Portal>
        <PortalSurface>
          <DialogPrimitive.Overlay className="lv-dialog-overlay" />
          <DialogPrimitive.Content
            className="lv-dialog lv-dialog--confirm"
            role="alertdialog"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              opener.current = document.activeElement as HTMLElement | null;
              cancel.current?.focus();
            }}
            onCloseAutoFocus={(event) => {
              if (trigger) return;
              event.preventDefault();
              if (opener.current?.isConnected) opener.current.focus();
            }}
          >
            <div className="lv-dialog-body">
              <header className="lv-dialog-header">
                <DialogPrimitive.Title className="lv-dialog-title">{title}</DialogPrimitive.Title>
                <DialogPrimitive.Close
                  className="lv-icon-button"
                  aria-label="閉じる"
                  disabled={pending}
                >
                  <X size={16} />
                </DialogPrimitive.Close>
              </header>
              <DialogPrimitive.Description className="lv-dialog-description">
                {description}
              </DialogPrimitive.Description>
              {children}
              <footer className="lv-confirm-actions">
                <Button ref={cancel} disabled={pending} onClick={() => setOpen(false)}>
                  {cancelLabel}
                </Button>
                <Button
                  variant={tone === 'danger' ? 'danger' : 'primary'}
                  loading={pending}
                  onClick={confirm}
                >
                  {confirmLabel}
                </Button>
              </footer>
            </div>
          </DialogPrimitive.Content>
        </PortalSurface>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
