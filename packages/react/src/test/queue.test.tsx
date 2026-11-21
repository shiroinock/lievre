import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import axe from 'axe-core';
import {
  LievreProvider,
  DecisionQueue,
  QueueProgress,
  ViewSwitch,
  TextField,
  useDecisionQueue,
  getQueueSnapshot,
  decideItem,
  deferItem,
  undoDecision,
  emptyDecisionState,
  type DecisionState,
  type QueueChoice,
} from '../index';

const keys = ['a', 'b', 'c', 'd'];

describe('Decision queue state', () => {
  it('starts at the first key and counts every item', () => {
    const s = getQueueSnapshot(keys, emptyDecisionState);
    expect(s.current).toBe('a');
    expect(s.upcoming).toEqual(['b', 'c', 'd']);
    expect(s.total).toBe(4);
    expect(s.done).toEqual([]);
  });
  it('moves deferred items to the end and shows them once the fresh ones run out', () => {
    let state: DecisionState = deferItem(emptyDecisionState, 'a');
    let s = getQueueSnapshot(keys, state);
    expect(s.current).toBe('b');
    expect(s.deferred).toEqual(['a']);
    state = ['b', 'c', 'd'].reduce((acc, k) => decideItem(acc, k, 'in'), state);
    s = getQueueSnapshot(keys, state);
    expect(s.current).toBe('a');
    expect(s.currentDeferred).toBe(true);
    expect(s.deferred).toEqual([]);
    state = decideItem(state, 'a', 'out');
    s = getQueueSnapshot(keys, state);
    expect(s.current).toBeUndefined();
    expect(s.done.map((d) => d.key)).toEqual(['b', 'c', 'd', 'a']);
    expect(state.deferred).toEqual([]);
  });
  it('undoes the last decision and puts the item back in its place', () => {
    let state = decideItem(emptyDecisionState, 'a', 'in');
    state = decideItem(state, 'b', 'out');
    state = undoDecision(state);
    expect(state.decisions).toEqual({ a: 'in' });
    expect(getQueueSnapshot(keys, state).current).toBe('b');
    expect(undoDecision(emptyDecisionState)).toBe(emptyDecisionState);
  });
  it('counts decisions made in another view (not in the log) as done', () => {
    const state: DecisionState = { decisions: { c: 'in', zz: 'in' }, log: [], deferred: [] };
    const s = getQueueSnapshot(keys, state);
    expect(s.done).toEqual([{ key: 'c', value: 'in' }]);
    expect(s.upcoming).toEqual(['b', 'd']);
  });
  it('re-deciding an item moves it to the end of the log', () => {
    let state = decideItem(emptyDecisionState, 'a', 'in');
    state = decideItem(state, 'b', 'in');
    state = decideItem(state, 'a', 'out');
    expect(state.log).toEqual(['b', 'a']);
    expect(state.decisions.a).toBe('out');
  });
});

type Item = { id: string; name: string };
const items: Item[] = keys.map((id) => ({ id, name: `項目${id.toUpperCase()}` }));
const choices: QueueChoice[] = [
  { value: 'in', label: 'もらう', shortcut: 'Y' },
  { value: 'out', label: 'もらわない', shortcut: 'N' },
];
function Harness({ withField = false }: { withField?: boolean }) {
  const queue = useDecisionQueue({ keys });
  return (
    <DecisionQueue
      items={items}
      getKey={(i) => i.id}
      getLabel={(i) => i.name}
      renderItem={(i) =>
        withField ? <TextField label={`${i.name}のメモ`} /> : <p>{i.name}の中身</p>
      }
      queue={queue}
      choices={choices}
      label="取り込む設定"
      order="作者が理由を書いたものから出します。"
      reason={() => '作者の理由があります'}
    />
  );
}
const setup = (ui: React.ReactNode, theme: 'paper' | 'ink' = 'paper') =>
  render(<LievreProvider theme={theme}>{ui}</LievreProvider>);
const progressText = () => screen.getByText('件を確認', { exact: false });

