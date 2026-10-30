// The tuning page's save check. The dev server's Python lookup resolves a path from its own file
// URL, which the test environment does not give, and is not used here.
import { describe, it, expect, vi } from 'vitest';
import tokens from '../../tokens/tokens.json';
import { normaliseConfig, PRESETS, type WearConfig } from '../wear/presets.mjs';
import { validate } from '../../scripts/wear/tune-server.mjs';

vi.mock('../../scripts/wear/python.mjs', () => ({
  VENV: '',
  wearPython: () => 'python3',
  missingMessage: () => '',
}));

describe('Age: the tuning page saves only values within WCAG AA', () => {
  const strong = normaliseConfig({ preset: 'strong', ...PRESETS.strong });
  const loudest: WearConfig = {
    ...strong,
    age: { fade: 1, mottle: 1, rules: 1, chips: 1 },
  };

  it('saves every preset and every age slider at the top of its range', () => {
    for (const name of Object.keys(PRESETS))
      expect(
        validate(
          normaliseConfig({ preset: name, ...PRESETS[name as keyof typeof PRESETS] }),
          tokens,
        ),
      ).toEqual([]);
    expect(validate(loudest, tokens)).toEqual([]);
  });

  it('refuses values outside the sliders', () => {
    expect(validate({ ...loudest, age: { ...loudest.age, fade: 1.2 } }, tokens)).toContain(
      'age.fade は 0〜1 にしてください。',
    );
  });
});
