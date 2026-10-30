import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Container, Button, Card, Text } from '../index';
const meta = {
  title: 'Components/Layout/Container',
  component: Container,
  args: {
    width: 'reading',
    children: '読み物の幅を制限します。コンテンツは画面に合わせて縮みます。',
  },
  parameters: {
    layoutGate: {
      parts: [{ name: 'コンテナ', selector: '.lv-container', checks: ['fits'] }],
    } satisfies LayoutGate,
  },
} satisfies Meta<typeof Container>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Reading: Story = {};
export const Wide: Story = { args: { width: 'wide' } };
export const Full: Story = { args: { width: 'full' } };
