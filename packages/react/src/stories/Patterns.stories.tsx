import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { SCREEN_PARTS } from '../test/layout/screen-parts';
import { OperationsExample, SettingsExample, NewWorkDialog } from '../patterns/Operations';
import { ToastProvider } from '../index';
import { expect, fn, userEvent, within } from 'storybook/test';
const meta = {
  title: 'Patterns/Workspace',
  component: OperationsExample,
  parameters: {
    layoutGate: {
      screen: '部品を組み合わせた画面。操作の要素の網羅は、それぞれの部品の Story で見る。',
      parts: SCREEN_PARTS,
    } satisfies LayoutGate,
    layout: 'padded',
    docs: {
      description: {
        component:
          '日本語管理画面の組み合わせ例。すべてローカルのサンプルデータです。検索・絞り込み・全件ソート・選択・ページング・詳細・新規追加・CSV出力を試せます。再読み込みでリセットされます。',
      },
    },
  },
} satisfies Meta<typeof OperationsExample>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Operations: Story = {
  name: '作業モニター',
  args: { compact: false },
  argTypes: {
    compact: { control: 'boolean', description: '下部の負荷・ログのパネルを省略します。' },
  },
  render: (args) => <OperationsExample compact={args.compact as boolean} />,
};
/** 作業キューを「順に見る」に切り替え、一覧で選んだ行と同じ状態を1件ずつ決めます。見せ方は URL の ?view=queue に残ります。 */
export const OperationsQueue: Story = {
  name: '作業モニター・順に見る',
  args: { compact: true },
  render: (args) => <OperationsExample compact={args.compact as boolean} />,
  // Start from the list each time, even when an earlier run left ?view=queue in the URL.
  beforeEach: () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('view');
    window.history.replaceState(window.history.state, '', url);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('radio', { name: '順に見る' }));
    const card = await canvas.findByRole('article', { name: /ゲートウェイの接続確認/ });
    await expect(card).toHaveFocus();
    await userEvent.keyboard('y');
    await expect(
      await canvas.findByRole('article', { name: /エッジ端末の更新/ }),
    ).toBeInTheDocument();
  },
};
export const Settings: Story = {
  name: '設定画面',
  render: () => (
    <ToastProvider>
      <SettingsExample />
    </ToastProvider>
  ),
};
export const CreateWork: Story = {
  name: '新規作成フロー',
  render: () => (
    <ToastProvider>
      <NewWorkDialog onCreate={fn()} />
    </ToastProvider>
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '作業を追加' }));
    const body = within(canvasElement.ownerDocument.body);
    const dialog = within(body.getByRole('dialog'));
    await userEvent.click(dialog.getByRole('button', { name: '作業を追加' }));
    await expect(dialog.getByText('作業名を入力してください。')).toBeVisible();
    await userEvent.type(dialog.getByRole('textbox', { name: '作業名' }), 'Storybookで追加');
    await userEvent.click(dialog.getByRole('button', { name: '作業を追加' }));
    await expect(body.queryByRole('dialog')).not.toBeInTheDocument();
    await expect(body.getByText('作業を追加しました')).toBeVisible();
  },
};

export const NarrowReading: Story = {
  name: '320px · 文字間隔の拡大',
  parameters: {
    layoutStress:
      '行高 1.5 と文字間隔を上書きして、狭い幅で崩れないかを見る点検用。行の高さや操作の高さは上書きで格子から外れる。',
    docs: {
      description: {
        story:
          '幅320pxの領域で行高1.5、文字間隔0.12em、単語間隔0.16em、段落後2emを適用した点検用。表は内部で横スクロールします。ブラウザ200%ズームそのものの検査ではありません。',
      },
    },
  },
  render: () => (
    <div className="reading-stress" style={{ width: 320, maxWidth: '100%' }}>
      <OperationsExample />
    </div>
  ),
};
