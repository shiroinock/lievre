// Each KEI lint rule must still catch the mistake it was written for.
import { describe, it, expect } from 'vitest';
import stylelint from 'stylelint';
import { ESLint } from 'eslint';

async function cssRules(code: string) {
  const { results } = await stylelint.lint({ code, configFile: 'stylelint.config.mjs' });
  return results[0].warnings.map((w) => w.rule);
}

async function tsxMessages(code: string) {
  const [result] = await new ESLint().lintText(code, { filePath: 'src/Example.tsx' });
  return result.messages.map((m) => m.ruleId);
}

const face = (weight: number, range = 'U+0000-00FF') => `@font-face {
  font-family: 'KEI Mono';
  font-weight: ${weight};
  unicode-range: ${range};
}`;
const allFaces = [400, 500, 600].map((w) => face(w)).join('\n');

describe('stylelint: KEI rules', () => {
  it('rejects sizes in the utilities layer', async () => {
    expect(await cssRules('@layer kei.utilities { .k-mono { font-size: 1em; } }')).toContain(
      'kei/utilities-no-size',
    );
    expect(await cssRules('@layer kei.base { .k-mono { font-size: 1em; } }')).toEqual([]);
  });

  it('rejects full-width punctuation in the KEI Mono range', async () => {
    const css = allFaces + face(400, 'U+2000-206F');
    expect(await cssRules(css)).toContain('kei/mono-unicode-range');
    expect(await cssRules(allFaces + face(400, 'U+2010-2011'))).toEqual([]);
  });

  it('requires a KEI Mono face for every weight token', async () => {
    expect(await cssRules(face(400) + face(500))).toContain('kei/mono-weights');
    expect(await cssRules(allFaces)).toEqual([]);
  });

  it('requires forced-colors styles for states shown by a background', async () => {
    const forced = (body: string) => `@media (forced-colors: active) { ${body} }`;
    const state = ".k-x[data-state='on'], .k-y[data-highlighted] .k-z { background: blue; }";
    expect(await cssRules(state)).toContain('kei/forced-colors-state');
    // Each selector in the list needs its own forced-colors style.
    expect(
      await cssRules(state + forced(".k-x[data-state='on'] { background: Highlight; }")),
    ).toContain('kei/forced-colors-state');
    // Opting out of forced colours without a system colour does not count.
    expect(
      await cssRules(
        state +
          forced(
            ".k-x[data-state='on'], .k-y[data-highlighted] .k-z { forced-color-adjust: none; }",
          ),
      ),
    ).toContain('kei/forced-colors-state');
    expect(
      await cssRules(
        state +
          forced(
            ".k-x[data-state='on'], .k-y[data-highlighted] .k-z { outline: 2px solid Highlight; }",
          ),
      ),
    ).toEqual([]);
    expect(await cssRules('.k-x::after { background: blue; }')).toEqual([]);
  });

  it('requires a line-height in the font shorthand', async () => {
    expect(await cssRules('.a { font: 14px sans-serif; }')).toContain(
      'declaration-property-value-allowed-list',
    );
    expect(await cssRules('.a { font: 14px / 1.4 sans-serif; } .b { font: inherit; }')).toEqual([]);
  });
});

describe('eslint: KEI rules', () => {
  it('rejects a unit inside .k-mono', async () => {
    expect(await tsxMessages('export const A = <span className="k-mono">{1}%</span>;')).toContain(
      'kei/unit-outside-mono',
    );
    expect(
      await tsxMessages('export const A = <span><span className="k-mono">{1}</span>%</span>;'),
    ).toEqual([]);
  });
});

describe('the sources pass their own lint', () => {
  it('stylelint', async () => {
    const { results } = await stylelint.lint({
      files: 'src/**/*.css',
      configFile: 'stylelint.config.mjs',
    });
    expect(results.flatMap((r) => r.warnings.map((w) => `${r.source}: ${w.text}`))).toEqual([]);
  });

  it('eslint', async () => {
    const results = await new ESLint().lintFiles(['src']);
    expect(results.flatMap((r) => r.messages.map((m) => `${r.filePath}: ${m.message}`))).toEqual(
      [],
    );
  });
});
