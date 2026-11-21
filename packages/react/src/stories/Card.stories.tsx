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
        { name: 'カードの本文', selector: '.lv-card-body', checks: ['padding-equal'] },
        {
          name: '選べるカードの見出し',
          selector: '.lv-card-header:has(> .lv-card-check)',
          checks: [{ icon: ':scope > .lv-card-check', text: '.lv-card-title' }],
        },
        { name: '押せるカード', selector: '.lv-card--interactive', checks: ['focus-room', 'fits'] },
        // The action sits on the centre of the heading block (eyebrow and title together).
        {
          name: 'カードの見出し',
          selector: '.lv-card-header',
          checks: [{ icon: ':scope > .lv-button', text: ':scope > div', block: true }],
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
/** 線のない、凹んだ面だけの形。 */
export const Plain: Story = { args: { variant: 'plain' } };
/** 押せるカード。見出しのリンクがカード全体に広がります。 */
export const Link: Story = {
  args: { href: '#detail', action: undefined },
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByRole('link')).toHaveFocus();
  },
};
function SelectableDemo() {
  const [chosen, setChosen] = useState<string[]>(['tokyo']);
  const toggle = (id: string, on: boolean) =>
    setChosen((c) => (on ? [...c, id] : c.filter((x) => x !== id)));
  return (
    <div
      style={{
        display: 'grid',
        gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
      }}
    >
      {[
        { id: 'tokyo', title: '東京拠点', body: '作業 128 件' },
        { id: 'osaka', title: '大阪拠点', body: '作業 64 件' },
      ].map((site) => (
        <Card
          key={site.id}
          title={site.title}
          selection={{
            checked: chosen.includes(site.id),
            onCheckedChange: (on) => toggle(site.id, on),
          }}
        >
          {site.body}
        </Card>
      ))}
    </div>
  );
}
/** 選べるカード。チェックの当たり判定がカード全体に広がります。 */
export const Selectable: Story = {
  render: () => <SelectableDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const osaka = canvas.getByRole('checkbox', { name: '大阪拠点' });
    await expect(osaka).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(osaka);
    await expect(osaka).toHaveAttribute('aria-checked', 'true');
    await expect(osaka.closest('.lv-card')).toHaveAttribute('data-selected', 'true');
  },
};
