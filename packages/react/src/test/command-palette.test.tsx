import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import axe from 'axe-core';
import {
  CommandPalette,
  describeHotkey,
  filterCommands,
  type CommandItem,
  type CommandPaletteProps,
} from '../index';

const items: CommandItem[] = [
  { value: 'home', label: 'ホームへ移動', kana: 'ほーむへいどう', group: '移動' },
  {
    value: 'settings',
    label: '設定を開く',
    kana: 'せっていをひらく',
    keywords: ['settings'],
    group: '移動',
  },
  {
    value: 'new',
    label: '新しい作業を作る',
    kana: 'あたらしいさぎょうをつくる',
    group: '操作',
    shortcut: 'N',
  },
  {
    value: 'archive',
    label: '作業をしまう',
    kana: 'さぎょうをしまう',
    group: '操作',
    disabled: true,
  },
  { value: 'export', label: 'ＣＳＶで書き出す', description: '表示中の一覧', group: '操作' },
];
const input = () => screen.getByRole('combobox', { name: 'コマンド' });
const names = () =>
  screen.queryAllByRole('option').map((o) => o.firstChild?.firstChild?.textContent);
const highlighted = () =>
  document.getElementById(input().getAttribute('aria-activedescendant') ?? '')?.textContent;
const ctrlK = () => fireEvent.keyDown(document, { key: 'k', code: 'KeyK', ctrlKey: true });

function setup(props: Partial<CommandPaletteProps> = {}) {
  return render(
    <>
      <button>前の場所</button>
      <CommandPalette items={items} {...props} />
    </>,
  );
}

describe('filterCommands', () => {
  it('keeps the groups in order and searches readings, keywords and descriptions', () => {
    const values = (q: string) => filterCommands(items, q).map((i) => i.value);
    expect(values('')).toEqual(['home', 'settings', 'new', 'archive', 'export']);
    expect(values('セッテイ')).toEqual(['settings']);
    expect(values('SETTINGS')).toEqual(['settings']);
    expect(values('csv')).toEqual(['export']);
    expect(values('一覧')).toEqual(['export']);
    expect(values('さぎょう')).toEqual(['new', 'archive']);
  });
  it('gathers a group that appears twice under its first heading', () => {
    const mixed: CommandItem[] = [
      { value: 'a', label: 'A', group: '1' },
      { value: 'b', label: 'B', group: '2' },
      { value: 'c', label: 'C', group: '1' },
    ];
    expect(filterCommands(mixed, '').map((i) => i.value)).toEqual(['a', 'c', 'b']);
  });
});

describe('describeHotkey', () => {
  it('shows ⌘ on a Mac and Ctrl elsewhere', () => {
    expect(describeHotkey({ key: 'k', mod: true }, true)).toEqual({ label: '⌘K', aria: 'Meta+K' });
    expect(describeHotkey({ key: 'k', mod: true }, false)).toEqual({
      label: 'Ctrl+K',
      aria: 'Control+K',
    });
    expect(describeHotkey({ key: 'p', mod: true, shift: true }, false).aria).toBe(
      'Control+Shift+P',
    );
  });
});

