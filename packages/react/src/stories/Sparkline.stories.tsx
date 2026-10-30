import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import {
  Sparkline,
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
  title: 'Components/Data/Sparkline',
  component: Sparkline,
  parameters: {
    layoutGate: {
      parts: [{ name: '折れ線', selector: '.lv-sparkline', checks: ['grid-height', 'fills-x'] }],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '傾向を補助する図。具体的な値が必要な場合は表や数値を併用します。SVGにtitleを付けます。',
      },
    },
  },
  args: { values: [3, 7, 4, 8, 6, 12, 10, 14, 11, 18], label: '直近10回の処理数の推移' },
} satisfies Meta<typeof Sparkline>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Success: Story = { args: { color: 'success' } };
export const Constant: Story = { args: { values: [5, 5, 5, 5, 5], label: '一定の値' } };
export const Empty: Story = { args: { values: [], label: '推移データなし' } };
