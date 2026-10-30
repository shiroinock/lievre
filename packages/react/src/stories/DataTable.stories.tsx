import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { useState } from 'react';
import { DataTable, Badge, type Column, type TableSort } from '../index';
import { expect, userEvent, within } from 'storybook/test';
type Row = { id: string; name: string; value: number; status: string };
const rows: Row[] = [
  { id: 'KEI-01', name: 'センサーA', value: 42, status: '稼働中' },
  { id: 'KEI-02', name: 'ゲートウェイB', value: 16, status: '要確認' },
  { id: 'KEI-03', name: 'ストレージC', value: 68, status: '稼働中' },
];
const columns: Column<Row>[] = [
  { key: 'name', header: '名前', render: (r) => r.name, sortValue: (r) => r.name },
  {
    key: 'value',
    header: '使用率',
    align: 'right',
    render: (r) => (
      <span>
        <span className="k-mono">{r.value}</span>%
      </span>
    ),
    sortValue: (r) => r.value,
  },
  {
    key: 'status',
    header: '状態',
    render: (r) => (
      <Badge tone={r.status === '稼働中' ? 'success' : 'warning'} dot>
        {r.status}
      </Badge>
    ),
  },
];
const meta = {
  title: 'Components/Data/DataTable',
  component: DataTable<Row>,
  args: {
    rows,
    columns,
    getRowId: (r: Row) => r.id,
    caption: '機材一覧',
    loading: false,
    selectable: false,
  },
  parameters: {
    layoutGate: {
      parts: [
        { name: '表の見出しのセル', selector: '.k-table th', checks: ['inset-y'] },
        // The empty state is a block of several lines; like a panel, its half-leading is not
        // held to the one-line centre. EmptyState is measured in its own story.
        {
          name: '表のセル',
          selector: '.k-table td:not(:has(.k-empty))',
          checks: ['inset-y', 'line-grid'],
        },
        {
          name: 'ページ送りの帯',
          selector: '.k-table-pager',
          checks: ['inset-x', 'inset-y', 'fits', { icon: '.k-pagination', text: '.k-table-count' }],
        },
        {
          name: '並べ替えのボタン',
          selector: '.k-table-sort',
          checks: ['grid-height', { icon: 'svg' }],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          'ネイティブtableの意味論を維持。sortValueのある列はソート可能。選択とソートは内部管理・外部制御の両方に対応。pageSizeを渡すと、全件を並べ替えてから区切り、表の下に件数とページ送りを描きます。並べ替えとページ分けをサーバーに任せるときは dataMode="server" と totalCount を渡します。',
      },
    },
  },
} satisfies Meta<typeof DataTable<Row>>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Selectable: Story = { args: { selectable: true } };
export const Loading: Story = { args: { loading: true } };
export const Empty: Story = { args: { rows: [] } };
export const LongJapanese: Story = {
  args: {
    rows: [
      {
        id: 'LONG-01',
        name: '非常に長い日本語の機材名でも情報を欠落させずに横スクロールで確認できる機材',
        value: 99,
        status: '要確認',
      },
    ],
  },
};
export const SortAndSelect: Story = {
  args: { selectable: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: '使用率' }));
    await expect(c.getAllByRole('row')[1]).toHaveTextContent('ゲートウェイB');
    await userEvent.click(c.getByRole('checkbox', { name: '表示中のすべてを選択' }));
    for (const checkbox of c.getAllByRole('checkbox')) await expect(checkbox).toBeChecked();
  },
};

const many: Row[] = Array.from({ length: 12 }, (_, i) => ({
  id: `KEI-${String(i + 1).padStart(2, '0')}`,
  name: `機材${i + 1}`,
  // 1ページ目に最小も最大も来ない並びにして、区切ってから並べ替えると結果が変わるようにする。
  value: [40, 55, 61, 47, 3, 72, 58, 99, 44, 50, 66, 52][i],
  status: i % 4 === 0 ? '要確認' : '稼働中',
}));
/** 全件を渡し、pageSize で区切ります。並べ替えは全件にかかり、変えると1ページ目に戻ります。 */
export const Paginated: Story = {
  args: { rows: many, pageSize: 5 },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('12件中 1〜5件目')).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: '次のページ' }));
    await expect(c.getByRole('status')).toHaveTextContent('3ページ中 2ページ目');
    await userEvent.click(c.getByRole('button', { name: '使用率' }));
    await expect(c.getByRole('status')).toHaveTextContent('3ページ中 1ページ目');
    await expect(c.getAllByRole('row')[1]).toHaveTextContent('機材5');
  },
};
/** サーバーが並べ替えて区切った1ページ分を受け取る形。手元では並べ替えず、総件数からページ数を出します。 */
export const ServerSide: Story = {
  render: (args) => <ServerDemo {...args} />,
};
function ServerDemo(args: React.ComponentProps<typeof DataTable<Row>>) {
  const [sorting, setSorting] = useState<TableSort>(null);
  const [page, setPage] = useState(1);
  // サーバーの代わり。本来は sorting と page を付けて取り直します。
  const sorted = sorting
    ? [...many].sort(
        (a, b) =>
          (sorting.key === 'value' ? a.value - b.value : a.name.localeCompare(b.name, 'ja')) *
          (sorting.direction === 'asc' ? 1 : -1),
      )
    : many;
  return (
    <DataTable
      {...args}
      dataMode="server"
      rows={sorted.slice((page - 1) * 5, page * 5)}
      totalCount={many.length}
      pageSize={5}
      page={page}
      onPageChange={setPage}
      sorting={sorting}
      onSortingChange={setSorting}
    />
  );
}
