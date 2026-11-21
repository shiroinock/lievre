import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Button, ToastProvider, useToast, type ToastMessage } from '../index';
import { expect, userEvent, within } from 'storybook/test';
const MESSAGES: Record<NonNullable<ToastMessage['tone']>, ToastMessage> = {
  success: { title: '設定を保存しました', description: '変更がワークスペースに反映されました。' },
  error: { title: '保存できませんでした', description: '接続を確認して再試行してください。' },
  info: { title: '新しい版があります', description: '次に開いたときに切り替わります。' },
  warning: { title: '容量が残りわずかです', description: '使っている容量が 90% を超えました。' },
};
function Demo({
  tone = 'success',
  action,
}: {
  tone?: NonNullable<ToastMessage['tone']>;
  action?: ToastMessage['action'];
}) {
  const toast = useToast();
  return <Button onClick={() => toast({ ...MESSAGES[tone], tone, action })}>通知を表示</Button>;
}
const undo: ToastMessage['action'] = {
  label: '元に戻す',
  altText: '削除した作業は、履歴の画面から元に戻せます。',
  onClick: () => {},
};
const meta = {
  title: 'Components/Overlays/Toast',
  component: ToastProvider,
  args: { children: null },
  render: () => (
    <ToastProvider>
      <Demo />
    </ToastProvider>
  ),
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '通知を出すボタン',
          selector: '.lv-button',
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
          name: '通知',
          selector: '.lv-toast',
          checks: ['padding-equal', { icon: ':scope > svg' }],
        },
        {
          name: '通知の操作',
          selector: '.lv-toast-actions .lv-button',
          checks: ['inset-x', 'inset-y', 'control-height', { padding: 'button' }, 'fits'],
        },
        { name: '通知を閉じるボタン', selector: '.lv-icon-button', checks: ['inset-x', 'inset-y'] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          'ToastProviderの子孫でuseToastを使います。5秒後に閉じ、閉じるボタン・スワイプ・F8での通知領域への移動に対応。重要なエラーは画面内のAlertにも残してください。tone は success・error・info・warning。action（「元に戻す」など）を渡すと、操作する時間を取れるように自動では閉じません。altText には通知の外で同じ操作ができる場所を書きます。',
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Success: Story = {};
export const Error: Story = {
  render: () => (
    <ToastProvider>
      <Demo tone="error" />
    </ToastProvider>
  ),
};
export const Info: Story = {
  render: () => (
    <ToastProvider>
      <Demo tone="info" />
    </ToastProvider>
  ),
};
export const Warning: Story = {
  render: () => (
    <ToastProvider>
      <Demo tone="warning" />
    </ToastProvider>
  ),
};
/** 操作のある通知を出した状態。自動では閉じず、操作を押すと閉じます。 */
export const ShownWithAction: Story = {
  render: () => (
    <ToastProvider>
      <Demo tone="info" action={undo} />
    </ToastProvider>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '通知を表示' }));
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findByRole('button', { name: '元に戻す' })).toBeVisible();
  },
};
/** 通知を出した状態。配置の検査は、この Story で通知を測ります。 */
export const Shown: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '通知を表示' }));
    await expect(
      await within(canvasElement.ownerDocument.body).findByText('設定を保存しました'),
    ).toBeVisible();
  },
};
