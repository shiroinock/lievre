import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import {
  LievreProvider,
  NewItemsNotice,
  PauseControl,
  useAutoAdvance,
  useNewItems,
} from '../index';

type Item = { id: string };
const getKey = (i: Item) => i.id;
const list = (...ids: string[]) => ids.map((id) => ({ id }));

describe('useNewItems', () => {
  it('holds back items that arrive later until they are accepted', () => {
    const { result, rerender } = renderHook(({ items }) => useNewItems(items, getKey), {
      initialProps: { items: list('a', 'b') },
    });
    expect(result.current.items.map(getKey)).toEqual(['a', 'b']);
    rerender({ items: list('a', 'b', 'c', 'd') });
    expect(result.current.items.map(getKey)).toEqual(['a', 'b']);
    expect(result.current.newItems.map(getKey)).toEqual(['c', 'd']);
    act(() => result.current.accept());
    expect(result.current.items.map(getKey)).toEqual(['a', 'b', 'c', 'd']);
    expect(result.current.newItems).toEqual([]);
  });
  it('drops removed items at once, without waiting', () => {
    const { result, rerender } = renderHook(({ items }) => useNewItems(items, getKey), {
      initialProps: { items: list('a', 'b') },
    });
    rerender({ items: list('b') });
    expect(result.current.items.map(getKey)).toEqual(['b']);
  });
});

function Notice({ count, onAccept }: { count: number; onAccept: () => void }) {
  return (
    <LievreProvider>
      <NewItemsNotice count={count} onAccept={onAccept} />
    </LievreProvider>
  );
}
describe('NewItemsNotice', () => {
  it('says how many arrived, and after accepting keeps focus on the notice', async () => {
    let accepted = false;
    const { rerender, container } = render(<Notice count={3} onAccept={() => (accepted = true)} />);
    expect(screen.getByRole('status')).toHaveTextContent('新しく 3 件あります');
    expect((await axe.run(container)).violations).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: '列に加える' }));
    expect(accepted).toBe(true);
    rerender(<Notice count={0} onAccept={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('3 件を列に加えました');
    await waitFor(() => expect(screen.getByRole('status').parentElement).toHaveFocus());
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('stays in the page as an empty, hidden status region when nothing is new', () => {
    render(
      <LievreProvider>
        <NewItemsNotice count={0} onAccept={() => {}} />
      </LievreProvider>,
    );
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('');
    expect(status.parentElement).toHaveClass('lv-sr-only');
  });
});

describe('useAutoAdvance and PauseControl', () => {
  afterEach(() => vi.useRealTimers());
  it('ticks on its interval and stops when paused', () => {
    vi.useFakeTimers();
    const onTick = vi.fn();
    const { result } = renderHook(() =>
      useAutoAdvance({ interval: 1000, onTick, defaultPaused: false }),
    );
    act(() => vi.advanceTimersByTime(3000));
    expect(onTick).toHaveBeenCalledTimes(3);
    act(() => result.current.setPaused(true));
    act(() => vi.advanceTimersByTime(3000));
    expect(onTick).toHaveBeenCalledTimes(3);
  });
  it('starts paused when the person asks for less motion', () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      ...original(query),
      matches: query.includes('reduce'),
    })) as typeof window.matchMedia;
    try {
      const { result } = renderHook(() => useAutoAdvance({ interval: 1000, onTick: () => {} }));
      expect(result.current.paused).toBe(true);
    } finally {
      window.matchMedia = original;
    }
  });
  it('names what moves and says its state in words', async () => {
    let paused = false;
    const { container } = render(
      <LievreProvider>
        <PauseControl paused={paused} onPausedChange={(p) => (paused = p)} label="数値の自動更新" />
      </LievreProvider>,
    );
    expect(screen.getByRole('group', { name: '数値の自動更新' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('自動で更新しています');
    await userEvent.click(screen.getByRole('button', { name: '止める' }));
    expect(paused).toBe(true);
    expect((await axe.run(container)).violations).toEqual([]);
  });
});
