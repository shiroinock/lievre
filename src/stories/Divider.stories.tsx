import type { Meta, StoryObj } from '@storybook/react-vite';
import { Divider, Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Layout/Divider',
  component: Divider,
  parameters: {
    docs: { description: { component: '関連するまとまりの境界。role=separatorを持ちます。' } },
  },
} satisfies Meta<typeof Divider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithLabel: Story = { args: { label: 'DETAILS' } };
