import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import axe from 'axe-core';
import {
  Button,
  Dialog,
  NumberField,
  SearchField,
  checkNumber,
  numberCheckMessage,
} from '../index';

describe('SearchField', () => {
  const box = () => screen.getByRole('searchbox', { name: '取引先を探す' });
  it('is a named search box with the hint tied to it', () => {
    render(<SearchField label="取引先を探す" hint="名前か読みで探せます" />);
    expect(box()).toHaveAccessibleDescription('名前か読みで探せます');
    expect(box()).toHaveAttribute('enterkeyhint', 'search');
  });
  it('searches on Enter with the trimmed text', async () => {
    const onSearch = vi.fn();
    render(<SearchField label="取引先を探す" onSearch={onSearch} />);
    await userEvent.type(box(), ' 東京 {Enter}');
    expect(onSearch).toHaveBeenCalledWith('東京');
  });
  it('neither searches on the Enter that commits a conversion nor reports the text being converted', () => {
    const onSearch = vi.fn();
    const onValueChange = vi.fn();
    render(<SearchField label="取引先を探す" onSearch={onSearch} onValueChange={onValueChange} />);
    fireEvent.compositionStart(box());
    fireEvent.change(box(), { target: { value: 'とうきょう' } });
    expect(onValueChange).not.toHaveBeenCalled();
    // Chrome's order: the committing Enter comes with isComposing.
    fireEvent.keyDown(box(), { key: 'Enter', isComposing: true });
    // Safari's order: after compositionend, with keyCode 229.
    fireEvent.change(box(), { target: { value: '東京' } });
    fireEvent.compositionEnd(box());
    fireEvent.keyDown(box(), { key: 'Enter', keyCode: 229 });
    expect(onSearch).not.toHaveBeenCalled();
    expect(onValueChange).toHaveBeenLastCalledWith('東京');
    expect(box()).toHaveValue('東京');
  });
  it('clears with the button and with Esc, keeping the focus', async () => {
    const onValueChange = vi.fn();
    render(<SearchField label="取引先を探す" onValueChange={onValueChange} />);
    expect(screen.queryByRole('button', { name: '文字を消す' })).toBeNull();
    await userEvent.type(box(), 'abc');
    await userEvent.click(screen.getByRole('button', { name: '文字を消す' }));
    expect(box()).toHaveValue('');
    expect(box()).toHaveFocus();
    expect(onValueChange).toHaveBeenLastCalledWith('');
    await userEvent.type(box(), 'xyz{Escape}');
    expect(box()).toHaveValue('');
  });
  it('leaves the text alone when Esc closes a dialog around it', async () => {
    const onValueChange = vi.fn();
    render(
      <Dialog trigger={<Button>開く</Button>} title="取引先" description="探して選びます。">
        <SearchField label="取引先を探す" defaultValue="東京" onValueChange={onValueChange} />
      </Dialog>,
    );
    await userEvent.click(screen.getByRole('button', { name: '開く' }));
    await userEvent.click(box());
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onValueChange).not.toHaveBeenCalled();
  });
  it('follows a controlled value', async () => {
    function Controlled() {
      const [value, setValue] = useState('大阪');
      return (
        <>
          <SearchField label="取引先を探す" value={value} onValueChange={setValue} />
          <button onClick={() => setValue('')}>戻す</button>
        </>
      );
    }
    render(<Controlled />);
    expect(box()).toHaveValue('大阪');
    await userEvent.type(box(), '精機');
    expect(box()).toHaveValue('大阪精機');
    await userEvent.click(screen.getByRole('button', { name: '戻す' }));
    expect(box()).toHaveValue('');
  });
  it('has no axe violations', async () => {
    const { container } = render(<SearchField label="取引先を探す" defaultValue="東京" />);
    expect((await axe.run(container)).violations).toEqual([]);
  });
});

describe('checkNumber', () => {
  it('takes full-width digits, grouping and signs', () => {
    expect(checkNumber('１，２３４．５')).toEqual({ kind: 'ok', value: 1234.5 });
    expect(checkNumber('−3')).toEqual({ kind: 'ok', value: -3 });
    expect(checkNumber('-0')).toEqual({ kind: 'ok', value: 0 });
    expect(checkNumber(' 12 ')).toEqual({ kind: 'ok', value: 12 });
  });
  it('tells empty, not a number, decimals and the range apart', () => {
    expect(checkNumber('').kind).toBe('empty');
    expect(checkNumber('12a').kind).toBe('not-number');
    expect(checkNumber('1e3').kind).toBe('not-number');
    expect(checkNumber('1.25', { fractionDigits: 1 }).kind).toBe('too-many-decimals');
    expect(checkNumber('0', { min: 1 }).kind).toBe('below-min');
    expect(checkNumber('100', { max: 99 }).kind).toBe('above-max');
  });
  it('words each reason with how to fix it', () => {
    expect(numberCheckMessage({ kind: 'below-min', min: 1000, value: 5 }, '円')).toBe(
      '1,000円以上の数を入れてください。',
    );
    expect(numberCheckMessage({ kind: 'too-many-decimals', fractionDigits: 0, value: 1.5 })).toBe(
      '小数ではなく、整数で入れてください。',
    );
    expect(numberCheckMessage({ kind: 'ok', value: 1 })).toBeUndefined();
  });
});

