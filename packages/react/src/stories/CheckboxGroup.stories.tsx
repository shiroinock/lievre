import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { CheckboxGroup } from '../index';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Inputs/CheckboxGroup',
  component: CheckboxGroup,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: 'チェックボックスの欄',
          selector: '.lv-check-field',
          checks: [{ icon: '.lv-checkbox', text: '.lv-check-label' }],
        },
        {
          name: 'チェックの箱',
          selector: '.lv-checkbox',
          checks: ['inset-x', 'inset-y', 'grid-height'],
        },
        { name: 'エラー文', selector: '.lv-field-error', checks: [{ icon: ':scope > svg' }] },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '複数を選べる選択肢のまとまりです。fieldset と legend でまとまりの名前を読み上げます。「1つ以上」の検査は呼び出す側で行い、error で伝えます。1つだけの入り切りは Checkbox、1つを選ぶなら RadioGroup を使います。',
      },
    },
  },
  args: {
    label: '連絡の方法',
    hint: '選んだ方法すべてに送ります。',
    options: [
      { value: 'email', label: 'メール' },
      { value: 'sms', label: 'ショートメッセージ', description: '携帯電話の番号に送ります。' },
      { value: 'post', label: '郵送' },
      { value: 'fax', label: 'ファクス', disabled: true },
    ],
    onValueChange: fn(),
  },
} satisfies Meta<typeof CheckboxGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Selected: Story = { args: { defaultValue: ['email', 'post'] } };
export const Error: Story = {
  args: { required: true, error: '連絡の方法を1つ以上選んでください。' },
};
export const Disabled: Story = { args: { disabled: true } };
function Controlled() {
  const [value, setValue] = useState<string[]>(['email']);
  return (
    <>
      <CheckboxGroup
        label="連絡の方法"
        options={[
          { value: 'email', label: 'メール' },
          { value: 'sms', label: 'ショートメッセージ' },
          { value: 'post', label: '郵送' },
        ]}
        value={value}
        onValueChange={setValue}
      />
      <p className="lv-text lv-text--small">
        選んでいる値：<span className="lv-mono">{value.join(', ') || 'なし'}</span>
      </p>
    </>
  );
}
/** 選んだ値は選択肢の並び順で返します。 */
export const Toggling: Story = {
  render: () => <Controlled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('checkbox', { name: '郵送' }));
    await userEvent.click(canvas.getByRole('checkbox', { name: 'ショートメッセージ' }));
    await expect(canvas.getByText('email, sms, post')).toBeVisible();
  },
};
