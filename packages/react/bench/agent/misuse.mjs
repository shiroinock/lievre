// Which layer catches each likely mistake, and whether its message says how to fix it.
// Cases are compiled as a consumer app would see lievre: through the built package (lib/).
//   pnpm run build:lib && node bench/agent/misuse.mjs [--root <checkout>] [--json out.json]
// --root measures another checkout (for example main, after `pnpm run build:lib` there).
import { mkdirSync, rmSync, symlinkSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import ts from 'typescript';
import { ESLint } from 'eslint';
import { JSDOM } from 'jsdom';
import { cases } from './misuse-cases.mjs';

const rootArg = process.argv.indexOf('--root');
const root = resolve(
  rootArg > 0 ? process.argv[rootArg + 1] : join(dirname(fileURLToPath(import.meta.url)), '../..'),
);
if (!existsSync(join(root, 'lib/index.d.ts'))) {
  console.error('lib/ がありません。先に pnpm run build:lib を実行してください。');
  process.exit(1);
}

// The installed tools: the checkout's own node_modules, or the repository root's in the workspaces.
const modules = [join(root, 'node_modules'), join(root, '../../node_modules')].find((dir) =>
  existsSync(join(dir, 'react')),
);

// A throwaway consumer app whose only view of lievre is the published entry points.
const app = join(tmpdir(), `lievre-agent-bench-${process.pid}`);
rmSync(app, { recursive: true, force: true });
mkdirSync(join(app, 'node_modules/@lievre-design'), { recursive: true });
mkdirSync(join(app, 'node_modules/@types'), { recursive: true });
symlinkSync(root, join(app, 'node_modules/@lievre/react'));
for (const dep of ['react', 'react-dom']) {
  symlinkSync(join(modules, dep), join(app, 'node_modules', dep));
  symlinkSync(join(modules, '@types', dep), join(app, 'node_modules/@types', dep));
}

const options = {
  target: ts.ScriptTarget.ES2022,
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  strict: true,
  skipLibCheck: true,
  noEmit: true,
  types: [],
};
const files = cases.map((c) => {
  const file = join(app, `${c.id}.tsx`);
  writeFileSync(file, c.code);
  return file;
});
const program = ts.createProgram(files, options);
const typeMessages = (file) =>
  ts
    .getPreEmitDiagnostics(program, program.getSourceFile(file))
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));

// The lint rules shipped to apps (`@lievre/react/lint`), configured as an app would. A
// checkout from before they were shipped only has the rules for code inside the repository.
const shippedLint = existsSync(join(root, 'lint/index.js'));
const eslint = shippedLint
  ? new ESLint({
      cwd: app,
      overrideConfigFile: true,
      overrideConfig: [
        {
          files: ['**/*.tsx'],
          languageOptions: {
            parser: (
              await import(pathToFileURL(join(modules, 'typescript-eslint/dist/index.js')).href)
            ).default.parser,
          },
          ...(await import(pathToFileURL(join(root, 'lint/index.js')).href)).default.configs
            .recommended,
        },
      ],
    })
  : new ESLint({ cwd: root });
const lintMessages = async (c) => {
  const [result] = await eslint.lintText(c.code, {
    filePath: shippedLint ? join(app, `${c.id}.tsx`) : join(root, `src/__bench__/${c.id}.tsx`),
  });
  return result.messages.map((m) => m.message);
};

// Render in jsdom and collect what React, Radix and lievre print or throw.
const dom = new JSDOM('<!doctype html><body></body>', {
  pretendToBeVisual: true,
  url: 'http://localhost/',
});
for (const key of Object.getOwnPropertyNames(dom.window))
  if (!(key in globalThis) && key !== 'localStorage' && key !== 'sessionStorage')
    Object.defineProperty(globalThis, key, {
      value: dom.window[key],
      configurable: true,
      writable: true,
    });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const lievreUrl = pathToFileURL(join(root, 'lib/lievre.js')).href;
const lievre = await import(lievreUrl);

async function runtimeMessages(c) {
  const js = ts.transpileModule(c.code, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const file = join(app, `${c.id}.mjs`);
  writeFileSync(file, js.replaceAll("'@lievre/react'", JSON.stringify(lievreUrl)));
  const messages = [];
  const original = { error: console.error, warn: console.warn };
  console.error = console.warn = (...args) => messages.push(args.map(String).join(' ').trim());
  const container = document.createElement('div');
  document.body.append(container);
  const reactRoot = createRoot(container, {
    onUncaughtError: (e) => messages.push(String(e?.message ?? e)),
    onCaughtError: (e) => messages.push(String(e?.message ?? e)),
  });
  try {
    const { Case } = await import(pathToFileURL(file).href);
    const tree = React.createElement(Case);
    await React.act(async () =>
      reactRoot.render(
        c.bare
          ? tree
          : React.createElement(
              lievre.LievreProvider,
              null,
              React.createElement(lievre.ToastProvider, null, tree),
            ),
      ),
    );
  } catch (e) {
    messages.push(String(e?.message ?? e));
  } finally {
    await React.act(async () => reactRoot.unmount());
    container.remove();
    Object.assign(console, original);
  }
  return messages.filter(Boolean);
}

const results = [];
for (const [i, c] of cases.entries()) {
  const layers = {
    type: typeMessages(files[i]),
    lint: await lintMessages(c),
    runtime: await runtimeMessages(c),
  };
  const caught = ['type', 'lint', 'runtime'].find((layer) => layers[layer].length);
  const message = caught ? layers[caught][0] : '';
  const actionable = !!caught && c.fix.some((word) => message.includes(word));
  // Editor-time detection (type, lint) lets an agent fix it in the same edit loop.
  const score =
    (caught === 'type' ? 2 : caught === 'lint' ? 2 : caught === 'runtime' ? 1 : 0) +
    (actionable ? 1 : 0);
  results.push({
    id: c.id,
    task: c.task,
    mistake: c.mistake,
    caught: caught ?? null,
    shipped: caught !== 'lint' || shippedLint,
    actionable,
    score,
    message,
  });
}
rmSync(app, { recursive: true, force: true });

const layerName = {
  type: '型',
  lint: shippedLint ? 'lint' : 'lint（リポジトリ内のみ）',
  runtime: '実行時',
  null: '検出なし',
};
console.log('| 課題 | 誤り | 検出 | 直し方が分かる | 点 | 最初のメッセージ |');
console.log('| --- | --- | --- | --- | --: | --- |');
for (const r of results) {
  const msg = r.message.split('\n')[0].replaceAll('|', '\\|').slice(0, 110);
  console.log(
    `| ${r.task} | ${r.mistake} | ${layerName[r.caught]} | ${r.actionable ? 'はい' : 'いいえ'} | ${r.score} | ${msg} |`,
  );
}
const total = results.reduce((s, r) => s + r.score, 0);
console.log(
  `\n合計 ${total} / ${results.length * 3}（検出 ${results.filter((r) => r.caught).length} / ${results.length}、直し方まで ${results.filter((r) => r.actionable).length}）`,
);

const out = process.argv.indexOf('--json');
if (out > 0)
  writeFileSync(
    process.argv[out + 1],
    JSON.stringify({ date: new Date().toISOString(), total, results }, null, 2) + '\n',
  );
// Radix and React keep timers alive; the measurement is done.
process.exit(0);
