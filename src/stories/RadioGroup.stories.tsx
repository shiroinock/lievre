import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioGroup, Button, Card, Text } from '../index';
const meta = {
  title: 'Components/Inputs/RadioGroup',
  component: RadioGroup,
  args: {
    label: '受け取り方法',
    options: [
      { value: 'email', label: 'メール', description: 'お知らせを受け取ります。' },
      { value: 'none', label: '受け取らない' },
    ],
  },
} satisfies Meta<typeof RadioGroup>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Selected: Story = { args: { defaultValue: 'email' } };
export const Disabled: Story = { args: { disabled: true } };
export const Error: Story = { args: { error: '受け取り方法を選んでください。', required: true } };
