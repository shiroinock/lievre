import type { Meta, StoryObj } from '@storybook/react-vite';
import type { LayoutGate } from '../test/layout/declare';
import {
  Badge,
  Button,
  DataTable,
  DecisionQueue,
  DescriptionList,
  ViewSwitch,
  useDecisionQueue,
  type Column,
  type QueueChoice,
} from '../index';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

type Setting = {
  id: string;
  name: string;
  value: string;
  risk: '高' | '中' | '低';
  reason: string;
};
// Already in the order the system chose: the things to check before publishing come first.
const settings: Setting[] = [
  {
    id: 'env-token',
    name: 'env.API_TOKEN',
    value: '••••••••（伏せ字）',
    risk: '高',
    reason: '値に秘密が含まれていたので伏せ字にしました',
  },
  {
    id: 'bash-allow',
    name: 'permissions.allow: Bash(*)',
    value: 'すべてのコマンドを確認なしで実行',
    risk: '高',
    reason: '確認なしで実行できる範囲が広い設定です',
  },
  {
    id: 'hook',
    name: 'hooks.PostToolUse',
    value: '~/bin/format.sh',
    risk: '中',
    reason: '手元のスクリプトを呼んでいます',
  },
  { id: 'model', name: 'model', value: 'opus', risk: '低', reason: '公開しても困らない設定です' },
  { id: 'theme', name: 'theme', value: 'dark', risk: '低', reason: '公開しても困らない設定です' },
];
const keys = settings.map((s) => s.id);
const choices: QueueChoice[] = [
  { value: 'in', label: '公開する', shortcut: 'Y' },
  { value: 'out', label: '公開しない', shortcut: 'N' },
];
const tone = { 高: 'danger', 中: 'warning', 低: 'neutral' } as const;
const getKey = (s: Setting) => s.id;
const getLabel = (s: Setting) => s.name;
const renderItem = (s: Setting) => (
  <DescriptionList
    items={[
      { label: '値', value: s.value, mono: true },
      { label: '危険度', value: <Badge tone={tone[s.risk]}>{s.risk}</Badge> },
    ]}
  />
);

function QueueOnly({ bulk = false }: { bulk?: boolean }) {
  const queue = useDecisionQueue({ keys });
  return (
    <DecisionQueue
      items={settings}
      getKey={getKey}
      getLabel={getLabel}
      renderItem={renderItem}
      queue={queue}
      choices={choices}
      label="公開前の確認"
      order="公開前に確かめるもの（伏せ字・危険度の高いもの）から順に出します。"
      reason={(s) => s.reason}
      endAction={<Button variant="primary">投稿用に書き出す</Button>}
      bulk={
        bulk
          ? { label: '危険度の低いもの', match: (s: Setting) => s.risk === '低', value: 'in' }
          : undefined
      }
    />
  );
}

/** The two views read and write the same state: deciding in either shows up in the other. */
function BothViews() {
  const queue = useDecisionQueue({ keys });
  const [view, setView] = useState('queue');
  const columns: Column<Setting>[] = [
    { key: 'name', header: '設定', render: (s) => <span className="lv-mono">{s.name}</span> },
    { key: 'risk', header: '危険度', render: (s) => <Badge tone={tone[s.risk]}>{s.risk}</Badge> },
    {
      key: 'decision',
      header: '決めたこと',
      render: (s) => {
        const value = queue.state.decisions[s.id];
        return value ? (choices.find((c) => c.value === value)?.label ?? value) : '未決';
      },
    },
    {
      key: 'actions',
      header: '操作',
      render: (s) => (
        <span className="button-row">
          {choices.map((c) => (
            <Button
              key={c.value}
              size="sm"
              aria-pressed={queue.state.decisions[s.id] === c.value}
              onClick={() =>
                queue.decide(s.id, queue.state.decisions[s.id] === c.value ? undefined : c.value)
              }
            >
              {c.label}
            </Button>
          ))}
        </span>
      ),
    },
  ];
  return (
    <div className="lv-queue">
      <ViewSwitch value={view} onValueChange={setView} />
      {view === 'queue' ? (
        <DecisionQueue
          items={settings}
          getKey={getKey}
          getLabel={getLabel}
          renderItem={renderItem}
          queue={queue}
          choices={choices}
          label="公開前の確認"
          order="公開前に確かめるもの（伏せ字・危険度の高いもの）から順に出します。"
          reason={(s) => s.reason}
        />
      ) : (
        <DataTable rows={settings} columns={columns} getRowId={getKey} caption="公開前の確認" />
      )}
    </div>
  );
}

