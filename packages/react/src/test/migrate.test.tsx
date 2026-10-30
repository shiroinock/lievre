// npx lievre-migrate (bin/lievre-migrate.mjs): an app written for the names before the rename.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lievreNames, migrate } from '../../bin/lievre-migrate.mjs';

const names = lievreNames(
  readFileSync('src/styles/lievre.css', 'utf8') + readFileSync('../tokens/tokens.css', 'utf8'),
);

describe('lievre-migrate', () => {
  it('rewrites imports, components, classes and variables', () => {
    const before = `import { KeiProvider, Button, useKeiTheme } from '@kei-design/react';
import '@kei-design/react/styles.css';
export const App = () => (
  <KeiProvider theme="paper">
    <span className="k-mono tag">{n}</span>
    <div style={{ gap: 'var(--k-space-2)' }} />
  </KeiProvider>
);`;
    expect(migrate(before, names))
      .toBe(`import { LievreProvider, Button, useLievreTheme } from '@lievre/react';
import '@lievre/react/styles.css';
export const App = () => (
  <LievreProvider theme="paper">
    <span className="lv-mono tag">{n}</span>
    <div style={{ gap: 'var(--lv-space-2)' }} />
  </LievreProvider>
);`);
  });

  it('rewrites the CSS: layers, root classes, fonts and variables', () => {
    const before = `@layer reset, kei.tokens, kei.base, kei.components, kei.utilities;
.kei .k-card, .kei-portal { padding: var(--k-panel-padding); font-family: 'KEI Mono'; }`;
    expect(migrate(before, names))
      .toBe(`@layer reset, lievre.tokens, lievre.base, lievre.components, lievre.utilities;
.lievre .lv-card, .lievre-portal { padding: var(--lv-panel-padding); font-family: 'Lievre Mono'; }`);
  });

  it('rewrites the lint settings for ESLint, Oxlint and Biome', () => {
    const before = `{ "jsPlugins": ["@kei-design/react/lint"], "rules": { "kei/metric-unit": "error" },
  "settings": { "kei": { "importSources": ["@/ui"] } },
  "plugins": ["./node_modules/@kei-design/react/lint/biome/metric-unit.grit"] }`;
    expect(migrate(before, names))
      .toBe(`{ "jsPlugins": ["@lievre/react/lint"], "rules": { "lievre/metric-unit": "error" },
  "settings": { "lievre": { "importSources": ["@/ui"] } },
  "plugins": ["./node_modules/@lievre/react/lint/biome/metric-unit.grit"] }`);
  });

  it("leaves the app's own variables that are called kei", () => {
    const config = `import kei from '@kei-design/react/lint';
export default [{ files: ['**/*.tsx'], ...kei.configs.recommended }];`;
    expect(migrate(config, names)).toBe(`import kei from '@lievre/react/lint';
export default [{ files: ['**/*.tsx'], ...kei.configs.recommended }];`);
  });

  it("leaves the app's own names that only look like lievre's", () => {
    const own = `<div className="k-hero desk-top" style={{ color: 'var(--k-brand)' }} />`;
    expect(migrate(own, names)).toBe(own);
  });

  it('changes nothing twice', () => {
    const once = migrate(`<KeiProvider><b className="k-mono" /></KeiProvider>`, names);
    expect(migrate(once, names)).toBe(once);
  });
});
