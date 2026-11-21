import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Chip, ChipGroup } from '../index';
import { expect, within } from 'storybook/test';

const meta = {
  title: 'Components/Data/ChipGroup',
  component: ChipGroup,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: 'チップの並び',
          selector: '.lv-chip-group',
          checks: ['fits', { sameHeight: ':scope > *' }],
        },
        { name: 'チップ', selector: '.lv-chip', checks: ['control-height', 'inset-y'] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          'チップの並び。名前を付けたまとまり（role="group"）にして、8px の間で折り返して並べます。選んだ絞り込みの条件や、押して入り切りする絞り込みの札をまとめます。',
      },
    },
  },
  args: { label: '分類', children: null },
} satisfies Meta<typeof ChipGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div style={{ width: 280 }}>
      <ChipGroup label="分類">
        <Chip label="営業部" />
        <Chip label="開発部" />
        <Chip label="人事部" />
        <Chip label="経理部" />
        <Chip label="総務部" />
      </ChipGroup>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('group', { name: '分類' })).toBeVisible();
  },
};
