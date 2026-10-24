import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Spinner, Card, Text } from '../index';
import { expect, within } from 'storybook/test';

const meta = {
  title: 'Components/Feedback/Spinner',
  component: Spinner,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '読み込み中の印',
          selector: '.k-spinner',
          checks: [{ icon: 'svg' }, 'grid-height'],
        },
        { name: '文の中の印', selector: '.k-text', checks: [{ icon: '.k-spinner > svg' }] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '読み込み中の印。label を role="status" で読み上げ、動きを減らす設定では回転を止めます。文字の大きさと行の高さは置いた場所から引き継ぎ、印は1行目の中央に置きます。ボタンの中は Button の loading、表や一覧の形が分かるときは Skeleton を使います。',
      },
    },
  },
  args: { label: '一覧を読み込み中' },
  argTypes: { size: { control: 'inline-radio', options: ['sm', 'md'] } },
} satisfies Meta<typeof Spinner>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent('一覧を読み込み中');
  },
};
/** パネル全体の読み込みでは、文も画面に出します。 */
export const WithLabel: Story = {
  args: { showLabel: true, size: 'md' },
  render: (args) => (
    <Card title="今週の作業">
      <Spinner {...args} />
    </Card>
  ),
};
/** 文の中に置いても、印は行の中央に来ます。 */
export const InText: Story = {
  render: (args) => (
    <Text>
      最新の値を取り寄せています <Spinner {...args} />
    </Text>
  ),
};
