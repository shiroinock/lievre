import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Chip, ChipGroup } from '../index';

describe('Chip', () => {
  it('is a plain label when nothing makes it interactive', () => {
    render(<Chip label="営業部" />);
    expect(screen.getByText('営業部')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('names the remove button after the label and calls onRemove', async () => {
    const onRemove = vi.fn();
    render(<Chip label="東京" onRemove={onRemove} />);
    await userEvent.click(screen.getByRole('button', { name: '東京を外す' }));
    expect(onRemove).toHaveBeenCalledOnce();
  });
  it('takes a custom remove name', () => {
    render(<Chip label="佐藤" removeLabel="担当者から佐藤を外す" onRemove={() => {}} />);
    expect(screen.getByRole('button', { name: '担当者から佐藤を外す' })).toBeInTheDocument();
  });
  it('disables the remove button with the chip', () => {
    render(<Chip label="東京" disabled onRemove={() => {}} />);
    expect(screen.getByRole('button', { name: '東京を外す' })).toBeDisabled();
  });
  it('toggles aria-pressed and shows a mark, not colour alone, when uncontrolled', async () => {
    const onSelectedChange = vi.fn();
    const { container } = render(<Chip label="要確認" onSelectedChange={onSelectedChange} />);
    const chip = screen.getByRole('button', { name: '要確認' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(container.querySelector('.lv-chip-mark')).toBeNull();
    await userEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('.lv-chip-mark')).not.toBeNull();
    expect(onSelectedChange).toHaveBeenLastCalledWith(true);
  });
  it('follows selected when controlled', async () => {
    function Controlled() {
      const [on, setOn] = useState(true);
      return <Chip label="稼働中" selected={on} onSelectedChange={setOn} />;
    }
    render(<Controlled />);
    const chip = screen.getByRole('button', { name: '稼働中' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'false');
  });
  it('does not change when the controlled value is held', async () => {
    render(<Chip label="稼働中" selected={false} />);
    const chip = screen.getByRole('button', { name: '稼働中' });
    await userEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'false');
  });
  it('groups chips under a name', () => {
    render(
      <ChipGroup label="絞り込みの条件">
        <Chip label="東京" />
      </ChipGroup>,
    );
    expect(screen.getByRole('group', { name: '絞り込みの条件' })).toHaveTextContent('東京');
  });
});
