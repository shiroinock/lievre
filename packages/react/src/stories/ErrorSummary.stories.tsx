import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import {
  Button,
  ErrorSummary,
  RadioGroup,
  Stack,
  TextField,
  type ErrorSummaryItem,
} from '../index';
import { useState, type FormEvent } from 'react';
import { expect, userEvent, within } from 'storybook/test';

const meta = {
  title: 'Components/Feedback/ErrorSummary',
  component: ErrorSummary,
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '誤りの一覧',
          selector: '.lv-error-summary',
          checks: ['padding-equal', { icon: ':scope > svg', text: '.lv-error-summary-title' }],
        },
        {
          name: '入力欄',
          selector: '.lv-input',
          checks: ['inset-y', 'control-height', { padding: 'input' }],
        },
        { name: 'ラジオボタン', selector: '.lv-radio-option', checks: [{ icon: 'input' }] },
        { name: 'エラー文', selector: '.lv-field-error', checks: [{ icon: ':scope > svg' }] },
        {
          name: '送るボタン',
          selector: '.lv-button',
          checks: ['inset-x', 'inset-y', 'control-height', { padding: 'button' }, 'fits'],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '送信したあとに、誤りをフォームの先頭でまとめて示します。誤りが現れたときにこの一覧へフォーカスを移し、各項目のリンクで誤りのある入力へ移ります。入力ごとのエラー文もあわせて出し、同じ言葉にします。RadioGroup・CheckboxGroup へは、最初の選択肢の id で移ります。',
      },
    },
  },
  args: {
    errors: [
      { id: 'story-name', message: 'お名前を入力してください。' },
      { id: 'story-email', message: 'メールアドレスの形で入力してください。' },
    ],
    autoFocus: false,
  },
} satisfies Meta<typeof ErrorSummary>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function Form() {
  const [errors, setErrors] = useState<ErrorSummaryItem[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState('');
  const message = (id: string) => errors.find((e) => e.id === id)?.message;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: ErrorSummaryItem[] = [];
    if (!name) next.push({ id: 'form-name', message: 'お名前を入力してください。' });
    if (!email.includes('@'))
      next.push({ id: 'form-email', message: 'メールアドレスの形で入力してください。' });
    if (!plan) next.push({ id: 'form-plan', message: '受け取り方法を選んでください。' });
    setErrors(next);
  };
  return (
    <form onSubmit={submit} noValidate>
      <Stack gap={6}>
        <ErrorSummary errors={errors} />
        <TextField
          id="form-name"
          label="お名前"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={message('form-name')}
        />
        <TextField
          id="form-email"
          label="メールアドレス"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={message('form-email')}
        />
        <RadioGroup
          id="form-plan"
          label="受け取り方法"
          required
          value={plan}
          onValueChange={setPlan}
          error={message('form-plan')}
          options={[
            { value: 'email', label: 'メール' },
            { value: 'post', label: '郵送' },
          ]}
        />
        <div>
          <Button type="submit" variant="primary">
            送る
          </Button>
        </div>
      </Stack>
    </form>
  );
}
/** 送ると一覧へフォーカスが移り、リンクで誤りのある入力へ移ります。 */
export const InForm: Story = {
  render: () => <Form />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '送る' }));
    const summary = await canvas.findByRole('alert');
    await expect(summary).toHaveFocus();
    await userEvent.click(
      within(summary).getByRole('link', { name: '受け取り方法を選んでください。' }),
    );
    await expect(canvas.getByRole('radio', { name: 'メール' })).toHaveFocus();
  },
};
