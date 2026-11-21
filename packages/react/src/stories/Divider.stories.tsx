import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Divider, Button } from '../index';

const meta = {
  title: 'Components/Layout/Divider',
  component: Divider,
  parameters: {
    layoutGate: {
      parts: [
        { name: '区切り線', selector: '.lv-divider:not(.lv-divider--vertical)', checks: ['fits'] },
        { name: '縦の区切り線', selector: '.lv-divider--vertical', checks: ['fits'] },
        // The buttons only give the line a row to divide; Button measures them in its own story.
        { name: '並びのボタン', selector: '.lv-button', checks: ['control-height'] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '関連するまとまりの境界。role=separatorを持ちます。orientation="vertical" は横に並ぶ操作の間に置く縦の線で、並びの高さに伸びます。decorative は見た目だけの線にします。',
      },
    },
  },
} satisfies Meta<typeof Divider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithLabel: Story = { args: { label: '詳細' } };
/** 横に並ぶ操作のまとまりを分ける縦の線。 */
export const Vertical: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <Button variant="ghost">切り取り</Button>
      <Button variant="ghost">複写</Button>
      <Divider orientation="vertical" />
      <Button variant="ghost">削除</Button>
    </div>
  ),
};
