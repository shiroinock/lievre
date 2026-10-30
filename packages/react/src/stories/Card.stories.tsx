import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Card, Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Layout/Card',
  component: Card,
  parameters: {
    layoutGate: {
      parts: [
        { name: 'カードの本文', selector: '.k-card-body', checks: ['padding-equal'] },
        // The action sits on the centre of the heading block (eyebrow and title together).
        {
          name: 'カードの見出し',
          selector: '.k-card-header',
          checks: [{ icon: ':scope > .k-button', text: ':scope > div', block: true }],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '関係のある情報をまとめるsection。タイトルはh2なので、画面側の見出し階層を確認してください。',
      },
    },
  },
  args: {
    title: '稼働状況',
    eyebrow: '計測ラボ',
    children: <p>関連する情報を1つの領域にまとめます。</p>,
  },
} satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithAction: Story = { args: { action: <Button size="sm">詳細を開く</Button> } };
export const WithActionTitleOnly: Story = {
  args: { eyebrow: undefined, action: <Button size="sm">詳細を開く</Button> },
};
export const WithoutHeading: Story = { args: { title: undefined, eyebrow: undefined } };
