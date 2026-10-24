import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import tokens from '../../tokens/tokens.json';
import { buildWear, kasureField } from '../../scripts/build-wear.mjs';
import { seedFor, mulberry32, noise2 } from '../wear/seed.mjs';
import { KASURE_FLOOR, SURFACE_MAX } from '../wear/params.mjs';
import { KeiProvider, Dialog, Button } from '../index';

describe('Wear: seeded and reproducible', () => {
  it('keeps the baked CSS and texture hashes identical to what the salt generates', () => {
    // Run `npm run wear` after changing the generator or params.
    const meta = JSON.parse(readFileSync('src/styles/wear/wear.json', 'utf8'));
    const built = buildWear(meta.salt, tokens);
    expect(readFileSync('src/styles/wear/baked.css', 'utf8')).toBe(built.css);
    expect(meta.pixels).toEqual(built.meta.pixels);
    expect(meta.surfaceMax).toBe(SURFACE_MAX);
    expect(meta.kasureFloor).toBe(KASURE_FLOOR);
  });

  it('draws the same wear for the same salt and different wear for another', () => {
    expect(buildWear('kei', tokens).meta.pixels).toEqual(buildWear('kei', tokens).meta.pixels);
    expect(buildWear('ash', tokens).meta.pixels).not.toEqual(buildWear('kei', tokens).meta.pixels);
    expect(seedFor('kei', 'card', 2)).toBe(seedFor('kei', 'card', 2));
    expect(seedFor('kei', 'card', 2)).not.toBe(seedFor('kei', 'card', 3));
    const [a, b] = [mulberry32(7), mulberry32(7)];
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('tiles without a seam', () => {
    expect(noise2(5, 0, 0.3, 4)).toBeCloseTo(noise2(5, 4, 0.3, 4), 12);
    expect(noise2(5, 1.2, 0, [6, 64])).toBeCloseTo(noise2(5, 1.2, 64, [6, 64]), 12);
  });

  it('never lets the dry brush fade a glyph below the floor', () => {
    expect(Math.min(...kasureField('kei'))).toBeGreaterThanOrEqual(KASURE_FLOOR - 1e-6);
  });
});

describe('Wear: what it may touch', () => {
  const css = readFileSync('src/styles/kei-wear.css', 'utf8');
  it('leaves focus, controls and status marks alone', () => {
    for (const untouched of [
      ':focus',
      '.k-button',
      '.k-input',
      '.k-select',
      '.k-badge',
      '.k-status-dot',
      '.k-alert',
      '.k-tone-',
      '.k-switch',
      '.k-checkbox',
    ])
      expect(css).not.toContain(untouched);
  });
  it('never changes the size or position of a box', () => {
    const declarations = css.replace(/\/\*[\s\S]*?\*\//g, '').match(/^\s*[a-z-]+(?=:)/gm) ?? [];
    const allowed = new Set([
      'background-image',
      'background-size',
      'mask',
      'mask-image',
      'mask-size',
      'mask-clip',
      'text-shadow',
      'stroke-dasharray',
      'filter',
      'content',
      'position',
      'inset',
      'border-radius',
      'background',
      'clip-path',
      '--k-font-sans',
      '--k-font-mono',
    ]);
    // position/inset only appear on the meter's ::before, which is absolutely placed inside it.
    expect(declarations.map((d) => d.trim()).filter((d) => !allowed.has(d))).toEqual([]);
  });
});

describe('Wear: provider', () => {
  afterEach(() => vi.unstubAllGlobals());
  const media = (matches: string[]) =>
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: matches.includes(query),
      addEventListener: () => {},
      removeEventListener: () => {},
    }));

  it('defaults to off', () => {
    render(<KeiProvider data-testid="scope" />);
    expect(screen.getByTestId('scope')).toHaveAttribute('data-wear', 'off');
  });

  it('turns wear off for more contrast and forced colours, and live into baked for less motion', () => {
    media(['(prefers-contrast: more)']);
    const { unmount } = render(<KeiProvider data-testid="scope" wear="live" />);
    expect(screen.getByTestId('scope')).toHaveAttribute('data-wear', 'off');
    unmount();
    media(['(prefers-reduced-motion: reduce)']);
    render(<KeiProvider data-testid="scope" wear="live" />);
    expect(screen.getByTestId('scope')).toHaveAttribute('data-wear', 'baked');
  });

  it('writes seeded live filters and carries them into portals', async () => {
    const { container } = render(
      <KeiProvider wear="live" wearSeed="ash" theme="ink">
        <Dialog trigger={<Button>開く</Button>} title="表示設定" description="表示を調整">
          <Button>保存</Button>
        </Dialog>
      </KeiProvider>,
    );
    const scope = container.querySelector('.kei') as HTMLElement;
    const filter = scope.style.getPropertyValue('--k-wear-heading-0');
    const id = filter.match(/url\(#(.+)\)/)![1];
    const turbulence = scope.querySelector(`#${id} feTurbulence`)!;
    expect(turbulence.getAttribute('seed')).toBe(String(seedFor('ash', 'heading', 0) % 100000));
    expect(scope.style.getPropertyValue('--k-wear-surface')).toContain('data:image/svg+xml');
    await userEvent.click(screen.getByRole('button', { name: '開く' }));
    const portal = screen.getByRole('dialog', { name: '表示設定' }).closest('.kei') as HTMLElement;
    expect(portal).toHaveAttribute('data-wear', 'live');
    expect(portal.style.getPropertyValue('--k-wear-heading-0')).toBe(filter);
  });
});
