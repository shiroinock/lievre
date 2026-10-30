import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Text, Button, Card } from '../index';
const meta = {
  title: 'Components/Content/Text',
  component: Text,
  args: { children: '読み進めるための本文。役割に応じてサイズを選びます。' },
  parameters: {
    layoutGate: {
      parts: [{ name: '文章', selector: '.lv-text', checks: ['fits'] }],
    } satisfies LayoutGate,
  },
} satisfies Meta<typeof Text>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Body: Story = {};
export const Lead: Story = { args: { size: 'lead' } };
export const Caption: Story = { args: { size: 'small', tone: 'muted' } };
