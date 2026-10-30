import { describe, it, expect, afterEach, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import tokens from '@kei-design/tokens/tokens.json';
import { buildWear, readConfig } from '../../scripts/build-wear.mjs';
import { seedFor, mulberry32, noise2 } from '../wear/seed.mjs';
import { KASURE_FLOOR, SURFACE_MAX } from '../wear/params.mjs';
import { normaliseConfig, PRESETS } from '../wear/presets.mjs';
import {
  kasureField,
  sheetThemeVars,
  sheetVars,
  textures,
  wearVars,
  yakeField,
} from '../wear/textures.mjs';
import { SHEET, SHEET_SLICE } from '../wear/presets.mjs';
import { contrastGauge, outlineGauge, gauges } from '../wear/gauges.mjs';
import { liveWearStyle } from '../wear/live';
import { KeiProvider, Dialog, Button } from '../index';

describe('Wear: seeded and reproducible', () => {
  const config = readConfig();
  it('keeps src/styles/wear identical to what wear.config.json generates', () => {
    // Run `npm run wear` after changing wear.config.json, the generator or the text kinds.
    const meta = JSON.parse(readFileSync('src/styles/wear/wear.json', 'utf8'));
    const built = buildWear(config, tokens);
    expect(meta.config).toEqual(config);
    expect(readFileSync('src/styles/wear/baked.css', 'utf8')).toBe(built.css);
    expect(readFileSync('src/styles/wear/rules.css', 'utf8')).toBe(built.rules);
    expect(meta.pixels).toEqual(built.meta.pixels);
    expect(SURFACE_MAX).toBe(config.stain.strength);
    expect(KASURE_FLOOR).toBe(config.kasure.floor);
  }, 20000);

  it.runIf(existsSync('wear-fonts/current.json'))(
    'keeps the worn fonts in step with wear.config.json',
    () => {
      // Run `npm run wear:font` after changing the salt or the outline.
      const fonts = JSON.parse(readFileSync('wear-fonts/current.json', 'utf8'));
      expect({ salt: fonts.salt, outline: fonts.outline }).toEqual({
        salt: config.salt,
        outline: config.outline,
      });
    },
  );

  it('draws the same wear for the same values and different wear for another salt', () => {
    expect(buildWear(config, tokens).meta.pixels).toEqual(buildWear(config, tokens).meta.pixels);
    expect(buildWear({ ...config, salt: 'ash' }, tokens).meta.pixels).not.toEqual(
      buildWear(config, tokens).meta.pixels,
    );
    expect(seedFor('kei', 'card', 2)).toBe(seedFor('kei', 'card', 2));
    expect(seedFor('kei', 'card', 2)).not.toBe(seedFor('kei', 'card', 3));
    const [a, b] = [mulberry32(7), mulberry32(7)];
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    // Four builds of every texture, the 512px yake frame among them.
  }, 20000);

  it('tiles without a seam', () => {
    expect(noise2(5, 0, 0.3, 4)).toBeCloseTo(noise2(5, 4, 0.3, 4), 12);
    expect(noise2(5, 1.2, 0, [6, 64])).toBeCloseTo(noise2(5, 1.2, 64, [6, 64]), 12);
  });

  it('never lets the dry brush fade a glyph below the floor', () => {
    for (const preset of Object.values(PRESETS))
      expect(Math.min(...kasureField(preset.salt, preset.kasure))).toBeGreaterThanOrEqual(
        preset.kasure.floor - 1e-6,
      );
  });

  it('browns the sheet from its edges and keeps the middle of the frame clear', () => {
    for (const preset of Object.values(PRESETS)) {
      const field = yakeField(preset.salt, preset.yake);
      const at = (x: number, y: number) => field[y * SHEET + x];
      // The middle slice is stretched across the screen: nothing in it, so no stripe appears.
      for (let y = SHEET_SLICE; y < SHEET - SHEET_SLICE; y += 7)
        for (let x = SHEET_SLICE; x < SHEET - SHEET_SLICE; x += 7) expect(at(x, y)).toBe(0);
      // Deeper toward the edge, and deepest in the corners.
      const mid = SHEET / 2;
      expect(at(mid, 0)).toBeGreaterThan(at(mid, 40));
      const corner = Math.max(
        at(0, 0),
        at(SHEET - 1, 0),
        at(0, SHEET - 1),
        at(SHEET - 1, SHEET - 1),
      );
      expect(corner).toBeGreaterThan(at(mid, 0));
      expect(field.every((v) => v <= 1)).toBe(true);
    }
  });

  it('gives live the same textures and offsets as the baked build', () => {
    const live = liveWearStyle('t', config, 'paper') as Record<string, string>;
    const shared = wearVars(config, 'KASURE');
    for (const [name, value] of Object.entries(shared))
      if (name !== '--k-wear-kasure') expect(live[name]).toBe(value);
    for (const [name, value] of Object.entries(sheetVars(config))) expect(live[name]).toBe(value);
    expect(live['--k-wear-rim']).toBe(
      sheetThemeVars(config, 'paper', { yake: '', sure: '' }, tokens)['--k-wear-rim'],
    );
    // The same pixels, stored rather than compressed.
    const stored = textures(config, tokens);
    expect(stored.pixels).toEqual(textures(config, tokens, (rows) => deflateSync(rows)).pixels);
  });
});

describe('Wear: presets and gauges', () => {
  it('keeps the standard preset within every readability guide', () => {
    expect(gauges(normaliseConfig(PRESETS.standard), tokens).level).toBe('ok');
  });
  it('keeps text contrast at 4.5:1 at the darkest point for every preset', () => {
    for (const preset of Object.values(PRESETS))
      for (const { min } of Object.values(contrastGauge(normaliseConfig(preset), tokens)))
        expect(min).toBeGreaterThanOrEqual(4.5);
  });
  it('flags edges asked to move too far and small worn text', () => {
    const config = normaliseConfig({ outline: { rough: 20, swell: 12 } });
    expect(outlineGauge(config, 'text', 16).level).toBe('warn');
    // The font caps the move at a quarter of the thinnest stroke, however far it is asked to go.
    expect(outlineGauge(config, 'text', 16).px).toBeCloseTo((0.25 * 60 * 16) / 1000);
    const small = normaliseConfig({ kinds: { small: { distort: true, kasure: 0 } } });
    expect(outlineGauge(small, 'small', 12).level).toBe('caution');
  });
});

describe('Wear: what it may touch', () => {
  const css = ['kei-wear.css', 'wear/rules.css', 'wear/baked.css']
    .map((file) => readFileSync(`src/styles/${file}`, 'utf8'))
    .join('\n');
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
      'background-position',
      'mask',
      'mask-image',
      'mask-size',
      'mask-position',
      'mask-clip',
      'stroke-dasharray',
      'filter',
      'content',
      'position',
      'inset',
      'border-radius',
      'background',
      'clip-path',
      // Worn faces keep every advance width (checked by npm run wear:font), so text does not move.
      'font-family',
      '--k-font-mono',
      // The sheet: the root's ::before and ::after are fixed (or absolute) behind the content, and
      // its own stacking context keeps them there. The border is 0 wide; only its image is drawn.
      'isolation',
      'z-index',
      'pointer-events',
      'border-style',
      'border-width',
      'border-image',
      // Control outlines darken with the worn paper to keep 3:1 (a colour, not a size).
      '--k-border-strong',
      // Cards and metrics brown along their edges with an inset shadow, which takes no room.
      'box-shadow',
    ]);
    // position/inset appear on the meter's ::before, absolutely placed inside it, and on the
    // root's sheet layers, which are fixed to the viewport.
    expect(
      declarations
        .map((d) => d.trim())
        .filter((d) => !allowed.has(d) && !d.startsWith('--k-wear-')),
    ).toEqual([]);
  });
});

