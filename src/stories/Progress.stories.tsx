import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Progress, Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Data/Progress',
  component: Progress,
  parameters: {
    layoutGate: {
      parts: [
        { name: '進み具合', selector: '.k-progress-wrap', checks: ['fits'] },
        {
          name: '進み具合の見出し',
          selector: '.k-progress-label',
          checks: [{ baseline: ':scope > *' }],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component: '値は0〜100に丸めます。名称と数値を補助技術に伝え、数値の常時表示を推奨します。',
      },
    },
  },
  args: { label: 'データ同期', value: 68, showValue: true },
} satisfies Meta<typeof Progress>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { value: 0 } };
export const Complete: Story = { args: { value: 100 } };
export const Clamped: Story = { args: { value: 130 } };
export const HiddenValue: Story = { args: { showValue: false } };