describe('CommandPalette', () => {
  it('opens with Ctrl+K, focuses the field and returns the focus on Esc', async () => {
    setup();
    const before = screen.getByRole('button', { name: '前の場所' });
    before.focus();
    act(() => void ctrlK());
    expect(screen.getByRole('dialog', { name: 'コマンド' })).toBeInTheDocument();
    expect(input()).toHaveFocus();
    expect(input()).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(before).toHaveFocus();
  });
  it('closes when the hotkey is pressed again', () => {
    setup();
    act(() => void ctrlK());
    act(() => void ctrlK());
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('ignores other modifiers, the key alone and the IME', () => {
    setup();
    fireEvent.keyDown(document, { key: 'k' });
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true, shiftKey: true });
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true, isComposing: true });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('takes another hotkey, or none', () => {
    const { unmount } = setup({ hotkey: { key: 'p', mod: true, shift: true } });
    act(() => void ctrlK());
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => void fireEvent.keyDown(document, { key: 'P', ctrlKey: true, shiftKey: true }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    unmount();
    setup({ hotkey: false });
    act(() => void ctrlK());
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('shows the hotkey on the default trigger and opens from it', async () => {
    setup();
    const trigger = screen.getByRole('button', { name: 'コマンドを探す' });
    expect(trigger).toHaveAttribute('aria-keyshortcuts', 'Control+K');
    expect(trigger).toHaveTextContent('Ctrl+K');
    await userEvent.click(trigger);
    expect(input()).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
  });
  it('lists the commands in named groups and highlights the first', async () => {
    setup({ defaultOpen: true });
    const list = screen.getByRole('listbox', { name: 'コマンド' });
    expect(within(list).getByRole('group', { name: '移動' })).toBeInTheDocument();
    expect(within(list).getByRole('group', { name: '操作' })).toBeInTheDocument();
    expect(names()).toEqual([
      'ホームへ移動',
      '設定を開く',
      '新しい作業を作る',
      '作業をしまう',
      'ＣＳＶで書き出す',
    ]);
    expect(highlighted()).toContain('ホームへ移動');
    expect(screen.getByRole('status')).toHaveTextContent('4件のコマンドがあります');
  });
  it('filters, moves past disabled commands and runs one with Enter', async () => {
    const run = vi.fn();
    const onSelect = vi.fn();
    render(
      <>
        <button>前の場所</button>
        <CommandPalette
          items={items.map((i) => (i.value === 'export' ? { ...i, onSelect: run } : i))}
          onSelect={onSelect}
        />
      </>,
    );
    screen.getByRole('button', { name: '前の場所' }).focus();
    act(() => void ctrlK());
    await userEvent.type(input(), 'さぎょう');
    expect(names()).toEqual(['新しい作業を作る', '作業をしまう']);
    expect(screen.getByRole('group', { name: '操作' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: '移動' })).toBeNull();
    await userEvent.clear(input());
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    // しまう is disabled, so the third step lands on 書き出す.
    expect(highlighted()).toContain('ＣＳＶで書き出す');
    let focusedWhenRun: Element | null = null;
    run.mockImplementation(() => (focusedWhenRun = document.activeElement));
    await userEvent.keyboard('{Enter}');
    expect(run).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('export');
    expect(screen.queryByRole('dialog')).toBeNull();
    // The command runs after the focus is back where it was.
    expect(focusedWhenRun).toBe(screen.getByRole('button', { name: '前の場所' }));
  });
  it('highlights the best match as the text narrows the list', async () => {
    setup({ defaultOpen: true });
    await userEvent.type(input(), 'せってい');
    expect(highlighted()).toContain('設定を開く');
  });
  it('keeps the highlight and the text when the field is pressed', async () => {
    setup({ defaultOpen: true });
    await userEvent.click(input());
    expect(highlighted()).toContain('ホームへ移動');
    await userEvent.type(input(), 'csv');
    expect(input()).toHaveValue('csv');
    expect(highlighted()).toContain('ＣＳＶで書き出す');
  });
  it('runs a command picked with the pointer', async () => {
    const onSelect = vi.fn();
    setup({ defaultOpen: true, onSelect });
    await userEvent.click(screen.getByRole('option', { name: /新しい作業を作る/ }));
    expect(onSelect).toHaveBeenCalledWith('new');
  });
  it('says so when nothing matches', async () => {
    setup({ defaultOpen: true });
    await userEvent.type(input(), 'ぞぞぞ');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByRole('listbox')).toHaveTextContent('一致するコマンドがありません');
    expect(screen.getByRole('status')).toHaveTextContent('一致するコマンドがありません');
  });
  it('does not filter, run or close while converting', () => {
    const onSelect = vi.fn();
    setup({ defaultOpen: true, onSelect });
    const field = input();
    fireEvent.compositionStart(field);
    fireEvent.change(field, { target: { value: 'せってい' } });
    expect(screen.queryAllByRole('option')).toHaveLength(items.length);
    fireEvent.keyDown(field, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(field, { key: 'Escape', isComposing: true });
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    act(() => void fireEvent.compositionEnd(field, { target: { value: 'せってい' } }));
    expect(screen.queryAllByRole('option')).toHaveLength(1);
  });
  it('starts empty every time it opens', async () => {
    setup();
    act(() => void ctrlK());
    await userEvent.type(input(), 'せってい');
    await userEvent.keyboard('{Escape}');
    act(() => void ctrlK());
    expect(input()).toHaveValue('');
    expect(screen.queryAllByRole('option')).toHaveLength(items.length);
  });
  it('follows a controlled open', () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <CommandPalette items={items} open={false} onOpenChange={onOpenChange} trigger={null} />,
    );
    act(() => void ctrlK());
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(<CommandPalette items={items} open onOpenChange={onOpenChange} trigger={null} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'コマンドを探す' })).toBeNull();
  });
  it('keeps the highlight when the parent passes a new array', async () => {
    const { rerender } = render(
      <CommandPalette items={items.map((i) => ({ ...i }))} defaultOpen />,
    );
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(highlighted()).toContain('新しい作業を作る');
    rerender(<CommandPalette items={items.map((i) => ({ ...i }))} defaultOpen />);
    expect(highlighted()).toContain('新しい作業を作る');
  });
  it('keeps the highlight when a conversion ends on the same text', async () => {
    const onSelect = vi.fn();
    setup({ defaultOpen: true, onSelect });
    await userEvent.type(input(), 'せ');
    const field = input();
    fireEvent.compositionStart(field);
    fireEvent.change(field, { target: { value: 'せっ' } });
    fireEvent.change(field, { target: { value: 'せ' } });
    act(() => void fireEvent.compositionEnd(field, { target: { value: 'せ' } }));
    expect(highlighted()).toContain('設定を開く');
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('settings');
  });
  // A parent that holds open: the choice asks it to close, and the parent closes later, from
  // its own button (after confirming, say) — or the person gives up with Esc first.
  function Holder({ run }: { run: () => void }) {
    const [open, setOpen] = useState(true);
    const asked = useRef(0);
    return (
      <>
        <CommandPalette
          items={items.map((i) => (i.value === 'home' ? { ...i, onSelect: run } : i))}
          open={open}
          onOpenChange={(next) => {
            asked.current += 1;
            // The first close (the choice) waits for the parent's button; later ones close now.
            if (asked.current > 1) setOpen(next);
          }}
          trigger={null}
        />
        <button onClick={() => setOpen(false)}>確かめて閉じる</button>
      </>
    );
  }
  it('runs a choice when a parent that holds open closes it later', async () => {
    const run = vi.fn();
    render(<Holder run={run} />);
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Long after the choice (several tasks later), the parent closes.
    await act(() => new Promise((r) => setTimeout(r, 50)));
    fireEvent.click(screen.getByRole('button', { name: '確かめて閉じる', hidden: true }));
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(run).toHaveBeenCalledTimes(1);
  });
  it('does not run a choice the parent kept open when Esc closes it', async () => {
    const run = vi.fn();
    render(<Holder run={run} />);
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    // Radix hands the focus back (and the palette would run its command) after a tick.
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(run).not.toHaveBeenCalled();
  });
  it('does not open on a key the page already handled', () => {
    setup();
    const editor = screen.getByRole('button', { name: '前の場所' });
    editor.addEventListener('keydown', (e) => e.preventDefault());
    fireEvent.keyDown(editor, { key: 'k', code: 'KeyK', ctrlKey: true });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('reads the count of commands that cannot be chosen', async () => {
    setup({ defaultOpen: true });
    await userEvent.type(input(), 'しまう');
    expect(names()).toEqual(['作業をしまう']);
    expect(screen.getByRole('status')).toHaveTextContent(
      '選べるコマンドはありません（1件は選べません）',
    );
  });
  it("does not open on another layout's letter at the K position", () => {
    setup();
    // Dvorak: Ctrl+T is on the key QWERTY calls K.
    fireEvent.keyDown(document, { key: 't', code: 'KeyK', ctrlKey: true });
    expect(screen.queryByRole('dialog')).toBeNull();
    // A layout with no Latin letter there still finds K by its place.
    act(() => void fireEvent.keyDown(document, { key: 'л', code: 'KeyK', ctrlKey: true }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
  it('keeps the focus a command moved, when the palette opened from the page body', async () => {
    const target = document.createElement('input');
    target.setAttribute('aria-label', '移り先');
    document.body.appendChild(target);
    render(
      <CommandPalette
        items={[{ value: 'go', label: '移り先へ', onSelect: () => target.focus() }]}
      />,
    );
    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.activeElement).toBe(document.body);
    act(() => void ctrlK());
    await userEvent.keyboard('{Enter}');
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(target).toHaveFocus();
    target.remove();
  });
  it('returns the focus to the trigger when the palette opened from the page body', async () => {
    render(<CommandPalette items={items} />);
    (document.activeElement as HTMLElement | null)?.blur();
    act(() => void ctrlK());
    await userEvent.keyboard('{Escape}');
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(screen.getByRole('button', { name: 'コマンドを探す' })).toHaveFocus();
  });
  it('keeps the highlight when the pointer leaves the list', async () => {
    const onSelect = vi.fn();
    setup({ defaultOpen: true, onSelect });
    const option = screen.getByRole('option', { name: /新しい作業を作る/ });
    fireEvent.mouseMove(option);
    expect(highlighted()).toContain('新しい作業を作る');
    fireEvent.mouseLeave(screen.getByRole('listbox'));
    expect(highlighted()).toContain('新しい作業を作る');
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('new');
  });
  it('leaves Home and End to the field', () => {
    setup({ defaultOpen: true });
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(highlighted()).toContain('設定を開く');
    for (const key of ['Home', 'End']) {
      // fireEvent returns false when the default (moving the caret) was prevented.
      expect(fireEvent.keyDown(input(), { key })).toBe(true);
      expect(highlighted()).toContain('設定を開く');
    }
  });
  it('opens on ⌥ with a digit or a symbol, by the physical key', () => {
    const { unmount } = setup({ hotkey: { key: '1', alt: true } });
    // A Mac types "¡" for ⌥1; the code names the digit.
    act(() => void fireEvent.keyDown(document, { key: '¡', code: 'Digit1', altKey: true }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    unmount();
    setup({ hotkey: { key: '/', alt: true } });
    // ⌥/ is "÷". The character of the Slash key comes from the layout: the browser's map, or a
    // key typed without modifiers.
    fireEvent.keyDown(document, { key: '/', code: 'Slash' });
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => void fireEvent.keyDown(document, { key: '÷', code: 'Slash', altKey: true }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
  it('does not take ⌥ with another physical key', () => {
    setup({ hotkey: { key: 'k', alt: true } });
    fireEvent.keyDown(document, { key: '∆', code: 'KeyJ', altKey: true });
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => void fireEvent.keyDown(document, { key: '˚', code: 'KeyK', altKey: true }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
  it('has no axe violations while open', async () => {
    const { container } = setup({ defaultOpen: true });
    const results = await axe.run(container.ownerDocument.body, {
      // The fragment has no page landmarks; colours are checked by the contrast tests.
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
