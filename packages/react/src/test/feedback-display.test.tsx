import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import tokens from '@lievre/tokens/tokens.json';
import { ratio, resolve, themeTokens } from '../wear/contrast.mjs';
import { Counter, Divider, EmptyState, Skeleton } from '../index';

describe('Skeleton shapes', () => {
  it('draws text lines as one status with the asked number of lines', () => {
    const { container } = render(<Skeleton shape="text" lines={4} label="説明を読み込み中" />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status', { name: '説明を読み込み中' })).toBeInTheDocument();
    expect(container.querySelectorAll('.lv-skeleton-line')).toHaveLength(4);
  });
  it('keeps at least one line', () => {
    const { container } = render(<Skeleton shape="text" lines={0} />);
    expect(container.querySelectorAll('.lv-skeleton-line')).toHaveLength(1);
  });
  it('makes a circle as tall as it is wide', () => {
    render(<Skeleton shape="circle" width={32} height={100} />);
    const circle = screen.getByRole('status');
    expect(circle).toHaveClass('lv-skeleton--circle');
    expect(circle.style.width).toBe('32px');
    expect(circle.style.height).toBe('32px');
  });
  it('keeps the old defaults for a rectangle', () => {
    render(<Skeleton />);
    const rect = screen.getByRole('status', { name: '読み込み中' });
    expect(rect.style.width).toBe('100%');
    expect(rect.style.height).toBe('16px');
  });
});

describe('EmptyState size', () => {
  it('drops the picture in the small form and keeps the heading', () => {
    const { container } = render(
      <EmptyState size="sm" title="通知はありません" description="届くと並びます。" icon={<svg />} />,
    );
    expect(container.querySelector('.lv-empty--sm')).not.toBeNull();
    expect(container.querySelector('.lv-empty-icon')).toBeNull();
    expect(screen.getByRole('heading', { name: '通知はありません' })).toBeInTheDocument();
  });
});

describe('Divider orientation', () => {
  it('tells a vertical separator its orientation and drops the label', () => {
    render(<Divider orientation="vertical" label="詳細" />);
    const line = screen.getByRole('separator');
    expect(line).toHaveAttribute('aria-orientation', 'vertical');
    expect(line).toHaveTextContent('');
  });
  it('leaves a horizontal separator without aria-orientation (its default)', () => {
    render(<Divider label="詳細" />);
    expect(screen.getByRole('separator')).not.toHaveAttribute('aria-orientation');
  });
  it('hides a decorative line from the reader', () => {
    render(<Divider decorative orientation="vertical" />);
    expect(screen.queryByRole('separator')).toBeNull();
  });
});

describe('Counter', () => {
  it('shows the figure and reads the label with the unit', () => {
    const { container } = render(<Counter value={12} label="未読" />);
    expect(container.querySelector('.lv-counter-value')).toHaveTextContent('12');
    expect(container.querySelector('.lv-counter-value')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('未読 12件')).toHaveClass('lv-sr-only');
  });
  it('shortens a count over max and says it is more', () => {
    render(<Counter value={1200} max={999} label="通知" unit="通" />);
    expect(screen.getByText('999+')).toBeInTheDocument();
    expect(screen.getByText('通知 999通より多い')).toBeInTheDocument();
  });
  it('keeps the count itself at max', () => {
    render(<Counter value={99} label="未読" />);
    expect(screen.getByText('99')).toBeInTheDocument();
  });
  for (const theme of ['paper', 'ink'] as const) {
    const set = themeTokens(tokens, theme);
    for (const [foreground, background] of [
      ['text', 'surface-sunken'],
      ['on-accent', 'accent'],
      ['on-danger', 'danger'],
    ])
      it(`${theme}: ${foreground} on ${background} reaches 4.5:1`, () => {
        expect(ratio(resolve(set, foreground), resolve(set, background))).toBeGreaterThanOrEqual(
          4.5,
        );
      });
  }
});
