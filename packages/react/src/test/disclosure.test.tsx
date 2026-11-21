import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Accordion, Disclosure, type AccordionItem } from '../index';

const items: AccordionItem[] = [
  { value: 'a', title: '手数料', content: 'かかりません。' },
  { value: 'b', title: '日数', content: '5営業日です。' },
  { value: 'c', title: '窓口', content: '平日の昼です。', disabled: true },
];

describe('Accordion', () => {
  it('puts each trigger inside a heading of the chosen level', () => {
    render(<Accordion items={items} headingLevel={2} />);
    const headings = screen.getAllByRole('heading', { level: 2 });
    expect(headings).toHaveLength(3);
    expect(headings[0]).toContainElement(screen.getByRole('button', { name: '手数料' }));
  });
  it('defaults to level 3', () => {
    render(<Accordion items={items} />);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
  });
  it('tells the open state through aria-expanded and names the region after the heading', async () => {
    render(<Accordion items={items} />);
    const button = screen.getByRole('button', { name: '手数料' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: '手数料' })).toHaveTextContent('かかりません。');
  });
  it('keeps one open at a time unless multiple, and can close all', async () => {
    const onValueChange = vi.fn();
    render(<Accordion items={items} defaultValue={['a']} onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('button', { name: '日数' }));
    expect(screen.getByRole('button', { name: '手数料' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(onValueChange).toHaveBeenLastCalledWith(['b']);
    await userEvent.click(screen.getByRole('button', { name: '日数' }));
    expect(onValueChange).toHaveBeenLastCalledWith([]);
  });
  it('opens several with multiple', async () => {
    const onValueChange = vi.fn();
    render(<Accordion items={items} multiple defaultValue={['a']} onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('button', { name: '日数' }));
    expect(screen.getByRole('button', { name: '手数料' })).toHaveAttribute('aria-expanded', 'true');
    expect(onValueChange).toHaveBeenLastCalledWith(['a', 'b']);
  });
  it('follows a controlled value', () => {
    const { rerender } = render(<Accordion items={items} value={['b']} />);
    expect(screen.getByRole('button', { name: '日数' })).toHaveAttribute('aria-expanded', 'true');
    rerender(<Accordion items={items} value={[]} />);
    expect(screen.getByRole('button', { name: '日数' })).toHaveAttribute('aria-expanded', 'false');
  });
  it('moves between headings with the arrow keys and skips a disabled one', async () => {
    render(<Accordion items={items} />);
    screen.getByRole('button', { name: '手数料' }).focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: '日数' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: '手数料' })).toHaveFocus();
    expect(screen.getByRole('button', { name: '窓口' })).toBeDisabled();
  });
});

describe('Disclosure', () => {
  it('opens and closes with aria-expanded pointing at the content', async () => {
    const onOpenChange = vi.fn();
    render(
      <Disclosure summary="詳しい条件" onOpenChange={onOpenChange}>
        18歳以上
      </Disclosure>,
    );
    const button = screen.getByRole('button', { name: '詳しい条件' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('18歳以上')).toBeNull();
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(button.getAttribute('aria-controls')!)).toHaveTextContent(
      '18歳以上',
    );
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
  });
  it('starts open with defaultOpen', () => {
    render(
      <Disclosure summary="詳しい条件" defaultOpen>
        18歳以上
      </Disclosure>,
    );
    expect(screen.getByText('18歳以上')).toBeInTheDocument();
  });
});
