// The lint rules for apps that use KEI (lint/). Every case runs through ESLint, Oxlint and Biome,
// and the same code must give the same result in each.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import kei from '../../lint/index.js';

type Case =
  | string
  | { code: string; errors?: number; biome?: false; settings?: Record<string, unknown> };
type RuleName = keyof typeof kei.rules;

const imports = `import {
  Button, IconButton, Metric, DataTable, Pagination, Dialog, DialogClose, ConfirmDialog,
  DropdownMenu, Popover,
} from '@kei-design/react';
import { Download, MoreHorizontal, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
declare const all: { id: string }[];
declare const page: number;
declare const setOpen: (open: boolean) => void;
declare const save: () => void;
`;
// A JSX expression becomes `export const Case = () => (…)`; a file is used as written.
const file = (code: string) =>
  /^(import|export)/.test(code) ? code : `${imports}export const Case = () => (\n${code}\n);\n`;

// `biome: false` marks what GritQL cannot see (README「Biome で書けないこと」).
const cases: Record<RuleName, { valid: Case[]; invalid: Case[] }> = {
  'button-type-in-form': {
    valid: [
      `<form><Button type="submit">保存</Button><Button type="button" onClick={save}>下書き</Button></form>`,
      `<Button>外</Button>`,
      `<form><Dialog trigger={<Button>開く</Button>} title="t" description="d">本文</Dialog></form>`,
      `<form><Button {...{ type: 'submit' as const }}>保存</Button></form>`,
    ],
    invalid: [
      `<form onSubmit={save}><Button variant="primary">保存する</Button></form>`,
      `<form><div><IconButton label="追加" icon={<Download />} /></div></form>`,
      {
        code: `<form><Button onClick={save}>下書き</Button><Button>保存</Button></form>`,
        errors: 2,
      },
    ],
  },
  'table-sort-before-page': {
    valid: [
      `<DataTable caption="c" rows={all} columns={[]} getRowId={(r) => r.id} />`,
      `<DataTable caption="c" rows={all.slice(0, 10)} sorting={null} onSortingChange={() => {}} columns={[]} getRowId={(r) => r.id} />`,
    ],
    invalid: [
      `<DataTable caption="c" rows={all.slice((page - 1) * 10, page * 10)} columns={[]} getRowId={(r) => r.id} />`,
      {
        code: `${imports}export const Case = () => {
  const rows = all.slice(0, 10);
  return <DataTable caption="c" rows={rows} columns={[]} getRowId={(r) => r.id} />;
};`,
        biome: false,
      },
      {
        code: `${imports}export const Case = () => {
  const rows = useMemo(() => all.slice(page * 10, page * 10 + 10), []);
  return <DataTable caption="c" rows={rows} columns={[]} getRowId={(r) => r.id} />;
};`,
        biome: false,
      },
    ],
  },
  'metric-unit': {
    valid: [
      `<Metric label="稼働率" value="99.95" unit="%" />`,
      `<Metric label="件数" value="1,204" />`,
      `<Metric label="時刻" value="12:30" />`,
      `<Metric label="未計測" value="—" />`,
    ],
    invalid: [
      `<Metric label="稼働率" value="99.95%" />`,
      `<Metric label="売上" value={'1,200 円'} />`,
      `<Metric label="売上" value="¥1,200" />`,
    ],
  },
  'metric-change': {
    valid: [
      `<Metric label="稼働率" value="99.95" unit="%" trend="up" change="前週比 +0.02 ポイント上昇" />`,
      `<Metric label="稼働率" value="99.95" unit="%" />`,
      `<Metric label="稼働率" value="99.95" unit="%" trend="neutral" />`,
    ],
    invalid: [`<Metric label="稼働率" value="99.95" unit="%" trend="down" />`],
  },
  'dialog-close': {
    valid: [
      `<Dialog trigger={<Button>開く</Button>} title="t" description="d" footer={<DialogClose asChild><Button>キャンセル</Button></DialogClose>}>本文</Dialog>`,
      `<Dialog open trigger={<Button>開く</Button>} onOpenChange={setOpen} title="t" description="d" footer={<Button onClick={save}>保存</Button>}>本文</Dialog>`,
      `<Dialog trigger={<Button>開く</Button>} title="t" description="d" footer={<Button type="submit" form="f">保存</Button>}>本文</Dialog>`,
    ],
    invalid: [
      `<Dialog open trigger={<Button>開く</Button>} title="t" description="d">本文</Dialog>`,
      `<ConfirmDialog open title="t" description="d" confirmLabel="3件を削除" tone="danger" onConfirm={save} />`,
      `<Popover open trigger={<Button>絞り込み</Button>} title="絞り込み">本文</Popover>`,
      `<Dialog trigger={<Button>開く</Button>} title="t" description="d" footer={<><Button>キャンセル</Button><Button onClick={save}>保存</Button></>}>本文</Dialog>`,
    ],
  },
  'confirm-dialog-trigger': {
    valid: [
      `<ConfirmDialog trigger={<Button>削除</Button>} title="t" description="d" confirmLabel="3件を削除" tone="danger" onConfirm={save} />`,
      `<ConfirmDialog open onOpenChange={setOpen} title="t" description="d" confirmLabel="3件を削除" tone="danger" onConfirm={save} />`,
    ],
    invalid: [
      `<ConfirmDialog title="t" description="d" confirmLabel="3件を削除" tone="danger" onConfirm={save} />`,
    ],
  },
  'confirm-label': {
    valid: [
      `<ConfirmDialog trigger={<Button>送信</Button>} title="t" description="d" confirmLabel="申請を送信" onConfirm={save} />`,
    ],
    invalid: [
      `<ConfirmDialog trigger={<Button>削除</Button>} title="t" description="d" confirmLabel="OK" tone="danger" onConfirm={save} />`,
      `<ConfirmDialog trigger={<Button>削除</Button>} title="t" description="d" confirmLabel="はい" tone="danger" onConfirm={save} />`,
    ],
  },
  'danger-tone': {
    valid: [
      `<ConfirmDialog trigger={<Button>削除</Button>} title="t" description="d" confirmLabel="3件を削除" tone="danger" onConfirm={save} />`,
      `<DropdownMenu trigger={<Button>操作</Button>} items={[{ label: '複製', onSelect: save }, { label: '削除', tone: 'danger', onSelect: save }]} />`,
    ],
    invalid: [
      `<ConfirmDialog trigger={<Button>削除</Button>} title="t" description="d" confirmLabel="3件を削除" onConfirm={save} />`,
      `<DropdownMenu trigger={<Button>操作</Button>} items={[{ label: '複製', onSelect: save }, { label: '削除', onSelect: save }]} />`,
    ],
  },
  'icon-button-label': {
    valid: [`<IconButton label="行の操作" icon={<MoreHorizontal />} />`],
    invalid: [
      `<IconButton label="" icon={<MoreHorizontal />} />`,
      `<IconButton label="…" icon={<MoreHorizontal />} />`,
    ],
  },
  'icon-only-button': {
    valid: [
      `<Button icon={<Download />}>書き出す</Button>`,
      `<Button><Download />書き出す</Button>`,
      `<IconButton label="書き出す" icon={<Download />} />`,
    ],
    invalid: [
      `<Button><Trash2 /></Button>`,
      `<Button icon={<Trash2 />} />`,
      `<Button>
  <Trash2 />
</Button>`,
      { code: `<Button><Download /><Trash2 /></Button>`, biome: false },
    ],
  },
  'unit-outside-mono': {
    valid: [`<span><span className="k-mono">{12}</span>%</span>`],
    invalid: [
      `<span className="k-mono">{12}%</span>`,
      `<span className="tag k-mono">1,200円</span>`,
    ],
  },
};

