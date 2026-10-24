import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tooltip, Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Feedback/Tooltip',
  component: Tooltip,
  parameters: {
    docs: {
      description: {
        component:
          'ホバーとキーボードフォーカスで表示。無効ボタンを直接トリガーにしません。重要情報は本文にも書きます。',
      },
    },
  },
  args: {
    content: '設定の詳細を確認します',
    children: (
      <Button aria-label="設定のヒント" icon={<Settings2 size={15} />}>
        設定のヒント
      </Button>
    ),
  },
} satisfies Meta<typeof Tooltip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const LongText: Story = {
  args: { content: '補助情報は短く。重要な説明や必須操作をTooltipの中だけに隠さないでください。' },
};
