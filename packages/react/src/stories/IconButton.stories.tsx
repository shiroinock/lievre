import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { IconButton, Card, DataTable, Stack } from '../index';
import { MoreHorizontal, Plus, Settings2, Trash2, X } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Actions/IconButton',
  component: IconButton,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: 'アイコンだけのボタン',
          selector: '.lv-icon-button',
          checks: ['inset-x', 'inset-y', 'control-height', 'square', 'focus-room'],
        },
        { name: 'ツールチップ', selector: '.lv-tooltip', checks: ['inset-y', 'fits'] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          'アイコンだけのボタン。label は必須で、読み上げの名前とツールチップの両方に使います。variant と size は Button と同じで、既定は枠のない ghost と密度の操作の高さです。幅と高さは常に同じです。',
      },
    },
  },
  args: { label: '設定を開く', icon: <Settings2 />, onClick: fn() },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    icon: { control: false },
  },
} satisfies Meta<typeof IconButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Ghost: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Primary: Story = { args: { variant: 'primary', label: '作業を追加', icon: <Plus /> } };
export const Danger: Story = { args: { variant: 'danger', label: '削除', icon: <Trash2 /> } };
/** sm は 32px、md は密度の操作の高さ（40 / 32px）、lg は 48px。タッチの画面では 44px まで広げます。 */
export const Sizes: Story = {
  render: (args) => (
    <Stack direction="row" gap={3} align="center">
      <IconButton {...args} size="sm" variant="secondary" />
      <IconButton {...args} size="md" variant="secondary" />
      <IconButton {...args} size="lg" variant="secondary" />
    </Stack>
  ),
};
export const Loading: Story = { args: { variant: 'secondary', loading: true } };
export const Disabled: Story = { args: { variant: 'secondary', disabled: true } };
/** カードの見出しと表の行の端に置いても、フォーカスの輪郭が親に切られません。 */
export const InContext: Story = {
  render: (args) => (
    <Stack gap={4}>
      <Card
        title="通知の設定"
        action={<IconButton label="通知の設定を閉じる" icon={<X />} size="sm" />}
      >
        変更は次の更新から反映されます。
      </Card>
      <DataTable
        caption="作業の一覧"
        rows={[
          { id: 'W-1024', name: '在庫の照合' },
          { id: 'W-1025', name: '請求書の確認' },
        ]}
        getRowId={(r) => r.id}
        columns={[
          { key: 'id', header: 'ID', render: (r) => <span className="lv-mono">{r.id}</span> },
          { key: 'name', header: '作業', render: (r) => r.name },
          {
            key: 'actions',
            header: '操作',
            align: 'right',
            render: (r) => (
              <IconButton {...args} label={`${r.id} の操作`} icon={<MoreHorizontal />} size="sm" />
            ),
          },
        ]}
      />
    </Stack>
  ),
};
export const ClickInteraction: Story = {
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button', { name: '設定を開く' });
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalled();
  },
};
/** キーボードで移ると、label と同じ言葉のツールチップが出ます。配置の検査は、この Story でツールチップを測ります。 */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    const tooltip = await within(canvasElement.ownerDocument.body).findByRole('tooltip');
    await expect(tooltip).toHaveTextContent('設定を開く');
  },
};
