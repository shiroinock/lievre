import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Alert, Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useRef, useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Feedback/Alert',
  component: Alert,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: 'お知らせ',
          selector: '.lv-alert',
          checks: ['padding-equal', { icon: ':scope > svg' }],
        },
        {
          name: 'お知らせの閉じるボタン',
          selector: '.lv-alert-dismiss',
          checks: ['inset-x', 'inset-y', 'control-height', 'square'],
        },
        {
          name: 'お知らせの見出しと閉じるボタン',
          selector: '.lv-alert',
          checks: [{ icon: '.lv-alert-dismiss', text: 'strong' }],
        },
        {
          name: 'お知らせの操作',
          selector: '.lv-alert-actions .lv-button',
          checks: [
            'inset-x',
            'inset-y',
            'control-height',
            { padding: 'button' },
            'fits',
            { icon: 'svg' },
          ],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '画面に残しておくメッセージ。dangerはrole=alert、それ以外はrole=statusで補助技術に伝えます。actionで本文の下に操作を置き、onDismissを渡すと閉じるボタンを出します。閉じたあとは、続きの場所にフォーカスを移します。',
      },
    },
  },
  args: { tone: 'info', title: 'お知らせ', children: '次回の更新予定を確認してください。' },
} satisfies Meta<typeof Alert>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};
export const Success: Story = {
  args: { tone: 'success', title: '同期が完了しました', children: 'すべてのデータは最新です。' },
};
export const Warning: Story = {
  args: {
    tone: 'warning',
    title: '接続を確認してください',
    children: 'ゲートウェイの応答に時間がかかっています。',
  },
};
export const Danger: Story = {
  args: {
    tone: 'danger',
    title: '保存できませんでした',
    children: '接続状態を確認して、もう一度お試しください。',
  },
};
export const Neutral: Story = { args: { tone: 'neutral', title: '確認事項があります' } };
/** 操作の場所。この知らせを受けてすることを Button の sm で置きます。 */
export const WithAction: Story = {
  args: {
    tone: 'warning',
    title: '一部の行を読み込めませんでした',
    children: '3件の行が古い形式のままです。',
    action: (
      <>
        <Button size="sm">再読み込み</Button>
        <Button size="sm" variant="ghost">
          詳細を見る
        </Button>
      </>
    ),
  },
};
function DismissDemo() {
  const [open, setOpen] = useState(true);
  const heading = useRef<HTMLHeadingElement>(null);
  return (
    <section>
      <h2 ref={heading} tabIndex={-1} className="lv-heading lv-heading--section">
        同期の状態
      </h2>
      {open && (
        <Alert
          tone="success"
          title="同期が完了しました"
          dismissLabel="同期のお知らせを閉じる"
          onDismiss={() => {
            setOpen(false);
            // The close button goes with the alert: hand focus to where the reader goes on.
            heading.current?.focus();
          }}
        >
          すべてのデータは最新です。
        </Alert>
      )}
    </section>
  );
}
/** 閉じるボタン。閉じたあとは、続きの場所にフォーカスを移します。 */
export const Dismissible: Story = {
  render: () => <DismissDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '同期のお知らせを閉じる' }));
    await expect(canvas.queryByRole('status')).not.toBeInTheDocument();
    await expect(canvas.getByRole('heading', { name: '同期の状態' })).toHaveFocus();
  },
};
/** 操作と閉じるボタンの両方。 */
export const WithActionAndDismiss: Story = {
  args: {
    tone: 'info',
    title: '新しい版があります',
    children: '画面を読み込み直すと、新しい版になります。',
    action: <Button size="sm">読み込み直す</Button>,
    onDismiss: fn(),
  },
};
