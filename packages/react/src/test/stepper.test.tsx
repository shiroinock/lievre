import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { Stepper } from '../index';

const steps = [{ label: '入力' }, { label: '確認' }, { label: '完了' }];

describe('Stepper', () => {
  it('is an ordered list named by label, with the current step marked', () => {
    render(<Stepper label="申し込みの手順" steps={steps} current={1} />);
    const list = screen.getByRole('list', { name: '申し込みの手順' });
    expect(list.tagName).toBe('OL');
    const items = within(list).getAllByRole('listitem');
    expect(items.map((li) => li.getAttribute('aria-current'))).toEqual([null, 'step', null]);
    expect(items.map((li) => li.dataset.state)).toEqual(['done', 'current', 'upcoming']);
  });
  it('says done and current in words, not colour alone', () => {
    render(<Stepper label="手順" steps={steps} current={1} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('入力（完了）');
    expect(items[1]).toHaveTextContent('確認（現在）');
    expect(items[2]).toHaveTextContent(/^3完了$/);
  });
  it('marks every step done when current is past the last', () => {
    render(<Stepper label="手順" steps={steps} current={3} />);
    expect(screen.getAllByRole('listitem').every((li) => li.dataset.state === 'done')).toBe(true);
    expect(screen.queryByRole('listitem', { current: 'step' })).toBeNull();
  });
  it('has no axe violations', async () => {
    const { container } = render(<Stepper label="手順" steps={steps} current={1} />);
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});
