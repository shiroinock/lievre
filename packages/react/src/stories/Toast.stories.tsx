import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Button, ToastProvider, useToast } from '../index';
import { expect, userEvent, within } from 'storybook/test';
function Demo({ tone = 'success' }: { tone?: 'success' | 'error' }) {
  const toast = useToast();
  return (
    <Button
      onClick={() =>
        toast({
          title: tone === 'success' ? '設定を保存しました' : '保存できませんでした',
          description:
            tone === 'success'
              ? '変更がワークスペースに反映されました。'
              : '接続を確認して再試行してください。',
          tone,
        })
      }
    >
      通知を表示
    </Button>
  );
}
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
        { name: '通知を閉じるボタン', selector: '.lv-icon-button', checks: ['inset-x', 'inset-y'] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          'ToastProviderの子孫でuseToastを使います。5秒後に閉じ、閉じるボタン・スワイプ・F8での通知領域への移動に対応。重要なエラーは画面内のAlertにも残してください。',
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
/** 通知を出した状態。配置の検査は、この Story で通知を測ります。 */
export const Shown: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '通知を表示' }));
    await expect(
      await within(canvasElement.ownerDocument.body).findByText('設定を保存しました'),
    ).toBeVisible();
  },
};
