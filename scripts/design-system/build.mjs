#!/usr/bin/env node
// Writes every file of lievre's Design System artifact (the Claude Design System type) from the
// code, under <out>/project/. Nothing here talks to the artifact: an agent publishes the files
// (AGENTS.md の「見本集（Design System）を更新する」).
//
//   npm run design-system                      (.design-system/ at the repository root)
//   npm run design-system -- --out <dir>       (another folder)
//   npm run design-system -- --skip-build      (reuse packages/react/lib from the last build:lib)
//   npm run design-system -- --against <files.json>
//                                              (also list what changed since that files.json,
//                                               the copy read back from the artifact)
//
// The same commit always gives the same bytes, so a file whose hash did not change need not be
// published again. <out>/project/sync/files.json lists every file with its sha256.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  NO_CARD,
  REACT,
  ROOT,
  DEFAULT_STORIES,
  cards,
  inventoryProblems,
  readExports,
  ts,
} from './inventory.mjs';
import { USAGE } from './token-usage.mjs';

const HERE = import.meta.dirname;
const NAMESPACE = 'Lievre';
const REPO = 'shiroinock/lievre';
/** The artifact's index was first written at this time. Keep it: the page reads it as a marker. */
const CREATED_ON_FILES = { v: 1, at: '2026-11-22T15:53:00Z' };
/** React for the previews, loaded by the page from jsDelivr. lievre supports 18.3 and 19. */
const LIBRARIES = [
  { name: 'react', version: '18.3.1' },
  { name: 'react-dom', version: '18.3.1' },
];
/** The faces of Lievre Mono: IBM Plex Mono's Latin files, shipped as the system's fonts. */
const MONO_WEIGHTS = ['400', '500', '600'];

const { values: opts } = parseArgs({
  options: {
    out: { type: 'string', default: join(ROOT, '.design-system') },
    'skip-build': { type: 'boolean', default: false },
    against: { type: 'string' },
  },
});
const OUT = resolve(opts.out);
const P = join(OUT, 'project');

const requireReact = createRequire(`${REACT}/package.json`);
const esbuild = createRequire(requireReact.resolve('vite'))('esbuild');

// ------------------------------------------------------------------ helpers

const files = new Map();
function put(path, content) {
  files.set(path, typeof content === 'string' ? Buffer.from(content) : content);
}
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const json = (value) => JSON.stringify(value, null, 2) + '\n';

/** Text that is inlined into a page must not end its <script> or <style>. */
function inlineSafe(path, text) {
  if (/<\/script|<!--|<\/style/i.test(text))
    throw new Error(
      `${path} に </script・<!--・</style が入っています。ページに埋め込むと壊れます。`,
    );
  return text;
}

// --------------------------------------------------------------- the source

const problems = inventoryProblems();
if (problems.length) {
  console.error(problems.map((p) => `- ${p}`).join('\n'));
  process.exit(1);
}

const sha = git('rev-parse', '--short=7', 'HEAD');
const date = git('log', '-1', '--format=%cI', 'HEAD');
const ref = `${git('rev-parse', '--abbrev-ref', 'HEAD')}@${sha}`;
const dirty = git('status', '--porcelain', '--', 'packages', 'logo', 'scripts/design-system');
if (dirty) console.warn(`手元に未コミットの変更があります。内容は ${ref} と違うかもしれません。`);

