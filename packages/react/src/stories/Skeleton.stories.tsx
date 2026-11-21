import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Skeleton } from '../index';

const meta = {
  title: 'Components/Feedback/Skeleton',
  component: Skeleton,
  parameters: {
    layoutGate: {
      parts: [
        { name: '仮表示', selector: '.lv-skeleton', checks: ['grid-height'] },
        { name: '仮の本文の行', selector: '.lv-skeleton-line', checks: ['grid-height'] },
        { name: '仮の丸', selector: '.lv-skeleton--circle', checks: ['square'] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '読込後のレイアウトを保つ仮表示。shape は rect（四角）・text（本文の行）・circle（丸）。text の行は本文の行の高さで並び、最後の行だけ短くします。動きを減らす設定ではアニメーションを止めます。',
      },
    },
  },
  args: { width: 240, height: 20, label: '読み込み中' },
} satisfies Meta<typeof Skeleton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Panel: Story = {
  render: () => (
    <div className="gallery-stack" style={{ width: 320 }}>
      <Skeleton width="40%" />
      <Skeleton height={24} />
      <Skeleton height={24} />
      <Skeleton width="70%" />
    </div>
  ),
};
/** 本文の行。読み込んだ文と同じ高さを取ります。 */
export const TextLines: Story = {
  args: { shape: 'text', lines: 3, width: 320, label: '説明を読み込み中' },
};
/** 丸と本文の組み合わせ。一覧の1行（利用者の顔と名前）を待つ形です。 */
export const ListItem: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Skeleton shape="circle" width={40} label="利用者を読み込み中" />
      <div style={{ width: 240 }}>
        <Skeleton shape="text" lines={2} label="利用者の名前を読み込み中" />
      </div>
    </div>
  ),
};
