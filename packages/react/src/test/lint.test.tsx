// Each lievre lint rule must still catch the mistake it was written for.
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
  font-family: 'Lievre Mono';
  font-weight: ${weight};
  unicode-range: ${range};
}`;
const allFaces = [400, 500, 600].map((w) => face(w)).join('\n');

describe('stylelint: lievre rules', () => {
  it('rejects sizes in the utilities layer', async () => {
    expect(await cssRules('@layer lievre.utilities { .lv-mono { font-size: 1em; } }')).toContain(
      'lievre/utilities-no-size',
    );
    expect(await cssRules('@layer lievre.base { .lv-mono { font-size: 1em; } }')).toEqual([]);
  });

  it('rejects full-width punctuation in the Lievre Mono range', async () => {
    const css = allFaces + face(400, 'U+2000-206F');
    expect(await cssRules(css)).toContain('lievre/mono-unicode-range');
    expect(await cssRules(allFaces + face(400, 'U+2010-2011'))).toEqual([]);
  });

  it('requires a Lievre Mono face for every weight token', async () => {
    expect(await cssRules(face(400) + face(500))).toContain('lievre/mono-weights');
    expect(await cssRules(allFaces)).toEqual([]);
  });

  it('requires forced-colors styles for states shown by a background', async () => {
    const forced = (body: string) => `@media (forced-colors: active) { ${body} }`;
    const state =
      ".lv-x[data-state='on'], .lv-y[data-highlighted] .lv-z { background: var(--lv-selected); }";
    expect(await cssRules(state)).toContain('lievre/forced-colors-state');
    // Each selector in the list needs its own forced-colors style.
    expect(
      await cssRules(state + forced(".lv-x[data-state='on'] { background: Highlight; }")),
    ).toContain('lievre/forced-colors-state');
    // Opting out of forced colours without a system colour does not count.
    expect(
      await cssRules(
        state +
          forced(
            ".lv-x[data-state='on'], .lv-y[data-highlighted] .lv-z { forced-color-adjust: none; }",
          ),
      ),
    ).toContain('lievre/forced-colors-state');
    expect(
      await cssRules(
        state +
          forced(
            ".lv-x[data-state='on'], .lv-y[data-highlighted] .lv-z { outline: 2px solid Highlight; }",
          ),
      ),
    ).toEqual([]);
    expect(await cssRules('.lv-x::after { background: var(--lv-selected); }')).toEqual([]);
  });

  it('keeps spacing on the 4px grid', async () => {
    expect(await cssRules('.a { padding: 6px 12px; }')).toContain('lievre/spacing-grid');
    expect(await cssRules('.a { gap: 10px; }')).toContain('lievre/spacing-grid');
    expect(await cssRules('.lievre { --lv-cell-padding: 10px 12px; }')).toContain(
      'lievre/spacing-grid',
    );
    expect(
      await cssRules(
        '.a { padding: 0 16px; margin: -1px; gap: var(--lv-space-2); margin-top: calc((1lh - 20px) / 2); width: 6px; }',
      ),
    ).toEqual([]);
    // An exception has to say why.
    expect(
      await cssRules('/* stylelint-disable-next-line lievre/spacing-grid */\n.a { padding: 2px; }'),
    ).toContain('--report-descriptionless-disables');
    expect(
      await cssRules(
        '/* stylelint-disable-next-line lievre/spacing-grid -- 18px thumb */\n.a { padding: 2px; }',
      ),
    ).toEqual([]);
  });

  it('rejects a decorative band down one side of a box', async () => {
    const stripe = 'lievre/side-stripe';
    expect(await cssRules('.card { border-left: 4px solid var(--lv-accent); }')).toContain(stripe);
    expect(await cssRules('.card { border-inline-start-width: 3px; }')).toContain(stripe);
    expect(await cssRules('.card { border-left: 0.25rem solid var(--lv-accent); }')).toContain(
      stripe,
    );
    expect(await cssRules('.card { box-shadow: inset 4px 0 0 var(--lv-accent); }')).toContain(
      stripe,
    );
    expect(
      await cssRules(
        '.card { background: var(--lv-surface) linear-gradient(var(--lv-accent), var(--lv-accent)) left / 4px 100% no-repeat; }',
      ),
    ).toContain(stripe);
    expect(
      await cssRules(
        '.card { background-image: linear-gradient(var(--lv-accent), var(--lv-accent)); background-size: 4px 100%; }',
      ),
    ).toContain(stripe);
    // Hairline dividers, whole borders, a state's edge and a meter drawn from several layers pass.
    expect(
      await cssRules(
        [
          '.a { border-top: 1px solid var(--lv-border); border: 2px solid var(--lv-border); }',
          '.a { background: linear-gradient(var(--lv-border), var(--lv-border)) bottom / 100% 1px no-repeat; }',
          '.t tr[data-selected] > :first-child { background-image: linear-gradient(var(--lv-accent), var(--lv-accent)); background-size: 4px 100%; }',
          '.tab[aria-selected="true"] { border-bottom: 2px solid var(--lv-accent); }',
          '.m { background: linear-gradient(var(--a), var(--a)) 0 100% / 3px 40% no-repeat, linear-gradient(var(--a), var(--a)) 100% 100% / 3px 100% no-repeat; }',
          '.f { background: linear-gradient(var(--a), var(--b)); }',
          '.r { box-shadow: inset 0 0 0 1px var(--lv-border); }',
        ].join('\n'),
      ),
    ).toEqual([]);
  });

  it('keeps surface tokens in the theme layer', async () => {
    expect(await cssRules('.panel { --lv-surface: #2424d8; }')).toContain('lievre/surface-tokens');
    expect(await cssRules('@layer lievre.components { .x { --lv-bg: red; } }')).toContain(
      'lievre/surface-tokens',
    );
    expect(
      await cssRules(
        "@layer lievre.tokens { .lievre[data-theme='ink'] { --lv-surface-sunken: #070920; } }",
      ),
    ).toEqual([]);
    expect(await cssRules('.panel { background: var(--lv-surface); }')).toEqual([]);
    // The app frame is a theme surface too: a page cannot paint its own sidebar colour.
    expect(await cssRules('.sidebar { --lv-frame: #2424d8; }')).toContain('lievre/surface-tokens');
    expect(await cssRules('.sidebar { --lv-on-frame-selected: #fff; }')).toContain(
      'lievre/surface-tokens',
    );
    expect(await cssRules('.sidebar { background: var(--lv-frame); }')).toEqual([]);
  });

  it('rejects colours that do not come through a token', async () => {
    for (const code of [
      '.a { color: #2424d8; }',
      '@layer lievre.components { .a { background: rgb(36 36 216); } }',
      '.a { border: 1px solid white; }',
      '.a { --demo-blue: oklch(0.5 0.2 270); }',
      '.a { box-shadow: 0 0 0 1px color(srgb 0 0 1); }',
    ])
      expect(await cssRules(code), code).toContain('lievre/colour-tokens');
    expect(
      await cssRules(
        "@layer lievre.tokens { .lievre[data-theme='ink'] { --lv-accent: #a9b1ff; --lv-x: var(--lv-accent); } }",
      ),
    ).toEqual([]);
    expect(
      await cssRules(
        '.a { color: var(--lv-text); white-space: nowrap; background: color-mix(in srgb, var(--lv-bg) 60%, transparent); mask: radial-gradient(#000, transparent); }',
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

  it('rejects shadows on text', async () => {
    expect(await cssRules('.a { text-shadow: 0.05em 0.035em 0 var(--lv-accent); }')).toContain(
      'property-disallowed-list',
    );
  });

  it('requires a line-height in the font shorthand', async () => {
    expect(await cssRules('.a { font: 14px sans-serif; }')).toContain(
      'declaration-property-value-allowed-list',
    );
    expect(await cssRules('.a { font: 14px / 1.4 sans-serif; } .b { font: inherit; }')).toEqual([]);
  });
});

describe('eslint: lievre rules', () => {
  it('rejects a unit inside .lv-mono', async () => {
    expect(await tsxMessages('export const A = <span className="lv-mono">{1}%</span>;')).toContain(
      'lievre/unit-outside-mono',
    );
    expect(
      await tsxMessages('export const A = <span><span className="lv-mono">{1}</span>%</span>;'),
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

  // Linting every source takes a few seconds while the other test files run.
  it('eslint', async () => {
    const results = await new ESLint().lintFiles(['src']);
    expect(results.flatMap((r) => r.messages.map((m) => `${r.filePath}: ${m.message}`))).toEqual(
      [],
    );
  }, 30_000);
});

// Layout gate (docs/quality-gate.md): the static rules.
describe('stylelint: lievre layout rules', () => {
  const part = (body: string) => `@layer lievre.components { .lv-x { ${body} } }`;

  it('requires a reason for left and right padding that differ', async () => {
    for (const body of [
      'padding: 0 8px 0 4px;',
      'padding-left: 4px;',
      'padding-inline: 4px 8px;',
      'padding: 8px; padding-right: 12px;',
    ])
      expect(await cssRules(part(body))).toContain('lievre/padding-symmetry');
    for (const body of [
      'padding: 4px 8px;',
      'padding: 8px 12px 4px;',
      'padding: var(--lv-space-2) 0 0;',
      'padding-left: 8px; padding-right: 8px;',
    ])
      expect(await cssRules(part(body))).toEqual([]);
    // Outside lievre's parts (demo pages, app styles) the rule does not apply.
    expect(await cssRules('.demo ul { padding-left: 1.5em; }')).toEqual([]);
    expect(
      await cssRules(
        part(
          '/* stylelint-disable-next-line lievre/padding-symmetry -- 左の検索アイコンの分 */\n padding: 0 12px 0 36px;',
        ),
      ),
    ).toEqual([]);
  });

  it('requires a reason on every disable comment', async () => {
    const { results } = await stylelint.lint({
      code: part(
        '/* stylelint-disable-next-line lievre/padding-symmetry */\n padding: 0 8px 0 4px;',
      ),
      configFile: 'stylelint.config.mjs',
    });
    expect(results[0].warnings.map((w) => w.rule)).toContain('--report-descriptionless-disables');
  });

  it('keeps heights on the 4px grid', async () => {
    expect(await cssRules(part('height: 18px;'))).toContain('lievre/height-grid');
    expect(await cssRules(part('min-height: 41px;'))).toContain('lievre/height-grid');
    for (const body of [
      'height: 20px;',
      'min-height: 40px;',
      'height: 1px;',
      'height: 2px;',
      'min-height: var(--lv-control-height);',
      'max-height: calc(100dvh - 40px);',
      'height: 100%;',
    ])
      expect(await cssRules(part(body))).toEqual([]);
    expect(await cssRules('@layer lievre.base { .lv-x { height: 18px; } }')).toEqual([]);
  });

  it('lets known misses through until they are fixed, then asks to drop them', async () => {
    // @ts-expect-error The plugin module is plain JavaScript without types.
    const { layoutRules } = await import('../../scripts/stylelint-lievre.mjs');
    const lintLievreCss = async (code: string) => {
      const { results } = await stylelint.lint({
        code,
        codeFilename: 'src/styles/lievre.css',
        config: {
          plugins: layoutRules,
          rules: {
            'lievre/height-grid': [true, { known: [{ selector: '.lv-x', prop: 'height' }] }],
          },
        },
      });
      return results[0].warnings.map((w) => w.text);
    };
    expect(await lintLievreCss(part('height: 18px;'))).toEqual([]);
    expect(await lintLievreCss(part('height: 20px;'))).toEqual([
      expect.stringContaining('「.lv-x { height }」はもう起きていません'),
    ]);
  });
});
