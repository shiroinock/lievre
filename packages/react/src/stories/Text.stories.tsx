import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { Text, Button, Card } from '../index';
const meta = {
  title: 'Components/Content/Text',
  component: Text,
  args: { children: '読み進めるための本文。役割に応じてサイズを選びます。' },
  parameters: {
    layoutGate: {
      parts: [
        { name: '文章', selector: '.lv-text:not(.lv-text--clamp)', checks: ['fits'] },
        { name: '行数で切った文章', selector: '.lv-text--clamp', checks: ['grid-height'] },
      ],
    } satisfies LayoutGate,
  },
} satisfies Meta<typeof Text>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Body: Story = {};
export const Lead: Story = { args: { size: 'lead' } };
export const Caption: Story = { args: { size: 'small', tone: 'muted' } };
const long =
  '接続状態を確かめてから同期を実行し、結果を記録します。失敗したときは、担当者に知らせ、翌日の作業の前にもう一度確かめます。夜間に動く同期は、朝の確認の前に終わるようにしておきます。';
/** 2行で切り、末尾に「…」を出します。 */
export const MaxLines: Story = {
  args: { maxLines: 2, children: long },
  render: (args) => (
    <div style={{ maxWidth: 320 }}>
      <Text {...args} />
    </div>
  ),
};
/** 太さの3段。強調は太さだけにし、色は変えません。 */
export const Weights: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 8 }}>
      <Text weight="regular">ふつうの太さ（regular）</Text>
      <Text weight="medium">少し強い太さ（medium）</Text>
      <Text weight="bold">強調の太さ（bold）</Text>
    </div>
  ),
};
/** 日本語も含めて等幅。英数字 1 対日本語 2 の幅で桁がそろいます（コマンドの出力・ログ）。 */
export const Mono: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 4 }}>
      <Text mono>$ npm run build</Text>
      <Text mono>書き出し 12 件　失敗 0 件</Text>
      <Text mono>経過 00:01:42　完了しました</Text>
    </div>
  ),
};