// Settings and imports: only components imported from KEI are checked.
const extra: { name: string; rule: RuleName; case: Case; errors: number; biome?: false }[] = [
  {
    name: '別のライブラリの Button は見ない',
    rule: 'button-type-in-form',
    case: `import { Button } from 'other-ui';\nexport const Case = () => <form><Button>保存</Button></form>;\n`,
    errors: 0,
  },
  {
    name: '別名で読み込んでも見つける',
    rule: 'button-type-in-form',
    case: `import { Button as KButton } from '@kei-design/react';\nexport const Case = () => <form><KButton>保存</KButton></form>;\n`,
    errors: 1,
    biome: false,
  },
  {
    name: 'settings.kei.importSources で読み込み元を足せる',
    rule: 'button-type-in-form',
    case: {
      code: `import { Button } from '@/ui';\nexport const Case = () => <form><Button>保存</Button></form>;\n`,
      settings: { kei: { importSources: ['@/ui'] } },
    },
    errors: 1,
    biome: false,
  },
];

type Run = {
  name: string;
  rule: RuleName;
  code: string;
  errors: number;
  biome: boolean;
  settings?: Record<string, unknown>;
};
const runs: Run[] = [
  ...Object.entries(cases).flatMap(([rule, { valid, invalid }]) =>
    [...valid.map((c) => [c, 0] as const), ...invalid.map((c) => [c, 1] as const)].map(
      ([c, errors], i) => {
        const one = typeof c === 'string' ? { code: c } : c;
        return {
          name: `${rule} ${errors ? '止める' : '通す'} ${i}`,
          rule: rule as RuleName,
          code: file(one.code),
          errors: errors && (one.errors ?? 1),
          biome: one.biome !== false,
          settings: one.settings,
        };
      },
    ),
  ),
  ...extra.map((e) => {
    const one = typeof e.case === 'string' ? { code: e.case } : e.case;
    return { ...e, code: file(one.code), biome: e.biome !== false, settings: one.settings };
  }),
];

