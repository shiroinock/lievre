import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { VisuallyHidden, Button, DataTable } from '../index';
import { ChevronRight } from 'lucide-react';
import { expect, within } from 'storybook/test';

const meta = {
  title: 'Components/Data/VisuallyHidden',
  component: VisuallyHidden,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '隠した文字を含むボタン',
          selector: '.k-button',
          checks: ['inset-x', 'inset-y', 'control-height', { padding: 'button' }, 'fits'],
        },
        { name: '表の枠', selector: '.k-table-wrap', checks: ['fits'] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '画面には出さず、読み上げにだけ伝える文字。並んだ「詳細」ボタンのどれが何の行かを読み上げで分かるようにするときなどに使います。配置には影響せず、ボタンの中央揃えやはみ出しの検査も変わりません。名前そのものを付けるだけなら aria-label か IconButton の label を使います。',
      },
    },
  },
  args: { children: '（W-1024）' },
} satisfies Meta<typeof VisuallyHidden>;
export default meta;
type Story = StoryObj<typeof meta>;

/** 行の端の「詳細」ボタンに、読み上げ用の作業 ID を足します。 */
export const InRowActions: Story = {
  render: () => (
    <DataTable
      caption="作業の一覧"
      rows={[
        { id: 'W-1024', name: '在庫の照合' },
        { id: 'W-1025', name: '請求書の確認' },
      ]}
      getRowId={(r) => r.id}
      columns={[
        { key: 'name', header: '作業', render: (r) => r.name },
        {
          key: 'actions',
          header: '操作',
          align: 'right',
          render: (r) => (
            <Button size="sm" variant="ghost">
              詳細
              <VisuallyHidden>（{r.id}）</VisuallyHidden>
              <ChevronRight size={14} aria-hidden />
            </Button>
          ),
        },
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /詳細\s*（W-1024）/ })).toBeVisible();
    await expect(canvas.getByText('（W-1024）')).toHaveClass('k-sr-only');
  },
};
