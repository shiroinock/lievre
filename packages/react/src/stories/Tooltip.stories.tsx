import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Tooltip, Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Feedback/Tooltip',
  component: Tooltip,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: 'ヒントを出すボタン',
          selector: '.lv-button',
          checks: [
            'inset-x',
            'inset-y',
            'control-height',
            { padding: 'button' },
            'fits',
            { icon: 'svg' },
          ],
        },
        { name: 'ツールチップ', selector: '.lv-tooltip', checks: ['inset-y', 'fits'] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          'ホバーとキーボードフォーカスで表示。無効ボタンを直接トリガーにしません（押せない理由を出すときは Button の disabledReason を使います）。重要情報は本文にも書きます。side と align で出す向きを選べ、画面の端で入らないときは反対側に回ります。',
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
/** キーボードで表示した状態。配置の検査は、この Story でツールチップを測ります。 */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(
      await within(canvasElement.ownerDocument.body).findByRole('tooltip'),
    ).toBeInTheDocument();
  },
};
/** 右に出す形。表の行の先頭の操作など、上に余白がないときに使います。 */
export const SideRight: Story = {
  args: { side: 'right' },
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    const tip = await within(canvasElement.ownerDocument.body).findByRole('tooltip');
    await expect(tip).toBeInTheDocument();
  },
};
export const SideBottomStart: Story = {
  args: { side: 'bottom', align: 'start' },
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(
      await within(canvasElement.ownerDocument.body).findByRole('tooltip'),
    ).toBeInTheDocument();
  },
};