const root = resolve(import.meta.dirname, '../..');
const bin = (name: string) => join(root, 'node_modules/.bin', name);
const grit = readdirSync(join(root, 'lint/biome')).filter((f) => f.endsWith('.grit'));
const biomeRules = new Set(grit.map((f) => basename(f, '.grit')));
const ruleNames = Object.keys(kei.rules) as RuleName[];

// Every message a rule can give, with `{{name}}` filled in, to tell Biome's diagnostics apart.
const messageRule = new Map<string, RuleName>();
for (const rule of ruleNames)
  for (const message of Object.values(kei.rules[rule].meta.messages) as string[])
    for (const name of ['Dialog', 'ConfirmDialog', 'Popover'])
      messageRule.set(message.replaceAll('{{name}}', name), rule);

let dir: string;
const found: Record<'eslint' | 'oxlint' | 'biome', Map<string, RuleName[]>> = {
  eslint: new Map(),
  oxlint: new Map(),
  biome: new Map(),
};
const fileOf = (i: number) => join(dir, `case-${i}.tsx`);
let biomeErrors: string[] = [];

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'kei-lint-'));
  runs.forEach((r, i) => writeFileSync(fileOf(i), r.code));

  // ESLint: one run per settings, since settings are per config.
  for (const [i, r] of runs.entries()) {
    const eslint = new ESLint({
      cwd: dir,
      overrideConfigFile: true,
      overrideConfig: [
        {
          files: ['**/*.tsx'],
          languageOptions: { parser: tseslint.parser },
          ...kei.configs.recommended,
          settings: r.settings ?? {},
        },
      ],
    });
    const [result] = await eslint.lintFiles([fileOf(i)]);
    found.eslint.set(
      fileOf(i),
      result.messages.map((m) => m.ruleId!.replace('kei/', '') as RuleName),
    );
  }

  // Oxlint: one config for the cases without settings, one per case with them.
  const oxlint = (files: string[], settings?: Record<string, unknown>) => {
    const config = join(dir, `oxlint-${Math.random().toString(36).slice(2)}.json`);
    writeFileSync(
      config,
      JSON.stringify({
        jsPlugins: [join(root, 'lint/index.js')],
        categories: { correctness: 'off' },
        settings,
        rules: kei.configs.recommended.rules,
      }),
    );
    const out = spawnSync(bin('oxlint'), ['-c', config, '-f', 'json', ...files], {
      encoding: 'utf8',
    });
    const { diagnostics } = JSON.parse(out.stdout) as {
      diagnostics: { code: string; filename: string }[];
    };
    for (const f of files) found.oxlint.set(f, []);
    for (const d of diagnostics)
      found.oxlint
        .get(resolve(dir, d.filename))!
        .push(d.code.replace(/^kei\((.*)\)$/, '$1') as RuleName);
  };
  oxlint(runs.flatMap((r, i) => (r.settings ? [] : [fileOf(i)])));
  for (const [i, r] of runs.entries()) if (r.settings) oxlint([fileOf(i)], r.settings);

  // Biome: every .grit file at once.
  writeFileSync(
    join(dir, 'biome.json'),
    JSON.stringify({
      plugins: grit.map((f) => join(root, 'lint/biome', f)),
      linter: { rules: { preset: 'none' } },
      formatter: { enabled: false },
      assist: { enabled: false },
    }),
  );
  const out = spawnSync(
    bin('biome'),
    ['lint', '--reporter=json', '--max-diagnostics=none', `--config-path=${dir}`, dir],
    { encoding: 'utf8' },
  );
  const { diagnostics } = JSON.parse(out.stdout) as {
    diagnostics: {
      category: string;
      message: string;
      severity: string;
      location: { path: string };
    }[];
  };
  for (const [i] of runs.entries()) found.biome.set(fileOf(i), []);
  for (const d of diagnostics) {
    if (d.category !== 'plugin') continue;
    // A pattern that fails at run time only leaves an info, so it would pass silently.
    if (d.severity !== 'error') biomeErrors.push(d.message);
    else found.biome.get(resolve(dir, d.location.path))!.push(messageRule.get(d.message)!);
  }
}, 60_000);

