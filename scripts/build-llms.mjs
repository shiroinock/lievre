// Write llms.txt: the hand-written guide (docs/llms-intro.md) plus every export's API, read from
// the TypeScript sources so it cannot drift from the types.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..') + '/';
const entry = `${root}src/index.ts`;

export function buildLlms() {
  const program = ts.createProgram([entry], {
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
    strict: true,
    skipLibCheck: true,
  });
  const checker = program.getTypeChecker();
  const exports = checker.getExportsOfModule(
    checker.getSymbolAtLocation(program.getSourceFile(entry)),
  );

  const doc = (symbol) => ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim();
  const fromReact = (decl) => decl.getSourceFile().fileName.includes('/node_modules/');
  const text = (type) =>
    checker.typeToString(
      type,
      undefined,
      ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseSingleQuotesForStringLiteralType,
    );

  // `variant = 'secondary'` in the destructured props is the default.
  const defaults = (decl) => {
    const fn = ts.isVariableDeclaration(decl)
      ? decl.initializer && ts.isCallExpression(decl.initializer) && decl.initializer.arguments[0]
      : decl;
    const pattern = fn?.parameters?.[0]?.name;
    const found = {};
    if (pattern && ts.isObjectBindingPattern(pattern))
      for (const el of pattern.elements)
        if (el.initializer)
          found[(el.propertyName ?? el.name).getText()] = el.initializer.getText();
    return found;
  };

  const component = (symbol, decl, signature) => {
    const lines = [];
    const props =
      signature.parameters[0] && checker.getTypeOfSymbolAtLocation(signature.parameters[0], decl);
    const given = defaults(decl);
    const inherited = new Set();
    for (const part of props ? (props.isIntersection() ? props.types : [props]) : []) {
      const name = part.aliasSymbol?.name ?? part.symbol?.name;
      if (name?.endsWith('HTMLAttributes')) inherited.add(text(part));
    }
    for (const prop of props?.getProperties() ?? []) {
      const decls = prop.getDeclarations() ?? [];
      if (!decls.length || decls.every(fromReact)) continue;
      const optional = (prop.flags & ts.SymbolFlags.Optional) !== 0;
      let type = text(checker.getTypeOfSymbolAtLocation(prop, decl));
      if (optional) type = type.replace(/ \| undefined$/, '');
      const note = [given[prop.name] && `既定 ${given[prop.name]}`, doc(prop)]
        .filter(Boolean)
        .join('。');
      lines.push(`- \`${prop.name}${optional ? '?' : ''}: ${type}\`${note ? ` — ${note}` : ''}`);
    }
    for (const base of inherited) lines.push(`- ほかに ${base} の属性を受け取ります。`);
    return lines;
  };

  const sections = [];
  for (const symbol of exports) {
    const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
    const decl = target.valueDeclaration ?? target.declarations?.[0];
    if (!decl || fromReact(decl)) continue;
    const name = symbol.name;
    const summary = doc(target);
    if (ts.isTypeAliasDeclaration(decl)) {
      // Prop types are already listed under their component.
      if (/Props$/.test(name)) continue;
      const flat = (node) =>
        node
          .getText()
          .replace(/\/\*\*[\s\S]*?\*\//g, '')
          .replace(/\s+/g, ' ');
      const members = ts.isTypeLiteralNode(decl.type) ? decl.type.members : [];
      const documented = members.filter((m) => m.name && doc(checker.getSymbolAtLocation(m.name)));
      const head = documented.length
        ? `type ${name}${decl.typeParameters ? `<${decl.typeParameters.map((t) => t.getText()).join(', ')}>` : ''}`
        : flat(decl).replace(/^export /, '');
      const lines = [`- \`${head}\`${summary ? ` — ${summary}` : ''}`];
      if (documented.length)
        for (const m of members) {
          const note = doc(checker.getSymbolAtLocation(m.name));
          lines.push(
            `  - \`${m.name.getText()}${m.questionToken ? '?' : ''}: ${flat(m.type)}\`${note ? ` — ${note}` : ''}`,
          );
        }
      sections.push({ kind: 'type', body: lines.join('\n') });
      continue;
    }
    const type = checker.getTypeOfSymbolAtLocation(target, decl);
    const [signature] = type.getCallSignatures();
    const callable = signature ?? type.getConstructSignatures()[0];
    if (/^use[A-Z]/.test(name) && signature) {
      sections.push({
        kind: 'hook',
        body: `### ${name}\n\n\`${name}${text(type).replace(/^\(\)/, '()')}\`${summary ? `\n\n${summary}` : ''}`,
      });
      continue;
    }
    if (/^[A-Z]/.test(name) && callable) {
      const lines = component(target, decl, callable);
      sections.push({
        kind: 'component',
        body: [`### ${name}`, summary, lines.join('\n')].filter(Boolean).join('\n\n'),
      });
      continue;
    }
    sections.push({
      kind: 'other',
      body: `- \`${name}\`: \`${text(type)}\`${summary ? ` — ${summary}` : ''}`,
    });
  }

  const pick = (kind) => sections.filter((s) => s.kind === kind).map((s) => s.body);
  const intro = readFileSync(`${root}docs/llms-intro.md`, 'utf8').trim();
  return (
    [
      intro,
      '## 部品',
      ...pick('component'),
      '## フック',
      ...pick('hook'),
      '## 型とその他',
      [...pick('type'), ...pick('other')].join('\n'),
    ].join('\n\n') + '\n'
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(`${root}llms.txt`, buildLlms());
  console.log('llms.txt を書き出しました。');
}
