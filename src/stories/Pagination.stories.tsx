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
          selector: '.k-pagination',
          checks: [{ sameHeight: '.k-button' }, { icon: '.k-button', text: ':scope > span' }],
        },
        {
          name: 'ページ送りのボタン',
          selector: '.k-pagination .k-button',
          checks: ['inset-x', 'inset-y', 'control-height'],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '先頭・末尾では移動できないボタンを無効にし、押したボタンが無効になったらフォーカスを反対のボタンへ移します。いまのページは「5ページ中2ページ目」と読み上げ、変わると知らせます。pageとonPageChangeで制御します。DataTableのページ送りには、これを使わずDataTableのpageSizeを使います。',
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
