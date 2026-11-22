import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import axe from 'axe-core';
import { Button, Combobox, Dialog, filterOptions, type ComboboxOption } from '../index';

const options: ComboboxOption[] = [
  { value: 'tokyo', label: '東京商事株式会社', kana: 'とうきょうしょうじかぶしきがいしゃ' },
  { value: 'abc', label: 'ＡＢＣ物流', kana: 'えーびーしーぶつりゅう' },
  { value: 'sample', label: 'ｶﾌﾞｼｷｶﾞｲｼｬ ｻﾝﾌﾟﾙ' },
  { value: 'osaka', label: '大阪精機', kana: 'おおさかせいき' },
  { value: 'stop', label: '福岡システムズ', disabled: true },
];
const input = () => screen.getByRole('combobox', { name: '取引先' });
const names = () => screen.queryAllByRole('option').map((o) => o.textContent);

describe('filterOptions', () => {
  it('ignores width, kana and case, and searches the reading', () => {
    const labels = (q: string) => filterOptions(options, q).map((o) => o.value);
    expect(labels('とうきょう')).toEqual(['tokyo']);
    expect(labels('abc')).toEqual(['abc']);
    expect(labels('カブシキ')).toEqual(['tokyo', 'sample']);
    expect(labels('')).toHaveLength(options.length);
  });
});

