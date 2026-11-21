import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Counter } from '../index';
import { expect, within } from 'storybook/test';

const meta = {
  title: 'Components/Feedback/Counter',
  component: Counter,
  parameters: {
    layoutGate: {
      parts: [{ name: '数の印', selector: '.lv-counter', checks: ['grid-height', 'inset-y'] }],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          'タブの件数や未読の数を示す小さな印。数字は等幅です。画面には数だけを出し、読み上げは label と unit を付けて「未読 12件」と伝えます。max を超えると「99+」に縮めます。状態は色だけでなく数で伝わるので、tone は強さの違いです。',
      },
    },
  },
  args: { value: 12, label: '未読' },
} satisfies Meta<typeof Counter>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('未読 12件')).toBeInTheDocument();
  },
};
export const Tones: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Counter value={3} label="下書き" />
      <Counter value={12} label="未読" tone="accent" />
      <Counter value={2} label="エラー" tone="danger" />
    </div>
  ),
};
/** max を超えた数。画面は「99+」、読み上げは「通知 99件より多い」です。 */
export const Overflow: Story = {
  args: { value: 240, label: '通知', tone: 'accent' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText('99+')).toBeVisible();
    await expect(c.getByText('通知 99件より多い')).toBeInTheDocument();
  },
};
/** 見出しの横に置く例。 */
export const BesideLabel: Story = {
  render: () => (
    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      受信箱 <Counter value={8} label="未読" />
    </span>
  ),
};