describe('NumberField', () => {
  const box = () => screen.getByRole('textbox', { name: '数量' });
  it('reports the number as typed and writes it grouped on leaving', async () => {
    const onValueChange = vi.fn();
    render(<NumberField label="数量" unit="個" onValueChange={onValueChange} />);
    await userEvent.type(box(), '１２３４');
    expect(onValueChange).toHaveBeenLastCalledWith(1234);
    await userEvent.tab();
    expect(box()).toHaveValue('1,234');
    expect(box()).toHaveAccessibleDescription(/個/);
  });
  it('steps with the arrows and stops at min and max', async () => {
    const onValueChange = vi.fn();
    render(<NumberField label="数量" min={1} max={3} step={1} onValueChange={onValueChange} />);
    await userEvent.click(box());
    await userEvent.keyboard('{ArrowUp}');
    expect(box()).toHaveValue('2');
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
    expect(box()).toHaveValue('3');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(box()).toHaveValue('1');
    expect(onValueChange).toHaveBeenLastCalledWith(1);
  });
  it('steps from the number typed even when it does not pass', async () => {
    render(<NumberField label="数量" max={100} step={1} />);
    await userEvent.type(box(), '150');
    await userEvent.keyboard('{ArrowDown}');
    expect(box()).toHaveValue('100');
  });
  it('offers a number pad only when no negative is taken', () => {
    const { rerender } = render(<NumberField label="数量" min={0} fractionDigits={0} />);
    expect(box()).toHaveAttribute('inputmode', 'numeric');
    rerender(<NumberField label="数量" min={0} />);
    expect(box()).toHaveAttribute('inputmode', 'decimal');
    rerender(<NumberField label="数量" />);
    expect(box()).not.toHaveAttribute('inputmode');
    rerender(<NumberField label="数量" min={-10} />);
    expect(box()).not.toHaveAttribute('inputmode');
  });
  it('keeps the decimals typed when stepping by a whole number', async () => {
    render(<NumberField label="数量" step={1} />);
    await userEvent.type(box(), '12.5');
    await userEvent.keyboard('{ArrowUp}');
    expect(box()).toHaveValue('13.5');
  });
  it('steps by decimals without float noise', async () => {
    render(<NumberField label="数量" step={0.1} defaultValue={0.2} />);
    await userEvent.click(box());
    await userEvent.keyboard('{ArrowUp}');
    expect(box()).toHaveValue('0.3');
  });
  it('keeps the decimals it is given and pads them on leaving', async () => {
    render(<NumberField label="数量" fractionDigits={2} />);
    await userEvent.type(box(), '1.5');
    await userEvent.tab();
    expect(box()).toHaveValue('1.50');
  });
  it('checks on leaving and says how to fix it, reporting null', async () => {
    const onValueChange = vi.fn();
    render(<NumberField label="数量" min={1} defaultValue={5} onValueChange={onValueChange} />);
    await userEvent.clear(box());
    await userEvent.type(box(), '0');
    expect(screen.queryByText('1以上の数を入れてください。')).toBeNull();
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    await userEvent.tab();
    expect(screen.getByText('1以上の数を入れてください。')).toBeInTheDocument();
    expect(box()).toHaveAttribute('aria-invalid', 'true');
    expect(box()).toHaveValue('0');
  });
  it('follows a controlled value and keeps its own echo', async () => {
    function Controlled() {
      const [value, setValue] = useState<number | null>(1200);
      return (
        <>
          <NumberField label="数量" value={value} onValueChange={setValue} />
          <button onClick={() => setValue(5)}>変える</button>
        </>
      );
    }
    render(<Controlled />);
    expect(box()).toHaveValue('1,200');
    await userEvent.type(box(), '.');
    expect(box()).toHaveValue('1,200.');
    await userEvent.click(screen.getByRole('button', { name: '変える' }));
    expect(box()).toHaveValue('5');
  });
  it('reports null for a starting or outside value that does not pass', async () => {
    const onValueChange = vi.fn();
    function Controlled() {
      const [value, setValue] = useState<number | null>(null);
      return (
        <>
          <NumberField
            label="数量"
            max={100}
            value={value}
            onValueChange={(next) => {
              onValueChange(next);
              setValue(next);
            }}
          />
          <button onClick={() => setValue(150)}>入れる</button>
          <output data-testid="value">{value ?? 'なし'}</output>
        </>
      );
    }
    render(<Controlled />);
    await userEvent.click(screen.getByRole('button', { name: '入れる' }));
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByTestId('value')).toHaveTextContent('なし');
    expect(box()).toHaveValue('150');
  });
  it('does not round a given number with more decimals than it takes', () => {
    const onValueChange = vi.fn();
    render(
      <NumberField
        label="数量"
        fractionDigits={0}
        defaultValue={1234.5}
        onValueChange={onValueChange}
      />,
    );
    expect(box()).toHaveValue('1,234.5');
    expect(onValueChange).toHaveBeenCalledWith(null);
    expect(onValueChange).not.toHaveBeenCalledWith(1235);
  });
  it('reports null for a starting value beyond max', () => {
    const onValueChange = vi.fn();
    render(<NumberField label="数量" max={10} defaultValue={50} onValueChange={onValueChange} />);
    expect(onValueChange).toHaveBeenCalledWith(null);
  });
  it('sends the plain number with name and nothing when it does not pass', async () => {
    const { container } = render(
      <form>
        <NumberField label="数量" name="qty" defaultValue={1234.5} />
      </form>,
    );
    const form = container.querySelector('form')!;
    expect(new FormData(form).get('qty')).toBe('1234.5');
    await userEvent.type(box(), 'x');
    expect(new FormData(form).get('qty')).toBe('');
  });
  it('has no axe violations', async () => {
    const { container } = render(<NumberField label="数量" unit="個" defaultValue={3} />);
    expect((await axe.run(container)).violations).toEqual([]);
  });
});
