import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Button, ButtonGroup, IconButton } from '../index';
import { Bold, ChevronLeft, ChevronRight, Italic, Underline } from 'lucide-react';
import { useState } from 'react';
import { expect, within } from 'storybook/test';

const meta = {
  title: 'Components/Actions/ButtonGroup',
  component: ButtonGroup,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: 'ボタン',
          selector: '.lv-button',
          checks: ['inset-x', 'inset-y', 'control-height', { padding: 'button' }, 'fits'],
        },
        {
          name: 'アイコンのボタン',
          selector: '.lv-icon-button',
          checks: ['inset-x', 'inset-y', 'control-height', 'square'],
        },
        {
          name: 'ボタンの並び',
          selector: '.lv-button-group',
          checks: [{ sameHeight: ':scope > *' }],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '関係のあるボタンの並び。role="group" でまとまりの名前を読み上げます。attached で隙間なくつなげると、間の線は1本（1px）になり、端だけ角を丸めます。',
      },
    },
  },
  args: {
    label: '表示',
    children: (
      <>
        <Button>拡大</Button>
        <Button>縮小</Button>
        <Button>元の大きさ</Button>
      </>
    ),
  },
} satisfies Meta<typeof ButtonGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Attached: Story = {
  args: {
    label: 'ページ',
    attached: true,
    children: (
      <>
        <Button icon={<ChevronLeft size={16} />}>前へ</Button>
        <Button iconEnd={<ChevronRight />}>次へ</Button>
      </>
    ),
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('group', { name: 'ページ' })).toBeVisible();
  },
};
function Toolbar() {
  const [marks, setMarks] = useState({ bold: true, italic: false, underline: false });
  const toggle = (key: keyof typeof marks) => setMarks((m) => ({ ...m, [key]: !m[key] }));
  return (
    <ButtonGroup label="書式" attached>
      <IconButton
        label="太字"
        icon={<Bold />}
        variant="secondary"
        pressed={marks.bold}
        onClick={() => toggle('bold')}
      />
      <IconButton
        label="斜体"
        icon={<Italic />}
        variant="secondary"
        pressed={marks.italic}
        onClick={() => toggle('italic')}
      />
      <IconButton
        label="下線"
        icon={<Underline />}
        variant="secondary"
        pressed={marks.underline}
        onClick={() => toggle('underline')}
      />
    </ButtonGroup>
  );
}
/** 入り切りするアイコンのボタンをつなげた並び。 */
export const AttachedToggles: Story = { render: () => <Toolbar /> };
