import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Kbd, Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Display/Kbd',
  component: Kbd,
  parameters: {
    layoutGate: {
      parts: [{ name: 'キー', selector: '.k-kbd', checks: ['inset-x', 'inset-y', 'grid-height'] }],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          'キーボード操作の表記用。画面上で表示したショートカットは実際の機能と対応させてください。',
      },
    },
  },
  args: { children: 'Esc' },
} satisfies Meta<typeof Kbd>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Shortcut: Story = {
  render: () => (
    <span className="button-row">
      <Kbd>⌘</Kbd>
      <Kbd>K</Kbd>
      <span>コマンドを開く</span>
    </span>
  ),
};
