import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { ActionLink, Button, Card, Text } from '../index';
const meta = {
  title: 'Components/Actions/ActionLink',
  component: ActionLink,
  args: { children: '次のページへ', href: '#action-destination' },
  parameters: {
    layoutGate: {
      parts: [
        {
          name: 'リンクのボタン',
          selector: '.k-button',
          checks: [
            'inset-x',
            'inset-y',
            'control-height',
            { padding: 'button' },
            'fits',
            { icon: 'svg' },
          ],
        },
      ],
    } satisfies LayoutGate,
  },
} satisfies Meta<typeof ActionLink>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Large: Story = { args: { size: 'lg' } };
