import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Breadcrumb,
  Button,
  Badge,
  TextField,
  DialogClose,
  ToastProvider,
  useToast,
} from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Navigation/Breadcrumb',
  component: Breadcrumb,
  parameters: {
    docs: {
      description: {
        component: '現在地はaria-current=page。最後の項目をリンクにせず現在地を示します。',
      },
    },
  },
  args: {
    items: [
      { label: 'ホーム', href: '#' },
      { label: 'ワークスペース', href: '#' },
      { label: '作業モニター' },
    ],
  },
} satisfies Meta<typeof Breadcrumb>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SingleLevel: Story = { args: { items: [{ label: 'ワークスペース' }] } };
