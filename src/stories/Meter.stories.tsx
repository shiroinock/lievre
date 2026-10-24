import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Meter, Button, Badge, TextField, DialogClose, ToastProvider, useToast } from '../index';
import { useState } from 'react';
import { Plus, Settings2, FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Data/Meter',
  component: Meter,
  parameters: {
    layoutGate: {
      parts: [{ name: 'メーター', selector: '.k-meter', checks: ['fits'] }],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '計器を思わせる測定値の表示。valueは0〜maxの範囲。role=meterと現在値・範囲を設定します。',
      },
    },
  },
  args: { value: 68, label: 'リソース使用率', max: 100, unit: '%' },
} satisfies Meta<typeof Meter>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Zero: Story = { args: { value: 0 } };
export const Full: Story = { args: { value: 100 } };
export const CustomRange: Story = { args: { value: 420, max: 1000, unit: 'rpm', label: '回転数' } };
export const Clamped: Story = { args: { value: -20 } };
