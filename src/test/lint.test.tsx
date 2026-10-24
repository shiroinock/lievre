// Each KEI lint rule must still catch the mistake it was written for.
import { describe, it, expect } from 'vitest';
import stylelint from 'stylelint';
import { ESLint } from 'eslint';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

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
    const state =
      ".k-x[data-state='on'], .k-y[data-highlighted] .k-z { background: var(--k-selected); }";
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
    expect(await cssRules('.k-x::after { background: var(--k-selected); }')).toEqual([]);
  });

  it('keeps spacing on the 4px grid', async () => {
    expect(await cssRules('.a { padding: 6px 12px; }')).toContain('kei/spacing-grid');
    expect(await cssRules('.a { gap: 10px; }')).toContain('kei/spacing-grid');
    expect(await cssRules('.kei { --k-cell-padding: 10px 12px; }')).toContain('kei/spacing-grid');
    expect(
      await cssRules(
        '.a { padding: 0 16px; margin: -1px; gap: var(--k-space-2); margin-top: calc((1lh - 20px) / 2); width: 6px; }',
      ),
    ).toEqual([]);
    // An exception has to say why.
    expect(
      await cssRules('/* stylelint-disable-next-line kei/spacing-grid */\n.a { padding: 2px; }'),
    ).toContain('--report-descriptionless-disables');
    expect(
      await cssRules(
        '/* stylelint-disable-next-line kei/spacing-grid -- 18px thumb */\n.a { padding: 2px; }',
      ),
    ).toEqual([]);
  });

  it('keeps surface tokens in the theme layer', async () => {
    expect(await cssRules('.panel { --k-surface: #2424d8; }')).toContain('kei/surface-tokens');
    expect(await cssRules('@layer kei.components { .x { --k-bg: red; } }')).toContain(
      'kei/surface-tokens',
    );
    expect(
      await cssRules(
        "@layer kei.tokens { .kei[data-theme='ink'] { --k-surface-sunken: #070920; } }",
      ),
    ).toEqual([]);
    expect(await cssRules('.panel { background: var(--k-surface); }')).toEqual([]);
    // The app frame is a theme surface too: a page cannot paint its own sidebar colour.
    expect(await cssRules('.sidebar { --k-frame: #2424d8; }')).toContain('kei/surface-tokens');
    expect(await cssRules('.sidebar { --k-on-frame-selected: #fff; }')).toContain(
      'kei/surface-tokens',
    );
    expect(await cssRules('.sidebar { background: var(--k-frame); }')).toEqual([]);
  });

  it('rejects colours that do not come through a token', async () => {
    for (const code of [
      '.a { color: #2424d8; }',
      '@layer kei.components { .a { background: rgb(36 36 216); } }',
      '.a { border: 1px solid white; }',
      '.a { --demo-blue: oklch(0.5 0.2 270); }',
      '.a { box-shadow: 0 0 0 1px color(srgb 0 0 1); }',
    ])
      expect(await cssRules(code), code).toContain('kei/colour-tokens');
    expect(
      await cssRules(
        "@layer kei.tokens { .kei[data-theme='ink'] { --k-accent: #a9b1ff; --k-x: var(--k-accent); } }",
      ),
    ).toEqual([]);
    expect(
      await cssRules(
        '.a { color: var(--k-text); white-space: nowrap; background: color-mix(in srgb, var(--k-bg) 60%, transparent); mask: radial-gradient(#000, transparent); }',
      ),
    ).toEqual([]);
  });

  it('keeps colour literals out of the components and the demo', () => {
    // Inline styles in TSX would slip past stylelint; only token references are allowed there.
    // The foundations page prints each token's value as text.
    const files = execSync("git ls-files 'src/**/*.tsx' 'src/*.tsx'", { encoding: 'utf8' })
      .split('\n')
      .filter((f) => f && !f.startsWith('src/test/') && f !== 'src/docs/Foundations.tsx');
    const found = files.flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .map((line, i) => [file, i + 1, line] as const)
        .filter(([, , line]) => /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(/i.test(line)),
    );
    expect(found).toEqual([]);
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

// Layout gate (docs/quality-gate.md): the static rules.
describe('stylelint: KEI layout rules', () => {
  const part = (body: string) => `@layer kei.components { .k-x { ${body} } }`;

  it('requires a reason for left and right padding that differ', async () => {
    for (const body of [
      'padding: 0 8px 0 4px;',
      'padding-left: 4px;',
      'padding-inline: 4px 8px;',
      'padding: 8px; padding-right: 12px;',
    ])
      expect(await cssRules(part(body))).toContain('kei/padding-symmetry');
    for (const body of [
      'padding: 4px 8px;',
      'padding: 8px 12px 4px;',
      'padding: var(--k-space-2) 0 0;',
      'padding-left: 8px; padding-right: 8px;',
    ])
      expect(await cssRules(part(body))).toEqual([]);
    // Outside KEI's parts (demo pages, app styles) the rule does not apply.
    expect(await cssRules('.demo ul { padding-left: 1.5em; }')).toEqual([]);
    expect(
      await cssRules(
        part(
          '/* stylelint-disable-next-line kei/padding-symmetry -- 左の検索アイコンの分 */\n padding: 0 12px 0 36px;',
        ),
      ),
    ).toEqual([]);
  });

  it('requires a reason on every disable comment', async () => {
    const { results } = await stylelint.lint({
      code: part('/* stylelint-disable-next-line kei/padding-symmetry */\n padding: 0 8px 0 4px;'),
      configFile: 'stylelint.config.mjs',
    });
    expect(results[0].warnings.map((w) => w.rule)).toContain('--report-descriptionless-disables');
  });

  it('keeps heights on the 4px grid', async () => {
    expect(await cssRules(part('height: 18px;'))).toContain('kei/height-grid');
    expect(await cssRules(part('min-height: 41px;'))).toContain('kei/height-grid');
    for (const body of [
      'height: 20px;',
      'min-height: 40px;',
      'height: 1px;',
      'height: 2px;',
      'min-height: var(--k-control-height);',
      'max-height: calc(100dvh - 40px);',
      'height: 100%;',
    ])
      expect(await cssRules(part(body))).toEqual([]);
    expect(await cssRules('@layer kei.base { .k-x { height: 18px; } }')).toEqual([]);
  });

  it('lets known misses through until they are fixed, then asks to drop them', async () => {
    // @ts-expect-error The plugin module is plain JavaScript without types.
    const { layoutRules } = await import('../../scripts/stylelint-kei.mjs');
    const lintKeiCss = async (code: string) => {
      const { results } = await stylelint.lint({
        code,
        codeFilename: 'src/styles/kei.css',
        config: {
          plugins: layoutRules,
          rules: {
            'kei/height-grid': [true, { known: [{ selector: '.k-x', prop: 'height' }] }],
          },
        },
      });
      return results[0].warnings.map((w) => w.text);
    };
    expect(await lintKeiCss(part('height: 18px;'))).toEqual([]);
    expect(await lintKeiCss(part('height: 20px;'))).toEqual([
      expect.stringContaining('「.k-x { height }」はもう起きていません'),
    ]);
  });
});