describe('Combobox', () => {
  it('names the input from the label and ties hint and error', () => {
    render(
      <Combobox label="取引先" options={options} hint="宛先になります" error="選んでください" />,
    );
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    expect(input()).toHaveAccessibleDescription(/宛先になります/);
    expect(input()).toHaveAccessibleDescription(/選んでください/);
    expect(input()).toHaveAttribute('aria-expanded', 'false');
  });
  it('filters as you type and chooses with Enter', async () => {
    const onValueChange = vi.fn();
    render(<Combobox label="取引先" options={options} onValueChange={onValueChange} />);
    await userEvent.type(input(), 'おおさか');
    expect(names()).toEqual(['大阪精機']);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(onValueChange).toHaveBeenLastCalledWith('osaka');
    expect(input()).toHaveValue('大阪精機');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
  it('reads out how many options there are', async () => {
    render(<Combobox label="取引先" options={options} />);
    await userEvent.type(input(), 'かぶしき');
    expect(screen.getByRole('status')).toHaveTextContent('2件の候補があります');
    await userEvent.type(input(), 'ぞ');
    expect(screen.getByRole('status')).toHaveTextContent('一致する候補がありません');
  });
  it('opens on the first arrow with the first option highlighted, and goes to the ends', async () => {
    render(<Combobox label="取引先" options={options} />);
    input().focus();
    await userEvent.keyboard('{ArrowDown}');
    const first = screen.getByRole('option', { name: '東京商事株式会社' });
    expect(input()).toHaveAttribute('aria-activedescendant', first.id);
    await userEvent.keyboard('{End}');
    expect(input()).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: '大阪精機' }).id,
    );
  });
  it('closes on the first Esc and clears the text on the second', async () => {
    render(<Combobox label="取引先" options={options} />);
    await userEvent.type(input(), 'お');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input()).toHaveValue('お');
    await userEvent.keyboard('{Escape}');
    expect(input()).toHaveValue('');
  });
  it('chooses with the pointer and marks the chosen option', async () => {
    render(<Combobox label="取引先" options={options} />);
    await userEvent.click(screen.getByRole('button', { name: '候補を開く' }));
    await userEvent.click(screen.getByRole('option', { name: 'ＡＢＣ物流' }));
    expect(input()).toHaveValue('ＡＢＣ物流');
    await userEvent.click(screen.getByRole('button', { name: '候補を開く' }));
    expect(screen.getByRole('option', { name: 'ＡＢＣ物流' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(input()).toHaveFocus();
  });
  it('clears the choice when the text is emptied', async () => {
    const onValueChange = vi.fn();
    render(
      <Combobox
        label="取引先"
        options={options}
        defaultValue="tokyo"
        onValueChange={onValueChange}
      />,
    );
    expect(input()).toHaveValue('東京商事株式会社');
    await userEvent.clear(input());
    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });
  it('follows a controlled value', async () => {
    function Controlled() {
      const [value, setValue] = useState<string | null>('osaka');
      return (
        <>
          <Combobox label="取引先" options={options} value={value} onValueChange={setValue} />
          <button onClick={() => setValue('abc')}>変える</button>
        </>
      );
    }
    render(<Controlled />);
    expect(input()).toHaveValue('大阪精機');
    await userEvent.click(screen.getByRole('button', { name: '変える' }));
    expect(input()).toHaveValue('ＡＢＣ物流');
  });
  it('keeps the typed text when a parent with inline options draws again', async () => {
    function Parent() {
      const [tick, setTick] = useState(0);
      return (
        <>
          <Combobox label="取引先" defaultValue="tokyo" options={options.map((o) => ({ ...o }))} />
          <button onClick={() => setTick(tick + 1)}>描き直す{tick}</button>
        </>
      );
    }
    render(<Parent />);
    await userEvent.clear(input());
    await userEvent.type(input(), 'おお');
    fireEvent.click(screen.getByRole('button', { name: /描き直す/ }));
    expect(input()).toHaveValue('おお');
  });
  it('puts back the chosen name when leaving with edited text', async () => {
    const onValueChange = vi.fn();
    render(
      <Combobox
        label="取引先"
        options={options}
        defaultValue="tokyo"
        onValueChange={onValueChange}
      />,
    );
    await userEvent.type(input(), '{Backspace}{Backspace}');
    await userEvent.keyboard('{Escape}');
    await userEvent.tab();
    expect(input()).toHaveValue('東京商事株式会社');
    expect(onValueChange).not.toHaveBeenCalled();
  });
  it('clears text that matches nothing when leaving without a choice', async () => {
    render(<Combobox label="取引先" options={options} />);
    await userEvent.type(input(), 'ぞぞ');
    await userEvent.tab();
    expect(input()).toHaveValue('');
  });
  it('reports clearing once when Esc empties a chosen field', async () => {
    const onValueChange = vi.fn();
    render(
      <Combobox
        label="取引先"
        options={options}
        defaultValue="abc"
        onValueChange={onValueChange}
      />,
    );
    input().focus();
    await userEvent.keyboard('{Escape}');
    expect(input()).toHaveValue('');
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(null);
  });
  it('counts only options that can be chosen', async () => {
    render(<Combobox label="取引先" options={options} />);
    await userEvent.type(input(), 'しすてむ');
    expect(names()).toEqual(['福岡システムズ']);
    expect(screen.getByRole('status')).toHaveTextContent('一致する候補がありません');
  });
  it('keeps the typed text when the button is pressed after Esc', async () => {
    render(<Combobox label="取引先" options={options} />);
    await userEvent.type(input(), 'おお');
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: '候補を開く' }));
    expect(input()).toHaveValue('おお');
    expect(input()).toHaveFocus();
    expect(names()).toEqual(['大阪精機']);
  });
  it('keeps the focus in the input when the empty line is pressed', async () => {
    render(<Combobox label="取引先" options={options} defaultValue="tokyo" />);
    await userEvent.clear(input());
    await userEvent.type(input(), 'ぞぞ');
    await userEvent.click(screen.getByText('一致する候補がありません', { selector: 'li' }));
    expect(input()).toHaveFocus();
  });
  it('does not send the value while disabled', () => {
    const { container } = render(
      <form>
        <Combobox label="取引先" options={options} name="partner" disabled defaultValue="osaka" />
      </form>,
    );
    expect(new FormData(container.querySelector('form')!).get('partner')).toBeNull();
  });
  it('sends the chosen value with name', async () => {
    const { container } = render(
      <form>
        <Combobox label="取引先" options={options} name="partner" defaultValue="abc" />
      </form>,
    );
    expect(container.querySelector('input[type="hidden"]')).toHaveAttribute('value', 'abc');
    expect(container.querySelector('input[type="hidden"]')).toHaveAttribute('name', 'partner');
  });
  it('does not filter or choose while converting', async () => {
    const onValueChange = vi.fn();
    render(<Combobox label="取引先" options={options} onValueChange={onValueChange} />);
    const field = input();
    field.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(names()).toHaveLength(options.length);
    fireEvent.compositionStart(field);
    fireEvent.change(field, { target: { value: 'おおさか' } });
    // The filter waits for the committed text.
    expect(names()).toHaveLength(options.length);
    // Chrome: the committing Enter comes with isComposing.
    fireEvent.keyDown(field, { key: 'Enter', isComposing: true });
    expect(onValueChange).not.toHaveBeenCalled();
    act(() => {
      fireEvent.compositionEnd(field, { data: 'おおさか' });
    });
    expect(names()).toEqual(['大阪精機']);
    // Safari: the committing Enter comes after compositionend with keyCode 229.
    fireEvent.keyDown(field, { key: 'Enter', keyCode: 229 });
    expect(onValueChange).not.toHaveBeenCalled();
  });
  it('closes only the list on Esc inside a dialog', async () => {
    render(
      <Dialog
        trigger={<Button>開く</Button>}
        title="取引先を変える"
        description="新しい取引先を選びます。"
      >
        <Combobox label="取引先" options={options} />
      </Dialog>,
    );
    await userEvent.click(screen.getByRole('button', { name: '開く' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByRole('combobox'), 'お');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
  it('has no axe violations while open', async () => {
    const { container } = render(<Combobox label="取引先" options={options} />);
    await userEvent.click(screen.getByRole('button', { name: '候補を開く' }));
    const results = await axe.run(container.ownerDocument.body, {
      // The fragment has no page landmarks; colours are checked by the contrast tests.
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
