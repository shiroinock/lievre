import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { ConfirmDialog, Button, DropdownMenu, IconButton, Text } from '../index';
import { useState } from 'react';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

const meta = {
  title: 'Components/Overlays/ConfirmDialog',
  component: ConfirmDialog,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: 'ボタン',
          selector: '.k-button',
          checks: [
            'inset-x',
            'inset-y',
            'control-height',
            { padding: 'button' },
            'fits',
            { icon: 'svg' },
          ],
        },
        {
          name: 'アイコンだけのボタン',
          selector: '.k-icon-button',
          checks: ['inset-x', 'inset-y', 'control-height', 'square'],
        },
        {
          name: '確認の見出し',
          selector: '.k-dialog-header',
          checks: [{ icon: '.k-icon-button', text: '.k-dialog-title' }],
        },
        { name: '確認の本文', selector: '.k-dialog-body', checks: ['padding-equal', 'fits'] },
        {
          name: '確認の操作',
          selector: '.k-confirm-actions',
          checks: [{ sameHeight: '.k-button' }],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '削除・取り消し・送信の前の確認。ボタンは右に「キャンセル」「実行」の順で並べ、初めのフォーカスは取り消し側に置きます。実行のボタンには何が起きるかを動詞で書きます（「3件を削除」）。Escape・外側を押す・閉じるボタンは、どれも取り消しになります。onConfirm が Promise を返すと、終わるまで閉じずにボタンを処理中にします。',
      },
    },
  },
  args: {
    trigger: <Button icon={<Trash2 size={16} />}>選んだ3件を削除</Button>,
    title: '3件の作業を削除しますか？',
    description: '削除した作業は元に戻せません。作業に付いたメモと履歴も消えます。',
    confirmLabel: '3件を削除',
    tone: 'danger',
    onConfirm: fn(),
  },
  argTypes: { trigger: { control: false } },
} satisfies Meta<typeof ConfirmDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Danger: Story = {};
/** 取り消せる操作の確認。実行のボタンは主要操作の色です。 */
export const Default: Story = {
  args: {
    trigger: <Button variant="primary">申請を送信</Button>,
    title: '申請を送信しますか？',
    description: '送信すると、承認されるまで内容を変えられません。',
    confirmLabel: '送信する',
    tone: 'default',
  },
};
/** 開いた状態。配置の検査は、この Story でダイアログの中を測ります。 */
export const Open: Story = {
  args: {
    open: true,
    children: (
      <Text size="small" tone="muted">
        対象：在庫の照合、請求書の確認、エッジ端末の更新
      </Text>
    ),
  },
};
/** 初めのフォーカスは「キャンセル」。Escape で閉じ、フォーカスを開いた元に戻します。 */
export const FocusAndCancel: Story = {
  play: async ({ canvasElement, args }) => {
    const trigger = within(canvasElement).getByRole('button', { name: '選んだ3件を削除' });
    await userEvent.click(trigger);
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await body.findByRole('alertdialog', { name: '3件の作業を削除しますか？' });
    await expect(dialog).toHaveAccessibleDescription(/元に戻せません/);
    await expect(within(dialog).getByRole('button', { name: 'キャンセル' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(body.queryByRole('alertdialog')).not.toBeInTheDocument();
    await expect(trigger).toHaveFocus();
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};
/** 実行に時間がかかるときは、終わるまでボタンを処理中にして閉じさせません。 */
export const Pending: Story = {
  args: {
    onConfirm: fn(() => new Promise<void>((resolve) => setTimeout(resolve, 300))),
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '選んだ3件を削除' }));
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await body.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: '3件を削除' }));
    await expect(within(dialog).getByRole('button', { name: '3件を削除' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    await userEvent.keyboard('{Escape}');
    await expect(dialog).toBeInTheDocument();
    await waitFor(() => expect(body.queryByRole('alertdialog')).not.toBeInTheDocument());
  },
};
/** メニューの項目から開くときは、trigger を省き open を持ちます。閉じるとフォーカスはメニューを開いたボタンに戻ります。 */
export const FromMenu: Story = {
  render: function Render(args) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <DropdownMenu
          align="end"
          trigger={
            <IconButton variant="secondary" label="W-1024 の操作" icon={<MoreHorizontal />} />
          }
          items={[
            { label: '複製', onSelect: () => {} },
            { type: 'separator' },
            { label: '削除', tone: 'danger', onSelect: () => setOpen(true) },
          ]}
        />
        <ConfirmDialog
          {...args}
          trigger={undefined}
          title="W-1024 を削除しますか？"
          confirmLabel="削除"
          open={open}
          onOpenChange={setOpen}
        />
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: 'W-1024 の操作' });
    await userEvent.click(trigger);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(await body.findByRole('menuitem', { name: '削除' }));
    const dialog = await body.findByRole('alertdialog', { name: 'W-1024 を削除しますか？' });
    await expect(within(dialog).getByRole('button', { name: 'キャンセル' })).toHaveFocus();
    await userEvent.click(within(dialog).getByRole('button', { name: 'キャンセル' }));
    await expect(body.queryByRole('alertdialog')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};
