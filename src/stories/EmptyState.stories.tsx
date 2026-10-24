import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import {
  EmptyState,
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
  title: 'Components/Feedback/EmptyState',
  component: EmptyState,
  parameters: {
    layoutGate: {
      parts: [{ name: '空の状態', selector: '.k-empty', checks: ['inset-x'] }],
    } satisfies LayoutGate,
    docs: {
      description: {
        component: '空の理由と次の行動を明示します。検索結果ゼロと未作成を区別します。',
      },
    },
  },
  args: {
    title: 'まだ作業がありません',
    description: '最初の作業を追加して、モニタリングを始めましょう。',
  },
} satisfies Meta<typeof EmptyState>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithAction: Story = {
  args: {
    icon: <FolderOpen size={28} />,
    action: (
      <Button variant="primary" icon={<Plus size={14} />}>
        最初の作業を追加
      </Button>
    ),
  },
};
export const Filtered: Story = {
  args: {
    title: '一致する作業がありません',
    description: '条件を変えてもう一度検索してください。',
  },
};
