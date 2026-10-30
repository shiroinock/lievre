import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Link, Button, Card, Text } from '../index';
const meta = {
  title: 'Components/Navigation/Link',
  component: Link,
  args: { children: '詳細を読む', href: '#link-destination' },
  parameters: {
    layoutGate: {
      parts: [{ name: 'リンク', selector: '.lv-link', checks: ['fits'] }],
    } satisfies LayoutGate,
  },
} satisfies Meta<typeof Link>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  render: (args) => (
    <div>
      <Link {...args} />
      <p id="link-destination">リンクの移動先です。</p>
    </div>
  ),
};