describe('DecisionQueue', () => {
  it('passes axe in both themes, at the start and at the end', async () => {
    for (const theme of ['paper', 'ink'] as const) {
      const { container, unmount } = setup(<Harness />, theme);
      expect((await axe.run(container)).violations).toEqual([]);
      for (let i = 0; i < keys.length; i++)
        await userEvent.click(screen.getByRole('button', { name: 'もらう' }));
      await screen.findByRole('heading', { name: 'すべて確認しました' });
      expect((await axe.run(container)).violations).toEqual([]);
      unmount();
    }
  });
  it('exposes the shortcut on each button and keeps the key text out of its name', () => {
    setup(<Harness />);
    expect(screen.getByRole('button', { name: 'もらう' })).toHaveAttribute(
      'aria-keyshortcuts',
      'Y',
    );
    expect(screen.getByRole('button', { name: 'あとで' })).toHaveAttribute(
      'aria-keyshortcuts',
      'L',
    );
  });
  it('ignores single-letter keys outside the queue, in text fields and while composing', async () => {
    setup(<Harness withField />);
    await userEvent.keyboard('y');
    expect(progressText()).toHaveTextContent('0 / 4 件を確認');
    await userEvent.click(screen.getByRole('textbox', { name: '項目Aのメモ' }));
    await userEvent.keyboard('yn');
    expect(progressText()).toHaveTextContent('0 / 4 件を確認');
    const card = screen.getByRole('article', { name: /項目A/ });
    fireEvent.keyDown(card, { key: 'y', isComposing: true });
    fireEvent.keyDown(card, { key: 'y', ctrlKey: true });
    expect(progressText()).toHaveTextContent('0 / 4 件を確認');
    fireEvent.keyDown(card, { key: 'Y' });
    expect(progressText()).toHaveTextContent('1 / 4 件を確認');
  });
  it('moves focus to the next item and announces the position, then to the end', async () => {
    setup(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'もらう' }));
    await waitFor(() => expect(screen.getByRole('article', { name: /項目B/ })).toHaveFocus());
    expect(screen.getByRole('status')).toHaveTextContent('4件中2件目：項目B');
    await userEvent.keyboard('nyy');
    const end = await screen.findByRole('heading', { name: 'すべて確認しました' });
    await waitFor(() => expect(end.parentElement).toHaveFocus());
    expect(end.parentElement).toHaveTextContent('もらう 3 件、もらわない 1 件');
    expect(screen.queryByText('このあと')).not.toBeInTheDocument();
  });
  it('shows a few upcoming names and the rest as a count', () => {
    setup(<Harness />);
    const next = screen.getByRole('list', { name: 'このあと出る項目' });
    expect(next).toHaveTextContent('項目B');
    expect(next).toHaveTextContent('項目D');
    render(
      <LievreProvider>
        <QueueWith previewCount={1} />
      </LievreProvider>,
    );
    expect(screen.getAllByRole('list', { name: 'このあと出る項目' })[1]).toHaveTextContent(
      'ほか 2 件',
    );
  });
});
function QueueWith({ previewCount }: { previewCount: number }) {
  const queue = useDecisionQueue({ keys });
  return (
    <DecisionQueue
      items={items}
      getKey={(i) => i.id}
      getLabel={(i) => i.name}
      renderItem={(i) => i.name}
      queue={queue}
      choices={choices}
      label="別の列"
      previewCount={previewCount}
    />
  );
}

describe('QueueProgress and ViewSwitch', () => {
  it('reads the count, not only a percentage', () => {
    setup(<QueueProgress done={5} total={12} deferred={2} />);
    expect(screen.getByRole('progressbar', { name: '確認した件数' })).toHaveAttribute(
      'aria-valuetext',
      '12件中5件を確認',
    );
    expect(screen.getByText('あとで', { exact: false })).toHaveTextContent('あとで 2 件');
  });
  it('switches with the arrow keys and never leaves nothing selected', async () => {
    let value = 'queue';
    const { rerender, container } = setup(
      <ViewSwitch value={value} onValueChange={(v) => (value = v)} />,
    );
    const queue = screen.getByRole('radio', { name: '順に見る' });
    await userEvent.click(queue);
    expect(value).toBe('queue');
    queue.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: '一覧から選ぶ' })).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(value).toBe('list');
    rerender(
      <LievreProvider>
        <ViewSwitch value={value} onValueChange={(v) => (value = v)} />
      </LievreProvider>,
    );
    expect(screen.getByRole('radio', { name: '一覧から選ぶ' })).toBeChecked();
    expect((await axe.run(container)).violations).toEqual([]);
  });
});
