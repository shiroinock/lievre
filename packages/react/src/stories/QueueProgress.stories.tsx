import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { QueueProgress } from '../index';

const meta = {
  title: 'Components/Queue/QueueProgress',
  component: QueueProgress,
  parameters: {
    layoutGate: {
      parts: [
        { name: '進み具合', selector: '.lv-queue-progress', checks: ['fits'] },
        {
          name: '進み具合の見出し',
          selector: '.lv-queue-progress .lv-progress-label',
          checks: [{ baseline: ':scope > *' }, 'line-grid'],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '終わりのある作業の進み具合。「5 / 12 件を確認」と件数で出し、線を添えます。割合だけにはしません。あとで回した件数は横に分けて出します。',
      },
    },
  },
  args: { done: 5, total: 12 },
} satisfies Meta<typeof QueueProgress>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithDeferred: Story = { args: { deferred: 2 } };
export const Finished: Story = { args: { done: 12 } };
export const Verb: Story = { args: { verb: '振り分け', done: 3, total: 8 } };