afterAll(() => rmSync(dir, { recursive: true, force: true }));

const count = (rules: RuleName[] | undefined, rule: RuleName) =>
  (rules ?? []).filter((r) => r === rule).length;

describe('lint rules for apps that use KEI', () => {
  it.each(runs.map((r, i) => [r.name, i] as const))('%s', (_, i) => {
    const r = runs[i];
    const f = fileOf(i);
    expect(count(found.eslint.get(f), r.rule), 'ESLint').toBe(r.errors);
    expect(found.oxlint.get(f), 'Oxlint は ESLint と同じ').toEqual(found.eslint.get(f));
    if (biomeRules.has(r.rule) && r.biome)
      expect(count(found.biome.get(f), r.rule), 'Biome').toBe(r.errors);
  });

  it('Biome のパターンは実行時に失敗しない', () => {
    expect(biomeErrors).toEqual([]);
  });

  it('every rule has cases, and Biome messages match the ESLint messages', () => {
    for (const rule of ruleNames) expect(cases[rule].invalid.length, rule).toBeGreaterThan(0);
    for (const f of grit) {
      expect(ruleNames, f).toContain(basename(f, '.grit'));
      // GritQL reads `\"` in a string wrongly, so messages quote with '.
      for (const [, message] of readFileSync(join(root, 'lint/biome', f), 'utf8').matchAll(
        /message = "([^"]*)"/g,
      ))
        expect(messageRule.get(message), `${f}: ${message}`).toBe(basename(f, '.grit'));
    }
  });

  it('every message says how to fix it with an example or a prop', () => {
    for (const rule of ruleNames)
      for (const message of Object.values(kei.rules[rule].meta.messages) as string[])
        expect(message, rule).toMatch(/ください/);
  });

  it('is shipped as @kei-design/react/lint, with the package version', () => {
    const out = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "import('@kei-design/react/lint').then((m) => console.log(m.default.meta.version))",
      ],
      { cwd: root, encoding: 'utf8' },
    );
    const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    expect(out.stdout.trim()).toBe(version);
  });

  it('fixes a unit written in the Metric value', async () => {
    const eslint = new ESLint({
      cwd: dir,
      fix: true,
      overrideConfigFile: true,
      overrideConfig: [
        {
          files: ['**/*.tsx'],
          languageOptions: { parser: tseslint.parser },
          ...kei.configs.recommended,
        },
      ],
    });
    const [result] = await eslint.lintText(file(`<Metric label="稼働率" value="99.95%" />`), {
      filePath: join(dir, 'fix.tsx'),
    });
    expect(result.output).toContain(`<Metric label="稼働率" value="99.95" unit="%" />`);
  });
});
