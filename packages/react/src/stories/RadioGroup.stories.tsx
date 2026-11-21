import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import { RadioGroup, Button, Card, Text } from '../index';
const meta = {
  title: 'Components/Inputs/RadioGroup',
  component: RadioGroup,
  args: {
    label: '受け取り方法',
    options: [
      { value: 'email', label: 'メール', description: 'お知らせを受け取ります。' },
      { value: 'none', label: '受け取らない' },
    ],
  },
  parameters: {
    layoutGate: {
      parts: [
        { name: 'ラジオボタン', selector: '.lv-radio-option', checks: [{ icon: 'input' }] },
        { name: 'エラー文', selector: '.lv-field-error', checks: [{ icon: ':scope > svg' }] },
        {
          name: '選択肢のカード',
          selector: '.lv-radio-card',
          checks: ['grid-height', 'focus-room'],
        },
      ],
    } satisfies LayoutGate,
  },
} satisfies Meta<typeof RadioGroup>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Selected: Story = { args: { defaultValue: 'email' } };
export const Disabled: Story = { args: { disabled: true } };
export const Error: Story = { args: { error: '受け取り方法を選んでください。', required: true } };
/** 横に並べる形。「はい・いいえ」など短い選択肢に使い、幅が足りないと折り返します。 */
export const Horizontal: Story = {
  args: {
    label: '同じ住所に送りますか',
    orientation: 'horizontal',
    options: [
      { value: 'yes', label: 'はい' },
      { value: 'no', label: 'いいえ' },
    ],
  },
};
const plans = [
  { value: 'light', label: 'ライト', description: '月 500 円。1人で使う。' },
  { value: 'team', label: 'チーム', description: '月 3,000 円。10人まで。' },
  { value: 'org', label: '組織', description: '見積もり。人数の上限なし。' },
];
/** カードの形。選択肢ごとの説明を比べて選ぶときに使います。 */
export const Cards: Story = {
  args: { label: '料金の種類', variant: 'card', options: plans, defaultValue: 'team' },
};
/** カードを横に並べる形。幅に合わせて段に並べます。 */
export const CardsHorizontal: Story = {
  args: {
    label: '料金の種類',
    variant: 'card',
    orientation: 'horizontal',
    options: plans,
    defaultValue: 'team',
  },
};
