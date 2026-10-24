import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataTable, Badge, type Column } from '../index';
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
    docs: {
      description: {
        component:
          'ネイティブtableの意味論を維持。sortValueのある列はソート可能。選択とソートは内部管理・外部制御の両方に対応。ページング時は全件を先にソートし、sorting/onSortingChangeを渡します。',
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
