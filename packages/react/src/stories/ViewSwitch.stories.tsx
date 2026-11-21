import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { ViewSwitch } from '../index';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

function Controlled({ initial = 'queue' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <ViewSwitch value={value} onValueChange={setValue} />;
}

const meta = {
  title: 'Components/Queue/ViewSwitch',
  component: ViewSwitch,
  render: (args) => <Controlled initial={args.value} />,
  args: { value: 'queue', onValueChange: () => {} },
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '見せ方の切り替え',
          selector: '.lv-view-switch-item',
          checks: ['control-height', 'inset-x', 'inset-y', { padding: 'button' }],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '同じ項目の見せ方を「順に見る」「一覧から選ぶ」で切り替えます。状態は1つのまま、見せ方だけを変えます。選んでいる側は面・線・太さで示し、矢印キーで移動します。',
      },
    },
  },
} satisfies Meta<typeof ViewSwitch>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ListSelected: Story = { args: { value: 'list' } };

/** 選んでいる側をもう一度押しても、選択は外れません。 */
export const KeepsSelection: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const queue = canvas.getByRole('radio', { name: '順に見る' });
    await userEvent.click(queue);
    expect(queue).toBeChecked();
    await userEvent.click(canvas.getByRole('radio', { name: '一覧から選ぶ' }));
    expect(canvas.getByRole('radio', { name: '一覧から選ぶ' })).toBeChecked();
    expect(queue).not.toBeChecked();
  },
};
