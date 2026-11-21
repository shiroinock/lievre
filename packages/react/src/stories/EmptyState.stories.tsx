import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { EmptyState, Button, Card } from '../index';
import { Plus, FolderOpen } from 'lucide-react';

const meta = {
  title: 'Components/Feedback/EmptyState',
  component: EmptyState,
  parameters: {
    layoutGate: {
      parts: [{ name: '空の状態', selector: '.lv-empty', checks: ['inset-x'] }],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '空の理由と次の行動を明示します。検索結果ゼロと未作成を区別します。size="sm" は小さなパネルや表の中に置く形で、余白と文字を小さくし、絵は出しません。',
      },
    },
  },
  args: {
    title: 'まだ作業がありません',
    description: '最初の作業を追加して、モニタリングを始めましょう。',
  },
} satisfies Meta<typeof EmptyState>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithAction: Story = {
  args: {
    icon: <FolderOpen size={28} />,
    action: (
      <Button variant="primary" icon={<Plus size={14} />}>
        最初の作業を追加
      </Button>
    ),
  },
};
export const Filtered: Story = {
  args: {
    title: '一致する作業がありません',
    description: '条件を変えてもう一度検索してください。',
  },
};
/** 小さなパネルの中。余白と文字を小さくし、絵は出しません。 */
export const Small: Story = {
  render: () => (
    <div style={{ width: 320 }}>
      <Card title="最近の通知">
        <EmptyState
          size="sm"
          title="通知はありません"
          description="新しい通知が届くと、ここに並びます。"
          action={<Button size="sm">通知の設定</Button>}
        />
      </Card>
    </div>
  ),
};
