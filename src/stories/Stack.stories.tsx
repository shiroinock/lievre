import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack, Button, Card, Text } from '../index';
const meta = {
  title: 'Components/Layout/Stack',
  component: Stack,
  args: { gap: 4 },
} satisfies Meta<typeof Stack>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Column: Story = {
  render: (args) => (
    <Stack {...args}>
      {['ひとつめ', 'ふたつめ', 'みっつめ'].map((t) => (
        <Button key={t}>{t}</Button>
      ))}
    </Stack>
  ),
};
export const Row: Story = { ...Column, args: { direction: 'row', gap: 3 } };
