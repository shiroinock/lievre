import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import {
  Button,
  DecisionQueue,
  NewItemsNotice,
  useDecisionQueue,
  useNewItems,
  type QueueChoice,
} from '../index';
import { useMemo, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

type Request = { id: string; title: string };
const first: Request[] = [
  { id: 'r1', title: '出張費の申請（佐藤）' },
  { id: 'r2', title: '備品の購入（田中）' },
  { id: 'r3', title: '交通費の申請（鈴木）' },
];
const later: Request[] = [
  { id: 'r4', title: '研修費の申請（山本）' },
  { id: 'r5', title: '書籍の購入（佐藤）' },
];
const choices: QueueChoice[] = [
  { value: 'in', label: '承認する', shortcut: 'Y' },
  { value: 'out', label: '差し戻す', shortcut: 'N' },
];
const getKey = (r: Request) => r.id;

/** Requests keep arriving; the queue takes them only when the person presses the notice. */
function Approvals() {
  const [arrived, setArrived] = useState(first);
  const incoming = useNewItems(arrived, getKey);
  const keys = useMemo(() => incoming.items.map(getKey), [incoming.items]);
  const queue = useDecisionQueue({ keys });
  return (
    <div className="lv-queue">
      <Button
        size="sm"
        variant="ghost"
        disabled={arrived.length > first.length}
        onClick={() => setArrived([...first, ...later])}
      >
        （見本）新しい申請を2件届ける
      </Button>
      <NewItemsNotice count={incoming.newItems.length} onAccept={incoming.accept} />
      <DecisionQueue
        items={incoming.items}
        getKey={getKey}
        getLabel={(r) => r.title}
        renderItem={(r) => <p>{r.title}の内容を確かめて、承認するか差し戻すかを決めます。</p>}
        queue={queue}
        choices={choices}
        label="承認待ちの申請"
        order="届いた順に出します。新しい申請は、知らせを押すまで列に加えません。"
      />
    </div>
  );
}

const meta = {
  title: 'Components/Queue/NewItemsNotice',
  component: NewItemsNotice,
  render: () => <Approvals />,
  args: { count: 0, onAccept: () => {} },
  parameters: {
    layoutGate: {
      parts: [
        {
          name: '新着の知らせ',
          selector: '.lv-new-items:not(.lv-sr-only)',
          checks: ['fits', { baseline: ':scope > *' }],
        },
        {
          name: '知らせのボタン',
          selector: '.lv-new-items .lv-button',
          checks: ['control-height', 'inset-x', 'inset-y'],
        },
        { name: '今の項目', selector: '.lv-queue-card', checks: ['padding-equal', 'fits'] },
        {
          name: '判断のボタン',
          selector: '.lv-queue-actions .lv-button',
          checks: ['control-height', { icon: '.lv-kbd' }],
        },
        {
          name: '見本のボタン',
          selector: '.lv-queue > .lv-button',
          checks: ['control-height', 'inset-x', 'inset-y'],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '途中で増えた項目を、利用者が押すまで列にも件数にも混ぜない知らせ。useNewItems で、描いた時点の項目と新しく増えた項目を分けておきます。',
      },
    },
  },
} satisfies Meta<typeof NewItemsNotice>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 新しい申請が届いても、押すまで件数は変わりません。 */
export const Arrives: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '（見本）新しい申請を2件届ける' }));
    expect(await canvas.findByText('新しく 2 件あります')).toBeVisible();
    expect(canvas.getByText('件を確認', { exact: false })).toHaveTextContent('0 / 3 件を確認');
  },
};

/** 押すと列に加わり、件数が増え、フォーカスは知らせに残ります。 */
export const Accepted: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '（見本）新しい申請を2件届ける' }));
    await userEvent.click(await canvas.findByRole('button', { name: '列に加える' }));
    const done = await canvas.findByText('2 件を列に加えました');
    await waitFor(() => expect(done.parentElement).toHaveFocus());
    expect(canvas.getByText('件を確認', { exact: false })).toHaveTextContent('0 / 5 件を確認');
  },
};
