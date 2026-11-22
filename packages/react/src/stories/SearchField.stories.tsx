import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { SearchField } from '../index';
import { expect, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Inputs/SearchField',
  component: SearchField,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '探す欄',
          selector: '.lv-search-field-input',
          checks: ['inset-y', 'control-height'],
        },
        {
          name: '消すボタン',
          selector: '.lv-search-field-clear',
          checks: ['square', 'inset-x', 'inset-y'],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '探す言葉を入れる欄。Enter で onSearch を呼びます。日本語の変換を確定する Enter では呼ばず、onValueChange も確定した文字だけを知らせます。文字があるときは右端に消すボタンを出し、Esc でも消します。',
      },
    },
  },
  args: { label: '取引先を探す', placeholder: '名前か読み', hint: '全角・半角を問わずに探します' },
} satisfies Meta<typeof SearchField>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithValue: Story = { args: { defaultValue: '東京' } };
export const Small: Story = { args: { controlSize: 'sm', defaultValue: '東京', hint: undefined } };
export const Large: Story = { args: { controlSize: 'lg', defaultValue: '東京', hint: undefined } };
export const Disabled: Story = { args: { disabled: true, defaultValue: '東京' } };
/** 消すボタンで消すと、フォーカスは欄に残ります。 */
export const Clear: Story = {
  args: { defaultValue: '東京' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: '文字を消す' }));
    await expect(c.getByRole('searchbox')).toHaveValue('');
    await expect(c.getByRole('searchbox')).toHaveFocus();
  },
};
