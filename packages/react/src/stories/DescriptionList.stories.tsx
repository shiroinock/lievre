import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { DescriptionList, Badge, Card } from '../index';
import { expect, within } from 'storybook/test';

const meta = {
  title: 'Components/Data/DescriptionList',
  component: DescriptionList,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '説明リストの行',
          selector: '.lv-dl-item',
          checks: [{ baseline: ':scope > *' }],
        },
        {
          name: '横並びの説明リスト',
          selector: ".lv-dl[data-layout='row']",
          checks: [
            { textEdge: 'start', of: ':scope > .lv-dl-item > .lv-dl-label' },
            { textEdge: 'start', of: ':scope > .lv-dl-item > .lv-dl-value' },
            'fits',
          ],
        },
        { name: '縦積みの説明リスト', selector: ".lv-dl[data-layout='stack']", checks: ['fits'] },
        { name: '項目名', selector: '.lv-dl-label', checks: ['line-grid'] },
        { name: '値', selector: '.lv-dl-value', checks: ['line-grid'] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '詳細・確認の画面の「項目名：値」の一覧。`<dl>` の意味を保ちます。layout="row" は項目名の列（既定 8em）と値を横に並べ、等幅の値と日本語の項目名でもベースラインをそろえます。幅が足りないと値を項目名の下に回します。layout="stack" は項目名の下に値を置き、columns の段に並べます。数値・ID・日時は mono: true。',
      },
    },
  },
  args: {
    items: [
      { label: '申請番号', value: 'REQ-2026-00481', mono: true },
      { label: '申請者', value: '計 花子' },
      { label: '状態', value: <Badge tone="warning">確認待ち</Badge> },
      { label: '受付日時', value: '2026-10-24 09:42', mono: true },
      {
        label: '連絡先のメールアドレス',
        value: 'hanako.lievre@example.co.jp',
      },
    ],
  },
} satisfies Meta<typeof DescriptionList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Row: Story = {
  play: async ({ canvasElement }) => {
    const list = within(canvasElement);
    await expect(list.getAllByRole('term')).toHaveLength(5);
    await expect(list.getAllByRole('definition')[0]).toHaveTextContent('REQ-2026-00481');
  },
};
/** 項目名の下に値を置き、段に並べます。長い値は wide で行いっぱいに広げます。 */
export const Stack: Story = {
  args: {
    layout: 'stack',
    columns: 2,
    items: [
      { label: '状態', value: <Badge tone="success">実行中</Badge> },
      { label: '担当', value: '計 花子' },
      { label: '優先度', value: '高' },
      { label: '最終更新', value: '10/24 09:42', mono: true },
      {
        label: 'メモ',
        value: '機材の電源を入れ直してから、接続を確かめてください。',
        wide: true,
      },
    ],
  },
};
export const ThreeColumns: Story = {
  args: {
    layout: 'stack',
    columns: 3,
    items: [
      { label: '本文', value: '16px／操作画面は14px' },
      { label: 'テーマ', value: 'Paper と Ink' },
      { label: 'コントラスト', value: 'すべての組み合わせをテストで検査' },
    ],
  },
};
/** 幅が足りないときは、値を項目名の下に回します。 */
export const Narrow: Story = {
  render: (args) => (
    <div style={{ width: 240 }}>
      <DescriptionList {...args} />
    </div>
  ),
};
export const InCard: Story = {
  render: (args) => (
    <Card title="入力内容の確認">
      <DescriptionList {...args} />
    </Card>
  ),
};
