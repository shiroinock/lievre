import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Divider, Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Layout/Divider',
  component: Divider,
  parameters: {
    layoutGate: {
      parts: [{ name: '区切り線', selector: '.lv-divider', checks: ['fits'] }],
    } satisfies LayoutGate,
    docs: { description: { component: '関連するまとまりの境界。role=separatorを持ちます。' } },
  },
} satisfies Meta<typeof Divider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithLabel: Story = { args: { label: '詳細' } };
