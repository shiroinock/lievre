import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import {
  Pagination,
  Button,
  Badge,
  TextField,
  DialogClose,
  ToastProvider,
  useToast,
} from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Navigation/Pagination',
  component: Pagination,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: 'ページ送り',
          selector: '.lv-pagination',
          checks: [{ sameHeight: '.lv-button' }, { icon: '.lv-button', text: ':scope > span' }],
        },
        {
          name: 'ページ送りのボタン',
          selector: '.lv-pagination .lv-button',
          checks: ['inset-x', 'inset-y', 'control-height'],
        },
        {
          name: 'ページ番号',
          selector: '.lv-pagination-page',
          checks: ['inset-x', 'inset-y', 'control-height'],
        },
        {
          name: '表示件数の選択',
          selector: '.lv-pagination .lv-select-trigger',
          checks: ['inset-y', 'control-height', { padding: 'input' }],
        },
        {
          name: '件数の範囲',
          selector: '.lv-pagination-range',
          checks: ['line-grid', { baseline: ':scope > .lv-tabular' }],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '先頭・末尾では移動できないボタンを無効にし、押したボタンが無効になったらフォーカスを反対のボタンへ移します。いまのページは「5ページ中2ページ目」と読み上げ、変わると知らせます。pageとonPageChangeで制御します。DataTableのページ送りには、これを使わずDataTableのpageSizeを使います。variant="numbers" でページ番号を並べ（端と今のページの前後だけを出し、間は「…」で省きます）、今のページは aria-current="page" と選択の面で示します。totalCount と pageSize で「128件中 21〜40件」を出し、pageSizeOptions で1ページの件数を選べます。',
      },
    },
  },
  args: { page: 2, totalPages: 5, onPageChange: fn() },
} satisfies Meta<typeof Pagination>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: (args) => <PaginationDemo {...args} /> };
export const FirstPage: Story = { args: { page: 1 } };
export const LastPage: Story = { args: { page: 5 } };
export const SinglePage: Story = { args: { page: 1, totalPages: 1 } };
function PaginationDemo(args: React.ComponentProps<typeof Pagination>) {
  const [page, setPage] = useState(args.page);
  return <Pagination {...args} page={page} onPageChange={setPage} />;
}
export const Numbers: Story = {
  args: { variant: 'numbers', page: 6, totalPages: 12 },
  render: (args) => <PaginationDemo {...args} />,
};
/** 端のページの近くでは、省かずに番号を並べます。 */
export const NumbersNearStart: Story = { args: { variant: 'numbers', page: 2, totalPages: 12 } };
export const NumbersFew: Story = { args: { variant: 'numbers', page: 2, totalPages: 4 } };
function WithSizeDemo() {
  const [page, setPage] = useState(2);
  const [size, setSize] = useState(20);
  const total = 128;
  return (
    <Pagination
      variant="numbers"
      page={page}
      totalPages={Math.ceil(total / size)}
      onPageChange={setPage}
      totalCount={total}
      pageSize={size}
      pageSizeOptions={[20, 50, 100]}
      onPageSizeChange={(n) => {
        setSize(n);
        setPage(1);
      }}
    />
  );
}
/** 件数の範囲と、1ページの件数の選択。 */
export const WithRangeAndSize: Story = {
  render: () => <WithSizeDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent('128件中 21〜40件');
    await userEvent.click(canvas.getByRole('button', { name: '3ページ目' }));
    await expect(canvas.getByRole('button', { name: '3ページ目' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  },
};
