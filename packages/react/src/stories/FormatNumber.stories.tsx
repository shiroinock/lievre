import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { FormatNumber } from '../index';

const meta = {
  title: 'Components/Data/FormatNumber',
  component: FormatNumber,
  parameters: {
    layoutGate: {
      parts: [
        { name: '書式の数', selector: '.lv-format', checks: ['fits'] },
        {
          name: '数の列',
          selector: '.lv-table',
          checks: [{ textEdge: 'end', of: 'td:last-child .lv-format' }],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '数を桁区切りの書式で出します。数字は等幅（Lievre Term JP）で、単位は本文の書体で後ろに添えます。fractionDigits で小数の桁を決めると、表の右揃えの列で小数点の位置がそろいます。percent は 1 を 100% として割合を、sign は前との差の符号を出します。文の中や aria-label には、同じ書式の formatNumber を使います。',
      },
    },
  },
  args: { value: 1234567 },
} satisfies Meta<typeof FormatNumber>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithUnit: Story = { args: { value: 128000, unit: '円' } };
export const Percent: Story = { args: { value: 0.1234, percent: true } };
export const Signed: Story = { args: { value: -32, sign: true, unit: '件' } };
/** 表の右揃えの列。小数の桁を決めると、桁と小数点の位置がそろいます。 */
export const InTable: Story = {
  render: () => (
    <table className="lv-table" style={{ width: 320 }}>
      <caption>機材ごとの使用率</caption>
      <thead>
        <tr>
          <th scope="col">名前</th>
          <th scope="col" style={{ textAlign: 'right' }}>
            使用率
          </th>
        </tr>
      </thead>
      <tbody>
        {[
          ['センサーA', 0.4215],
          ['ゲートウェイB', 0.08],
          ['ストレージC', 1],
        ].map(([name, value]) => (
          <tr key={name}>
            <td>{name}</td>
            <td style={{ textAlign: 'right' }}>
              <FormatNumber value={Number(value)} percent fractionDigits={1} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
};
