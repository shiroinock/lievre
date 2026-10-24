import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, ToastProvider, useToast } from '../index';
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