describe('Wear: published types', () => {
  // tsc copies no .d.mts into lib, so build:lib copies the ones the published types name.
  it('ships every .d.mts that lib/*.d.ts imports types from', () => {
    const script = JSON.parse(readFileSync('package.json', 'utf8')).scripts['build:lib'];
    const typeImports = (file: string) =>
      [...readFileSync(file, 'utf8').matchAll(/import (type )?\{([^}]*)\} from '([^']+\.mjs)'/g)]
        .filter(([, all, names]) => all || /\btype\b/.test(names))
        .map(([, , , from]) => from.replace(/^.*\//, '').replace(/\.mjs$/, ''));
    const wanted = new Set(
      ['src/components/system.tsx', 'src/wear/live.tsx'].flatMap((file) => typeImports(file)),
    );
    for (const name of [...wanted])
      typeImports(`src/wear/${name}.d.mts`).forEach((n) => wanted.add(n));
    for (const name of wanted)
      expect(script, `build:lib に src/wear/${name}.d.mts を lib/wear/ へ写す cp を足す`).toContain(
        `src/wear/${name}.d.mts`,
      );
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

  it('follows the reader changing the setting while the page is open', () => {
    const on = new Set<string>();
    const listeners = new Set<() => void>();
    vi.stubGlobal('matchMedia', (query: string) => ({
      get matches() {
        return on.has(query);
      },
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    }));
    const flip = (query: string) =>
      act(() => {
        if (!on.delete(query)) on.add(query);
        listeners.forEach((listener) => listener());
      });
    render(<KeiProvider data-testid="scope" wear="live" age="heavy" />);
    const scope = screen.getByTestId('scope');
    // Every query keeps its hook whichever matches first, so the provider never throws.
    flip('(prefers-contrast: more)');
    expect(scope).toHaveAttribute('data-wear', 'off');
    expect(scope).toHaveAttribute('data-age', 'none');
    flip('(forced-colors: active)');
    flip('(prefers-contrast: more)');
    expect(scope).toHaveAttribute('data-wear', 'off');
    flip('(forced-colors: active)');
    expect(scope).toHaveAttribute('data-wear', 'live');
    expect(scope).toHaveAttribute('data-age', 'heavy');
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
    expect(scope.style.getPropertyValue('--k-wear-surface')).toMatch(
      /^url\((blob:|data:image\/png)/,
    );
    await userEvent.click(screen.getByRole('button', { name: '開く' }));
    const portal = screen.getByRole('dialog', { name: '表示設定' }).closest('.kei') as HTMLElement;
    expect(portal).toHaveAttribute('data-wear', 'live');
    expect(portal.style.getPropertyValue('--k-wear-heading-0')).toBe(filter);
  });
});