const meta = {
  title: 'Components/Queue/DecisionQueue',
  component: DecisionQueue<Setting>,
  render: () => <QueueOnly />,
  parameters: {
    layoutGate: {
      parts: [
        { name: '今の項目', selector: '.lv-queue-card', checks: ['padding-equal', 'fits'] },
        {
          name: '進み具合の見出し',
          selector: '.lv-queue-progress .lv-progress-label',
          checks: [{ baseline: ':scope > *' }, 'line-grid'],
        },
        {
          name: '決めた項目',
          selector: '.lv-queue-done-item',
          checks: ['control-height', { padding: 'button' }, 'inset-y'],
        },
        {
          name: '見せ方の切り替え',
          selector: '.lv-view-switch-item',
          checks: ['control-height', 'inset-x', 'inset-y', { padding: 'button' }],
        },
        {
          name: 'まとめて決めるボタン',
          selector: '.lv-queue-bulk .lv-button',
          checks: ['control-height', 'inset-x', 'inset-y'],
        },
        {
          name: '判断のボタン',
          selector: '.lv-queue-actions .lv-button',
          checks: ['control-height', { icon: '.lv-kbd' }],
        },
      ],
    } satisfies LayoutGate,
    docs: {
      description: {
        component:
          '1件ずつ判断する列（タイムラインの見せ方）。件数と進み具合を常に出し、すべて決めたら「すべて確認しました」で止まります。時間で次へは進みません。近道のキー（Y / N / L / Z）は列の中にフォーカスがあるときだけ効きます。一覧の見せ方とは useDecisionQueue の状態を共有します。',
      },
    },
  },
} satisfies Meta<typeof DecisionQueue<Setting>>;
export default meta;
type Story = StoryObj;

export const Default: Story = {};

/** Y / N / L / Z で最後まで進め、「すべて確認しました」で止まることを確かめます。 */
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const first = await canvas.findByRole('article', { name: /env\.API_TOKEN/ });
    // Single-letter keys do nothing until focus is inside the queue (WCAG 2.1.4).
    await userEvent.keyboard('y');
    expect(canvas.getByText('件を確認', { exact: false })).toHaveTextContent('0 / 5 件を確認');
    first.focus();
    await userEvent.keyboard('y');
    await waitFor(() =>
      expect(canvas.getByRole('article', { name: /permissions\.allow/ })).toHaveFocus(),
    );
    await userEvent.keyboard('l');
    await waitFor(() => expect(canvas.getByRole('article', { name: /hooks/ })).toHaveFocus());
    await userEvent.keyboard('n');
    await userEvent.keyboard('z');
    await waitFor(() => expect(canvas.getByRole('article', { name: /hooks/ })).toHaveFocus());
    await userEvent.keyboard('nyy');
    // Only the deferred item is left, and it says so.
    await waitFor(() =>
      expect(canvas.getByText('あとで回した項目です（残りはこれだけ）')).toBeInTheDocument(),
    );
    await userEvent.keyboard('n');
    const end = await canvas.findByRole('heading', { name: 'すべて確認しました' });
    await waitFor(() => expect(end.parentElement).toHaveFocus());
    expect(canvas.getByText('件を確認', { exact: false })).toHaveTextContent('5 / 5 件を確認');
    // Pressing a decided item puts it back in the queue.
    await userEvent.click(canvas.getByRole('button', { name: /公開しない hooks/ }));
    await waitFor(() => expect(canvas.getByRole('article', { name: /hooks/ })).toHaveFocus());
  },
};

export const SharedWithList: Story = {
  render: () => <BothViews />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: /公開する/ }));
    await userEvent.click(canvas.getByRole('radio', { name: '一覧から選ぶ' }));
    const table = await canvas.findByRole('table', { name: '公開前の確認' });
    const row = within(table).getByRole('row', { name: /env\.API_TOKEN/ });
    expect(within(row).getAllByRole('cell')[2]).toHaveTextContent('公開する');
    await userEvent.click(
      within(within(table).getByRole('row', { name: /permissions/ })).getByRole('button', {
        name: '公開しない',
      }),
    );
    await userEvent.click(canvas.getByRole('radio', { name: '順に見る' }));
    expect(canvas.getByText('件を確認', { exact: false })).toHaveTextContent('2 / 5 件を確認');
    expect(await canvas.findByRole('article', { name: /hooks/ })).toBeInTheDocument();
  },
};

/** 根拠を言葉で示した近道で、残りの危険度の低いものをまとめて決められます。押したあとも1件ずつ決め直せます（押したあとの動きは queue.test.tsx で確かめます）。 */
export const Bulk: Story = {
  render: () => <QueueOnly bulk />,
};
