import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert, Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Feedback/Alert',
  component: Alert,
  parameters: {
    docs: {
      description: {
        component:
          '画面に残しておくメッセージ。dangerはrole=alert、それ以外はrole=statusで補助技術に伝えます。',
      },
    },
  },
  args: { tone: 'info', title: 'お知らせ', children: '次回の更新予定を確認してください。' },
} satisfies Meta<typeof Alert>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};
export const Success: Story = {
  args: { tone: 'success', title: '同期が完了しました', children: 'すべてのデータは最新です。' },
};
export const Warning: Story = {
  args: {
    tone: 'warning',
    title: '接続を確認してください',
    children: 'ゲートウェイの応答に時間がかかっています。',
  },
};
export const Danger: Story = {
  args: {
    tone: 'danger',
    title: '保存できませんでした',
    children: '接続状態を確認して、もう一度お試しください。',
  },
};
export const Neutral: Story = { args: { tone: 'neutral', title: '確認事項があります' } };
