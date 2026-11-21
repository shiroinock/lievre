import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Metric, PauseControl, useAutoAdvance } from '../index';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

const readings = ['99.2', '99.1', '99.4', '99.3', '99.5'];

/** A figure refreshed on a timer, with the control that stops it (WCAG 2.2.2). */
function AutoRefresh({ defaultPaused }: { defaultPaused?: boolean }) {
  const [i, setI] = useState(0);
  const { paused, setPaused } = useAutoAdvance({
    interval: 3000,
    onTick: () => setI((n) => (n + 1) % readings.length),
    defaultPaused,
  });
  return (
    <div className="lv-queue">
      <PauseControl paused={paused} onPausedChange={setPaused} label="処理の成功率の自動更新" />
      <Metric label="処理の成功率" value={readings[i]} unit="%" change="3秒ごとに取り直します" />
    </div>
  );
}

const meta = {
  title: 'Components/Queue/PauseControl',
  component: PauseControl,
  render: (args) => <AutoRefresh defaultPaused={args.paused} />,
  args: { paused: true, onPausedChange: () => {}, label: '処理の成功率の自動更新' },
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '止める操作',
          selector: '.lv-pause-control',
          checks: [{ baseline: ':scope > *' }, 'fits'],
        },
        {
          name: '止めるボタン',
          selector: '.lv-pause-control .lv-button',
          checks: ['control-height', 'inset-x', 'inset-y', { icon: 'svg' }],
        },
        { name: '指標', selector: '.lv-metric', checks: ['padding-equal', 'fits'] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '時間で進む動き（自動の更新・切り替え）を止める・再開する操作。useAutoAdvance は、動きを減らす設定では止めた状態で始めます。DecisionQueue は時間で進まないので要りません。',
      },
    },
  },
} satisfies Meta<typeof PauseControl>;
export default meta;
type Story = StoryObj<typeof meta>;

/** 見本は止めた状態で始めます（画面の検査で数値が動かないように）。 */
export const Default: Story = {};
export const Running: Story = { args: { paused: false } };

export const Toggle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole('status')).toHaveTextContent('止めています');
    await userEvent.click(canvas.getByRole('button', { name: '再開する' }));
    expect(canvas.getByRole('status')).toHaveTextContent('自動で更新しています');
    await userEvent.click(canvas.getByRole('button', { name: '止める' }));
    expect(canvas.getByRole('group', { name: '処理の成功率の自動更新' })).toBeInTheDocument();
  },
};
