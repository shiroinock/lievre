// The design system's inventory: which exports of @lievre/react get a card in the Design System
// artifact, read from the TypeScript sources so it follows src/index.ts. `pnpm test`
// (scripts/design-system.test.mjs) fails when an export has neither a card nor a reason below.
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '../..');
export const REACT = `${ROOT}/packages/react`;
export const STORIES = `${REACT}/src/stories`;

const require = createRequire(`${REACT}/package.json`);
export const ts = require('typescript');

/**
 * PascalCase exports that are not components of their own, with the reason. Everything else that
 * starts with a capital and can be called gets a card, built from `src/stories/<Name>.stories.tsx`.
 */
export const NO_CARD = {
  LievreProvider: '土台。スタイルの効く `.lievre` を出す。どの見本もこれで包んでいる',
  ToastProvider: '土台。`useToast()` の通知を出す場所',
  PortalSurface: '土台。ポータルの中身に配色を渡す',
  DialogClose: 'Dialog の部品。Dialog の見本の中で使う',
};

/**
 * Per card: `stories` to show (export names, in this order), `row` to lay small ones side by side,
 * and the starting `height`. Without `stories` the card shows the first stories of the file,
 * leaving out those that are only a `play`.
 */
export const CARDS = {
  Button: {
    row: true,
    stories: ['Primary', 'Secondary', 'Ghost', 'Danger', 'WithIcon', 'Loading'],
  },
  IconButton: { row: true },
  Badge: { row: true },
  Counter: { row: true },
  Kbd: { row: true },
  Avatar: { row: true },
  Spinner: { row: true },
  Chip: { row: true },
  Link: { row: true },
  ActionLink: { row: true },
};

/** How many stories a card shows when CARDS does not say. */
export const DEFAULT_STORIES = 4;

let cached;
/** Every value export of src/index.ts, with what the TypeScript checker knows about it. */
export function readExports() {
  if (cached) return cached;
  const entry = `${REACT}/src/index.ts`;
  const program = ts.createProgram([entry], {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
    strict: true,
    skipLibCheck: true,
  });
  const checker = program.getTypeChecker();
  const symbols = checker.getExportsOfModule(
    checker.getSymbolAtLocation(program.getSourceFile(entry)),
  );
  const list = [];
  for (const symbol of symbols) {
    const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
    const decl = target.valueDeclaration ?? target.declarations?.[0];
    if (!decl || ts.isTypeAliasDeclaration(decl) || ts.isInterfaceDeclaration(decl)) continue;
    const type = checker.getTypeOfSymbolAtLocation(target, decl);
    const signature = type.getCallSignatures()[0] ?? type.getConstructSignatures()[0];
    list.push({ name: symbol.name, target, decl, signature });
  }
  cached = { program, checker, list };
  return cached;
}

/** Exports that look like components: a capital first letter and a call signature. */
export function componentExports() {
  return readExports()
    .list.filter((e) => /^[A-Z]/.test(e.name) && e.signature)
    .map((e) => e.name);
}

/** The cards, in export order, each with its story file and the group from the story title. */
export function cards() {
  return componentExports()
    .filter((name) => !(name in NO_CARD))
    .map((name) => {
      const file = `${STORIES}/${name}.stories.tsx`;
      const source = existsSync(file) ? readFileSync(file, 'utf8') : null;
      const title = source && /^\s*title:\s*'([^']+)'/m.exec(source)?.[1];
      const parts = title ? title.split('/') : [];
      return {
        name,
        file: source ? file : null,
        source,
        group: parts.length > 2 ? parts[parts.length - 2] : (parts[0] ?? null),
        ...CARDS[name],
      };
    });
}

/** What is wrong with the inventory, as messages that say how to fix it. Empty when in step. */
export function inventoryProblems() {
  const problems = [];
  const exported = new Set(componentExports());
  for (const name of Object.keys(NO_CARD))
    if (!exported.has(name))
      problems.push(
        `${name} は src/index.ts から export されていません。scripts/design-system/inventory.mjs の NO_CARD から消してください。`,
      );
  for (const name of Object.keys(CARDS))
    if (!exported.has(name) || name in NO_CARD)
      problems.push(
        `${name} はカードになる部品ではありません。scripts/design-system/inventory.mjs の CARDS から消してください。`,
      );
  for (const card of cards()) {
    if (!card.file) {
      problems.push(
        `${card.name} に Story（packages/react/src/stories/${card.name}.stories.tsx）がありません。見本はそこから作ります。Story を足すか、部品でなければ scripts/design-system/inventory.mjs の NO_CARD に理由と一緒に足してください。`,
      );
      continue;
    }
    const exports = storyNames(card.source);
    for (const story of card.stories ?? [])
      if (!exports.includes(story))
        problems.push(
          `${card.name} の Story に ${story} がありません。scripts/design-system/inventory.mjs の CARDS.${card.name}.stories を直してください。`,
        );
  }
  return problems;
}

/** The story exports of a story file, in source order. */
export function storyNames(source) {
  const file = ts.createSourceFile(
    's.tsx',
    source,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TSX,
  );
  const names = [];
  for (const node of file.statements) {
    if (!ts.isVariableStatement(node)) continue;
    if (!node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
    for (const d of node.declarationList.declarations)
      if (ts.isIdentifier(d.name) && /^[A-Z]/.test(d.name.text)) names.push(d.name.text);
  }
  return names;
}