if (!opts['skip-build'] || !existsSync(`${REACT}/lib/lievre.js`)) {
  execFileSync('npm', ['run', 'build:lib', '-w', 'packages/react'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

const CARDS = cards();

// ------------------------------------------------------------------- tokens

const tokenSource = JSON.parse(readFileSync(`${ROOT}/packages/tokens/tokens.json`, 'utf8'));
const lv = (name) => `lv-${name}`;
const value = (v) => (typeof v === 'string' ? v : String(v));
const usage = (name) => {
  if (!USAGE[name])
    throw new Error(
      `--lv-${name} の使いどころがありません。scripts/design-system/token-usage.mjs に1行足してください。`,
    );
  return USAGE[name];
};
/** var(--lv-x) → x */
const aliasOf = (v) => /^var\(--lv-([a-z0-9-]+)\)$/.exec(v)?.[1];

function buildTokens() {
  const paper = tokenSource.paper;
  const ink = tokenSource.ink;
  const compact = tokenSource.compact;
  const iface = tokenSource.interface;
  const literal = (name) => {
    const v = value(paper[name].$value);
    const a = aliasOf(v);
    return a ? literal(a) : v;
  };
  const note = (name) => {
    const extra = [];
    if (compact[name]) extra.push(`compact は ${value(compact[name].$value)}`);
    if (iface[name]) {
      const v = value(iface[name].$value);
      extra.push(`interface は ${aliasOf(v) ? `--lv-${aliasOf(v)}` : v}`);
    }
    return (
      usage(name) +
      (extra.length && !usage(name).includes('compact') && !usage(name).includes('interface')
        ? `（${extra.join('、')}）`
        : '')
    );
  };

  const color = [];
  const families = {
    spacing: [],
    radius: [],
    density: [],
    fontSize: [],
    fontWeight: [],
    lineHeight: [],
    letterSpacing: [],
  };
  const skipped = [];
  for (const [name, t] of Object.entries(paper)) {
    if (t.$type === 'color') {
      const entry = (v) => (aliasOf(v) ? `{${lv(aliasOf(v))}}` : v);
      const light = entry(value(t.$value));
      const dark = ink[name] ? entry(value(ink[name].$value)) : light;
      color.push({ name: lv(name), value: { paper: light, ink: dark }, usage: note(name) });
      continue;
    }
    if (name.startsWith('font-')) continue; // type.families
    const family = name.startsWith('space-')
      ? 'spacing'
      : name.startsWith('radius-')
        ? 'radius'
        : /^(control|input|panel|stack|cell)-/.test(name)
          ? 'density'
          : /^text-/.test(name) || name === 'body'
            ? 'fontSize'
            : name.startsWith('weight-')
              ? 'fontWeight'
              : /^(leading|line)-/.test(name)
                ? 'lineHeight'
                : name.startsWith('tracking-')
                  ? 'letterSpacing'
                  : null;
    if (!family) {
      skipped.push(`--lv-${name}`);
      usage(name);
      continue;
    }
    families[family].push({ name: lv(name), value: literal(name), usage: note(name) });
  }

  const px = (rem) => (rem.endsWith('rem') ? `${parseFloat(rem) * 16}px` : rem);
  const size = (n) => px(literal(n));
  const tight = Number(literal('leading-tight'));
  const body = Number(literal('leading-body'));
  const weight = (n) => Number(literal(`weight-${n}`));
  const tokens = {
    name: 'lievre',
    version: 1,
    meta: {
      source: 'github',
      repo: REPO,
      ref,
      package: 'packages/tokens',
      paths: {
        tokens: ['packages/tokens/tokens.css', 'packages/tokens/tokens.json'],
        fonts: ['packages/react/src/styles/fonts.css'],
        assets: ['logo/'],
        docs: ['DESIGN.md', 'packages/react/llms.txt'],
      },
      components: Object.fromEntries(
        CARDS.map((c) => [c.name, `packages/react/src/stories/${c.name}.stories.tsx`]),
      ),
      synced: date,
    },
    color: {
      themes: [
        { id: 'paper', name: 'Paper' },
        { id: 'ink', name: 'Ink' },
      ],
      tokens: color,
    },
    type: {
      fonts: MONO_WEIGHTS.map((w) => ({
        family: 'IBM Plex Mono',
        file: `fonts/ibm-plex-mono-latin-${w}-normal.woff2`,
        weight: w,
        style: 'normal',
      })),
      families: {
        sans: literal('font-sans').replace(/\s+/g, ' '),
        mono: literal('font-mono').replace(/\s+/g, ' '),
      },
      groups: [
        {
          name: '見出し',
          family: 'sans',
          styles: ['3xl', '2xl', 'xl', 'lg'].map((s) => ({
            name: `text-${s}`,
            fontSize: size(`text-${s}`),
            lineHeight: tight,
            fontWeight: weight('bold'),
            letterSpacing: literal('tracking-heading'),
            sample: '日本語の画面を読みやすく',
            usage: usage(`text-${s}`),
          })),
        },
        {
          name: '本文',
          family: 'sans',
          styles: ['base', 'md', 'sm', 'xs'].map((s) => ({
            name: `text-${s}`,
            fontSize: size(`text-${s}`),
            lineHeight: body,
            fontWeight: weight('regular'),
            sample: '面と線で階層をつくり、数値は等幅で比べる。',
            usage: usage(`text-${s}`),
          })),
        },
        {
          name: '等幅',
          family: 'mono',
          styles: [
            {
              name: 'text-mono-min',
              fontSize: size('text-mono-min'),
              lineHeight: body,
              fontWeight: weight('regular'),
              sample: '2026-11-23 14:05 残り 12 件',
              usage: usage('text-mono-min'),
            },
          ],
        },
      ],
    },
    spacing: { tokens: families.spacing },
    radius: { tokens: families.radius },
    density: {
      note: 'comfortable の値。density="compact" の値は各行の説明に。',
      tokens: families.density,
    },
    fontSize: { tokens: families.fontSize },
    fontWeight: { tokens: families.fontWeight },
    lineHeight: { tokens: families.lineHeight },
    letterSpacing: { tokens: families.letterSpacing },
  };
  return { tokens, skipped };
}

/** tokens.css laid out as the page compiles it, so the page and the cover read the same values. */
function buildTokensCss(tokens) {
  const v = (x) => {
    const m = /^\{(.+)\}$/.exec(x);
    return m ? `var(--${m[1]})` : x;
  };
  const lines = ['/* lievre — generated from tokens.json */'];
  lines.push(':root, [data-theme="paper"] {');
  for (const t of tokens.color.tokens) lines.push(`  --${t.name}: ${v(t.value.paper)};`);
  lines.push('}', '[data-theme="ink"] {');
  for (const t of tokens.color.tokens) lines.push(`  --${t.name}: ${v(t.value.ink)};`);
  lines.push('}', ':root {');
  for (const key of [
    'spacing',
    'radius',
    'density',
    'fontSize',
    'fontWeight',
    'lineHeight',
    'letterSpacing',
  ])
    for (const t of tokens[key].tokens) lines.push(`  --${t.name}: ${t.value};`);
  for (const [key, stack] of Object.entries(tokens.type.families))
    lines.push(`  --font-${key}: ${stack};`);
  lines.push('}');
  for (const g of tokens.type.groups)
    for (const s of g.styles)
      lines.push(
        `.${s.name} { font-family: var(--font-${g.family}); font-size: ${s.fontSize}; line-height: ${s.lineHeight}; font-weight: ${s.fontWeight};${s.letterSpacing ? ` letter-spacing: ${s.letterSpacing};` : ''} }`,
      );
  for (const f of tokens.type.fonts)
    lines.push(
      `@font-face { font-family: '${f.family}'; src: url('${f.file}') format('woff2'); font-weight: ${f.weight}; font-style: ${f.style}; font-display: swap; }`,
    );
  return lines.join('\n') + '\n';
}

// ------------------------------------------------------------- the bundle

const reactGlobals = {
  name: 'react-globals',
  setup(build) {
    const shim = {
      react: 'module.exports = window.React;',
      'react-dom': 'module.exports = window.ReactDOM;',
      'react-dom/client': 'module.exports = window.ReactDOM;',
      // The automatic JSX runtime, over createElement (React 18 and 19 both have it).
      'react/jsx-runtime': `var R = window.React;
function jsx(type, props, key) { return R.createElement(type, key === undefined ? props : Object.assign({}, props, { key: key })); }
module.exports = { jsx: jsx, jsxs: jsx, jsxDEV: jsx, Fragment: R.Fragment };`,
    };
    build.onResolve({ filter: /^react(-dom)?(\/client|\/jsx-runtime)?$/ }, (a) => ({
      path: a.path,
      namespace: 'react-globals',
    }));
    build.onLoad({ filter: /.*/, namespace: 'react-globals' }, (a) => ({
      contents: shim[a.path],
      loader: 'js',
    }));
  },
};

async function buildBundle() {
  const result = await esbuild.build({
    stdin: {
      contents: `import * as L from './lib/lievre.js'; window.${NAMESPACE} = Object.assign({}, L);`,
      resolveDir: REACT,
      loader: 'js',
    },
    bundle: true,
    format: 'iife',
    minify: true,
    legalComments: 'none',
    target: 'es2020',
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [reactGlobals],
    write: false,
  });
  const header = `/* @ds-bundle: ${JSON.stringify({ format: 4, namespace: NAMESPACE, components: CARDS.map((c) => ({ name: c.name })) })} */\n`;
  return inlineSafe('components/bundle.js', header + result.outputFiles[0].text);
}

function buildCss() {
  const css = readFileSync(`${REACT}/lib/lievre.css`, 'utf8');
  // fonts.css, with the files beside the system: tried from the stylesheet (../fonts) and, when
  // the page inlines it, from the preview (../../fonts).
  const faces = readFileSync(`${REACT}/src/styles/fonts.css`, 'utf8')
    .replace(/^@import[^\n]*\n/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(
      /url\('@fontsource\/ibm-plex-mono\/files\/([^']+)'\) format\('woff2'\)/g,
      "url('../fonts/$1') format('woff2'), url('../../fonts/$1') format('woff2')",
    )
    .trim();
  const head = [
    "/* @lievre/react styles.css, with the faces lievre expects: IBM Plex Sans JP from Google Fonts and Lievre Mono from the system's fonts. */",
    "@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+JP:wght@400;500;600&display=swap');",
    faces,
  ].join('\n');
  return inlineSafe('components/bundle.css', `${head}\n${css}`);
}

// --------------------------------------------------------------- the types

function propsOf(card) {
  const { checker, list } = readExports();
  const e = list.find((x) => x.name === card.name);
  const fromReact = (d) => d.getSourceFile().fileName.includes('/node_modules/');
  const text = (type) =>
    checker.typeToString(
      type,
      undefined,
      ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseSingleQuotesForStringLiteralType,
    );
  const doc = (symbol) => ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim();
  const param = e.signature.parameters[0];
  const props = param && checker.getTypeOfSymbolAtLocation(param, e.decl);
  const fn = ts.isVariableDeclaration(e.decl)
    ? e.decl.initializer &&
      ts.isCallExpression(e.decl.initializer) &&
      e.decl.initializer.arguments[0]
    : e.decl;
  const defaults = {};
  const pattern = fn?.parameters?.[0]?.name;
  if (pattern && ts.isObjectBindingPattern(pattern))
    for (const el of pattern.elements)
      if (el.initializer)
        defaults[(el.propertyName ?? el.name).getText()] = el.initializer.getText();
  const inherited = new Set();
  for (const part of props ? (props.isIntersection() ? props.types : [props]) : []) {
    const name = part.aliasSymbol?.name ?? part.symbol?.name;
    if (name?.endsWith('HTMLAttributes')) inherited.add(text(part));
  }
  const rows = [];
  for (const prop of props?.getProperties() ?? []) {
    const decls = prop.getDeclarations() ?? [];
    if (!decls.length || decls.every(fromReact)) continue;
    const optional = (prop.flags & ts.SymbolFlags.Optional) !== 0;
    let type = text(checker.getTypeOfSymbolAtLocation(prop, e.decl));
    if (optional) type = type.replace(/ \| undefined$/, '');
    rows.push({ name: prop.name, optional, type, doc: doc(prop), def: defaults[prop.name] });
  }
  return { summary: doc(e.target), rows, inherited: [...inherited] };
}

function buildTypes(api) {
  const lines = [
    '// lievre の部品の props。packages/react/src の型から書き出したもので、型の検査には使いません。',
    "import type * as React from 'react';",
    '',
  ];
  for (const card of CARDS) {
    const { summary, rows, inherited } = api[card.name];
    if (summary) lines.push(`/** ${summary.replace(/\*\//g, '*\\/').replace(/\n/g, ' ')} */`);
    const ext = inherited.length
      ? ` extends ${inherited.map((i) => i.replace(/^/, 'React.')).join(', ')}`
      : '';
    lines.push(`export interface ${card.name}Props${ext} {`);
    for (const r of rows) {
      const note = [r.def && `既定 ${r.def}`, r.doc]
        .filter(Boolean)
        .join('。')
        .replace(/\*\//g, '*\\/')
        .replace(/\n/g, ' ');
      if (note) lines.push(`  /** ${note} */`);
      lines.push(
        `  ${/^[A-Za-z_$][\w$]*$/.test(r.name) ? r.name : JSON.stringify(r.name)}${r.optional ? '?' : ''}: ${r.type};`,
      );
    }
    lines.push(
      '}',
      `export declare function ${card.name}(props: ${card.name}Props): React.ReactElement | null;`,
      '',
    );
  }
  // Name the types the props use, so the file reads on its own.
  const used = new Set(lines.join('\n').match(/\b[A-Z][A-Za-z0-9]*\b/g));
  const { checker, list, program } = readExports();
  const lievreTypes = checker
    .getExportsOfModule(checker.getSymbolAtLocation(program.getSourceFile(`${REACT}/src/index.ts`)))
    .map((s) => s.name)
    .filter(
      (n) =>
        used.has(n) &&
        !list.some((e) => e.name === n) &&
        !CARDS.some((c) => `${c.name}Props` === n),
    );
  const reactFile = program
    .getSourceFiles()
    .find((f) => /\/@types\/react\/index\.d\.ts$/.test(f.fileName));
  const reactTypes = reactFile
    ? checker
        .getExportsOfModule(checker.getSymbolAtLocation(reactFile))
        .map((s) => s.name)
        .filter(
          (n) =>
            used.has(n) &&
            !lievreTypes.includes(n) &&
            !CARDS.some((c) => c.name === n || `${c.name}Props` === n),
        )
    : [];
  const imports = [];
  if (reactTypes.length)
    imports.push(`import type { ${reactTypes.sort().join(', ')} } from 'react';`);
  if (lievreTypes.length)
    imports.push(`import type { ${lievreTypes.sort().join(', ')} } from '@lievre/react';`);
  lines.splice(2, 0, ...imports);
  lines.push(
    'declare global {',
    `  interface Window { ${NAMESPACE}: { ${CARDS.map((c) => `${c.name}: typeof ${c.name}`).join('; ')} } }`,
    '}',
    '',
  );
  return lines.join('\n');
}

// --------------------------------------------------------- the component cards

/** The `docs.description.component` string of a story file's meta, if it has one. */
function storyDescription(source) {
  const file = ts.createSourceFile(
    's.tsx',
    source,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TSX,
  );
  let found = null;
  const visit = (node) => {
    if (found) return;
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText() === 'component' &&
      (ts.isStringLiteral(node.initializer) ||
        ts.isNoSubstitutionTemplateLiteral(node.initializer)) &&
      node.parent?.parent?.name?.getText() === 'description'
    )
      found = node.initializer.text;
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

function buildReadme(card, api) {
  const { summary, rows, inherited } = api[card.name];
  const description = storyDescription(card.source);
  const parts = [`# ${card.name}`, ''];
  const lead = [summary, description].filter(Boolean);
  parts.push(lead.length ? lead.join('\n\n') : `${card.name} の部品です。`, '');
  parts.push('## 使い方', '', '- `LievreProvider` の内側に置きます。');
  parts.push(
    `- 見本は \`packages/react/src/stories/${card.name}.stories.tsx\` の Story から作っています。`,
    '',
  );
  if (rows.length || inherited.length) {
    parts.push('## Props', '');
    for (const r of rows) {
      const note = [r.def && `既定 \`${r.def}\``, r.doc].filter(Boolean).join('。');
      parts.push(`- \`${r.name}${r.optional ? '?' : ''}: ${r.type}\`${note ? ` — ${note}` : ''}`);
    }
    for (const base of inherited) parts.push(`- ほかに \`${base}\` の属性を受け取ります。`);
    parts.push('');
  }
  return parts.join('\n');
}

const storybookTest = `
const fn = (impl) => { const f = (...a) => (impl ? impl(...a) : undefined); f.mock = { calls: [] }; return f; };
const stub = new Proxy(function () { return stub; }, { get: () => stub, apply: () => stub });
export { fn, stub as expect, stub as userEvent, stub as within, stub as waitFor, stub as screen, stub as spyOn };
`;

async function buildStory(card) {
  const lievre = resolve(REACT, 'src/index.ts');
  const components = resolve(REACT, 'src/components');
  const result = await esbuild.build({
    entryPoints: [card.file],
    bundle: true,
    format: 'iife',
    globalName: '__lievreStory',
    minify: true,
    legalComments: 'none',
    target: 'es2020',
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    loader: { '.css': 'empty', '.png': 'dataurl', '.svg': 'dataurl' },
    plugins: [
      reactGlobals,
      {
        name: 'lievre-global',
        setup(build) {
          build.onResolve({ filter: /.*/ }, (a) => {
            if (a.path === 'storybook/test') return { path: 'storybook/test', namespace: 'stub' };
            if (!a.path.startsWith('.')) return undefined;
            const target = resolve(a.resolveDir, a.path);
            if (
              target === lievre.replace(/\.ts$/, '') ||
              target === lievre ||
              target.startsWith(components + '/') ||
              target === components
            )
              return { path: 'lievre', namespace: 'lievre' };
            return undefined;
          });
          build.onLoad({ filter: /.*/, namespace: 'lievre' }, () => ({
            contents: `module.exports = window.${NAMESPACE};`,
            loader: 'js',
          }));
          build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
            contents: storybookTest,
            loader: 'js',
          }));
        },
      },
    ],
    write: false,
  });
  return result.outputFiles[0].text;
}

const previewRuntime = (names, row) => `
(function () {
  var R = window.React, L = window.${NAMESPACE}, h = R.createElement;
  var mod = window.__lievreStory, meta = mod.default || {};
  var picked = ${JSON.stringify(names.picked)};
  var order = ${JSON.stringify(names.all)};
  var names = picked.length ? picked : order.filter(function (n) { var s = mod[n]; return s && !(s.play && !s.args && !s.render); }).slice(0, ${DEFAULT_STORIES});
  function theme() { return document.documentElement.getAttribute('data-theme') === 'ink' ? 'ink' : 'paper'; }
  function label(n) { var s = mod[n]; return (s && s.name) || n.replace(/([a-z0-9])([A-Z])/g, '$1 $2'); }
  var Guard = (function () {
    function G(p) { R.Component.call(this, p); this.state = { error: null }; }
    G.prototype = Object.create(R.Component.prototype);
    G.getDerivedStateFromError = function (error) { return { error: error }; };
    G.prototype.render = function () { return this.state.error ? h('p', { className: 'ds-story-error' }, '見本を描けませんでした：' + String(this.state.error.message || this.state.error)) : this.props.children; };
    return G;
  })();
  function Story(p) {
    var s = mod[p.name] || {};
    var args = Object.assign({}, meta.args, s.args);
    var ctx = { args: args, argTypes: {}, globals: { theme: p.theme }, parameters: Object.assign({}, meta.parameters, s.parameters), name: label(p.name), id: p.name };
    var render = s.render || meta.render;
    var Comp = function Base() { return render ? render(args, ctx) : h(meta.component, args); };
    [].concat(s.decorators || [], meta.decorators || []).forEach(function (d) {
      var Inner = Comp;
      Comp = function Decorated() { return d(Inner, ctx); };
    });
    return h(Comp);
  }
  function App() {
    var st = R.useState(theme()), t = st[0], set = st[1];
    R.useEffect(function () {
      var mo = new MutationObserver(function () { set(theme()); });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      return function () { mo.disconnect(); };
    }, []);
    return h(L.LievreProvider, { theme: t, className: ${JSON.stringify(row ? 'ds-root ds-row' : 'ds-root')} },
      names.map(function (n) {
        return h('section', { key: n, className: 'ds-story' },
          h('p', { className: 'ds-story-name' }, label(n)),
          h('div', { className: 'ds-story-body' }, h(Guard, null, h(Story, { name: n, theme: t }))));
      }));
  }
  ReactDOM.createRoot(document.getElementById('root')).render(h(App));
})();
`;

const previewStyle = `
  html, body { margin: 0; }
  body { background: var(--lv-bg); }
  .ds-root { padding: 16px; display: flex; flex-direction: column; gap: 24px; min-height: 100vh; box-sizing: border-box; }
  .ds-row { flex-flow: row wrap; align-items: flex-start; gap: 24px 32px; }
  .ds-story { display: flex; flex-direction: column; gap: 8px; }
  .ds-story-name { margin: 0; font-size: var(--lv-text-xs); line-height: 20px; color: var(--lv-muted); }
  .ds-story-error { margin: 0; color: var(--lv-danger); }
`;

function buildPreview(card, script) {
  const names = { picked: card.stories ?? [], all: storyNamesOf(card) };
  const height = card.height ?? 200;
  const body = [
    `<!-- @dsCard group="${card.group ?? 'Other'}" height=${height} -->`,
    '<!doctype html>',
    '<html lang="ja">',
    '<head>',
    '<meta charset="utf-8">',
    `<title>${card.name}</title>`,
    `<style>${previewStyle}</style>`,
    '</head>',
    '<body>',
    '<div id="root"></div>',
    `<script>${inlineSafe(`components/${card.name}/preview.html`, script)}${previewRuntime(names, card.row)}</script>`,
    '</body>',
    '</html>',
    '',
  ].join('\n');
  return body;
}

function storyNamesOf(card) {
  const file = ts.createSourceFile(
    's.tsx',
    card.source,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TSX,
  );
  const names = [];
  for (const node of file.statements)
    if (
      ts.isVariableStatement(node) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    )
      for (const d of node.declarationList.declarations)
        if (ts.isIdentifier(d.name)) names.push(d.name.text);
  return names;
}

// ------------------------------------------------------------------- write

const { tokens, skipped } = buildTokens();
put('project/tokens.json', json(tokens));
put('project/tokens.css', buildTokensCss(tokens));
for (const w of MONO_WEIGHTS) {
  const name = `ibm-plex-mono-latin-${w}-normal.woff2`;
  put(
    `project/fonts/${name}`,
    readFileSync(requireReact.resolve(`@fontsource/ibm-plex-mono/files/${name}`)),
  );
}

const notSynced = [
  '',
  '## 見本集に入れていないもの',
  '',
  `- カードのない export：${Object.entries(NO_CARD)
    .map(([n, why]) => `\`${n}\`（${why}）`)
    .join('、')}。hook と関数もカードにしていません。`,
  `- トークン：${skipped.map((s) => `\`${s}\``).join('・')}（動きの長さと緩急。この形式に動きの欄がないため）。density="compact" と typography="interface" の値は、各トークンの説明に書いています。`,
  '- 質感（`wear`）と経年（`age`）の試作。見本はどれも質感なしで描いています。',
  '',
].join('\n');
put('project/README.md', readFileSync(join(HERE, 'README.md'), 'utf8') + notSynced);

// The logos in tile order: the main mark first, the terminal's last.
const LOGO_ORDER = [
  'lievre-web.svg',
  'lievre-web-small.svg',
  'lievre-web-tile-light.svg',
  'lievre-tui.svg',
];
const logos = readdirSync(join(ROOT, 'logo'))
  .filter((f) => f.endsWith('.svg'))
  .sort(
    (a, b) =>
      (LOGO_ORDER.indexOf(a) + 1 || 99) - (LOGO_ORDER.indexOf(b) + 1 || 99) || (a < b ? -1 : 1),
  );
for (const f of logos) put(`project/assets/Logos/${f}`, readFileSync(join(ROOT, 'logo', f)));
put('project/assets/Logos/README.md', readFileSync(join(HERE, 'logos.md'), 'utf8'));

put('project/components/bundle.js', await buildBundle());
put('project/components/bundle.css', buildCss());
const api = Object.fromEntries(CARDS.map((c) => [c.name, propsOf(c)]));
put('project/components/index.d.ts', buildTypes(api));
for (const card of CARDS) {
  put(`project/components/${card.name}/README.md`, buildReadme(card, api));
  const script = await buildStory(card);
  put(`project/components/${card.name}/preview.html`, buildPreview(card, script));
}
put('project/components/Cover/preview.html', readFileSync(join(HERE, 'cover.html'), 'utf8'));

// The logos are uploads, not files: their records (from the upload's /_blob/<id>) are kept in
// scripts/design-system/assets.json with the sha256 of the logo/ file they were made from.
const uploaded = JSON.parse(readFileSync(join(HERE, 'assets.json'), 'utf8')).Logos ?? {};
const current = logos.filter(
  (f) => uploaded[f]?.source === sha256(readFileSync(join(ROOT, 'logo', f))),
);
const stale = logos.filter((f) => !current.includes(f));
const index = {
  v: 3,
  layout: 'files',
  createdOnFiles: CREATED_ON_FILES,
  title: 'lievre',
  namespace: NAMESPACE,
  libraries: LIBRARIES,
  editing: 'code',
  sections: {},
  groups: ['Logos'],
  assetGroups: {
    Logos: {
      name: 'Logos',
      tile: 'm',
      order: current,
      files: Object.fromEntries(
        current.map((f) => {
          const { name, blob, size, type } = uploaded[f];
          return [f, { name, blob, size, type }];
        }),
      ),
    },
  },
  blobs: {},
  docs: { readme: 'project/README.md', sections: [] },
  lastChange: {
    by: 'Claude',
    at: date,
    via: `GitHub · ${REPO}@${sha}`,
    note: `${ref} から書き出し`,
  },
};
put('project/design-system.json', json(index));

// files.json: the hash of every file to publish (not the uploads), which the next sync compares.
const isUpload = (p) => p.startsWith('project/assets/') && !/\.(md|json)$/.test(p);
const listing = Object.fromEntries(
  [...files.entries()]
    .filter(([p]) => !isUpload(p))
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([p, b]) => [p, sha256(b)]),
);
put('project/sync/files.json', json({ ref, files: listing }));

rmSync(P, { recursive: true, force: true });
for (const [path, buf] of files) {
  mkdirSync(dirname(join(OUT, path)), { recursive: true });
  writeFileSync(join(OUT, path), buf);
}

console.log(
  `${relative(ROOT, OUT) || '.'}/project に ${files.size} 個のファイルを書きました（${ref}、部品 ${CARDS.length} 個）。`,
);
if (stale.length)
  console.log(
    `アップロードし直すロゴ：${stale.join('、')}（project/assets/Logos/ にあります）。上げたら返ってきた id と大きさ、logo/ のファイルの sha256 を scripts/design-system/assets.json に書いて、もう一度流してください。`,
  );

if (opts.against) {
  const before = JSON.parse(readFileSync(resolve(opts.against), 'utf8')).files ?? {};
  const changed = Object.keys(listing).filter((p) => before[p] !== listing[p]);
  // files.json itself changes with them; it is what the next sync compares against.
  if (changed.length) changed.push('project/sync/files.json');
  const removed = Object.keys(before).filter((p) => !(p in listing));
  writeFileSync(join(OUT, 'changed.json'), json({ changed, removed, logos: stale }));
  console.log(
    `前の files.json から変わったファイル ${changed.length} 個、消えたファイル ${removed.length} 個（${relative(ROOT, join(OUT, 'changed.json'))}）。`,
  );
}
