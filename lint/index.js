// Lint rules for apps that use KEI: mistakes the types let through. The plugin is written in
// ESLint's format with no imports, so Oxlint's JS plugins load the same file unchanged.
// Each message says how to fix the mistake, so it can be fixed from the message alone.

const defaultSources = ['@kei-design/react'];

// Which local names refer to KEI's components: `import { Button as KButton } from '@kei-design/react'`.
function keiImports(context) {
  const sources = context.settings?.kei?.importSources ?? defaultSources;
  const names = new Map();
  const namespaces = new Set();
  for (const statement of context.sourceCode.ast.body) {
    if (statement.type !== 'ImportDeclaration' || !sources.includes(statement.source.value))
      continue;
    for (const s of statement.specifiers) {
      if (s.type === 'ImportSpecifier')
        names.set(s.local.name, s.imported.name ?? s.imported.value);
      else if (s.type === 'ImportNamespaceSpecifier') namespaces.add(s.local.name);
    }
  }
  // The KEI name of a JSX element, or undefined when it is not KEI's.
  return (name) => {
    if (name?.type === 'JSXIdentifier') return names.get(name.name);
    if (
      name?.type === 'JSXMemberExpression' &&
      name.object.type === 'JSXIdentifier' &&
      namespaces.has(name.object.name)
    )
      return name.property.name;
  };
}

const attribute = (opening, name) =>
  opening.attributes.find((a) => a.type === 'JSXAttribute' && a.name.name === name);
// A spread may carry any prop, so rules about a missing prop stay quiet.
const hasSpread = (opening) => opening.attributes.some((a) => a.type === 'JSXSpreadAttribute');
const missing = (opening, name) => !attribute(opening, name) && !hasSpread(opening);

// Icon libraries, also matched by subpath ('@heroicons/react/24/outline', 'react-icons/fa').
// Apps add their own with `settings.kei.iconSources`.
const defaultIconSources = [
  'lucide-react',
  '@radix-ui/react-icons',
  '@heroicons/react',
  'react-icons',
];

// Local names of the components imported from an icon library.
function iconImports(context) {
  const sources = [...defaultIconSources, ...(context.settings?.kei?.iconSources ?? [])];
  const names = new Set();
  for (const statement of context.sourceCode.ast.body)
    if (
      statement.type === 'ImportDeclaration' &&
      sources.some(
        (s) => statement.source.value === s || statement.source.value.startsWith(`${s}/`),
      )
    )
      for (const s of statement.specifiers) names.add(s.local.name);
  return names;
}

// The string a prop is given when it is written in the code: `value="1"`, `value={'1'}`, `` value={`1`} ``.
function staticString(attr) {
  let value = attr?.value;
  if (value?.type === 'JSXExpressionContainer') value = value.expression;
  if (value?.type === 'Literal' && typeof value.value === 'string') return value.value;
  if (value?.type === 'TemplateLiteral' && value.expressions.length === 0)
    return value.quasis[0].value.cooked;
  return null;
}

// Whether a subtree has a `sortValue` key: `{ key: 'name', sortValue: (r) => r.name }`.
function hasSortValue(node) {
  if (!node || typeof node !== 'object') return false;
  if (Array.isArray(node)) return node.some(hasSortValue);
  if (
    node.type === 'Property' &&
    !node.computed &&
    (node.key.name ?? node.key.value) === 'sortValue'
  )
    return true;
  for (const key in node)
    if (key !== 'parent' && key !== 'loc' && key !== 'range' && hasSortValue(node[key]))
      return true;
  return false;
}

// Whether a DataTable has a column with `sortValue`. `columns={columns}` is followed to its
// declaration in this file; columns that come from elsewhere fall back to the whole file.
function sortable(context, node, program) {
  const columns = attribute(node, 'columns')?.value?.expression;
  if (columns?.type === 'Identifier') {
    let scope = context.sourceCode.getScope(node);
    for (; scope; scope = scope.upper) {
      const variable = scope.set.get(columns.name);
      if (!variable) continue;
      const declarator = variable.defs.find((d) => d.node.type === 'VariableDeclarator')?.node;
      if (declarator) return hasSortValue(declarator.init);
      break;
    }
    return hasSortValue(program);
  }
  return hasSortValue(columns ?? program);
}

const isFunction = (node) =>
  node.type === 'FunctionDeclaration' ||
  node.type === 'FunctionExpression' ||
  node.type === 'ArrowFunctionExpression';

function* ancestors(node) {
  for (let n = node.parent; n; n = n.parent) yield n;
}

// Visit the opening tags of the named KEI components.
function onKei(components, check) {
  return (context) => {
    let kei;
    return {
      Program() {
        kei = keiImports(context);
      },
      JSXOpeningElement(node) {
        const name = kei(node.name);
        if (components.includes(name)) check(context, node, name, kei);
      },
    };
  };
}

const rule = (description, messages, create, extra = {}) => ({
  meta: {
    type: 'problem',
    docs: { description, url: 'https://github.com/shiroinock/kei-design-system#lint' },
    messages,
    schema: [],
    ...extra,
  },
  create,
});

const rules = {
  'button-type-in-form': rule(
    'form の中の Button と IconButton には type を書く',
    {
      type: "form の中の Button は type を省くと type='button' になり、押しても送信しません。送信するボタンには type='submit'、送信しないボタンには type='button' と書いてください。",
    },
    onKei(['Button', 'IconButton'], (context, node) => {
      if (!missing(node, 'type')) return;
      for (const n of ancestors(node)) {
        // A Button passed as a prop (trigger, footer) is placed by its component, not the form.
        if (n.type === 'JSXAttribute') return;
        if (n.type === 'JSXElement' && n.openingElement.name.name === 'form') {
          context.report({ node, messageId: 'type' });
          return;
        }
      }
    }),
  ),

  'metric-unit': rule(
    'Metric の単位は value に含めず unit に分ける',
    {
      unit: "Metric の value には数値だけを渡し、単位は unit に分けてください（value='99.95' unit='%'）。数値は等幅、単位は本文の書体で並べます。",
    },
    onKei(['Metric'], (context, node) => {
      const attr = attribute(node, 'value');
      const value = staticString(attr)?.trim();
      if (!value) return;
      const suffix = value.match(/^([+\-−±]?\d[\d,]*(?:\.\d+)?)\s*([^\d\s][^\d]*)$/);
      const prefix = value.match(/^[¥￥$€£]\s*[+\-−]?\d[\d,]*(?:\.\d+)?$/);
      if (!suffix && !prefix) return;
      context.report({
        node: attr,
        messageId: 'unit',
        // Only "99.95%" splits without a judgement call; "¥1,200" needs the word for the unit.
        fix:
          suffix && !attribute(node, 'unit')
            ? (fixer) =>
                fixer.replaceText(
                  attr,
                  `value=${JSON.stringify(suffix[1])} unit=${JSON.stringify(suffix[2].trim())}`,
                )
            : undefined,
      });
    }),
    { fixable: 'code' },
  ),

  'metric-change': rule(
    'Metric の trend の向きを change に言葉で書く',
    {
      change:
        "Metric の trend は矢印と色だけで、読み上げでは向きが伝わりません。change に向きを言葉で書いてください（change='前週比 +0.02 ポイント上昇'）。",
    },
    onKei(['Metric'], (context, node) => {
      const trend = staticString(attribute(node, 'trend'));
      if ((trend === 'up' || trend === 'down') && missing(node, 'change'))
        context.report({ node, messageId: 'change' });
    }),
  ),

  'dialog-close': rule(
    'Dialog・ConfirmDialog・Popover を閉じられるようにする',
    {
      open: '{{name}} に open だけを渡すと、Escape・閉じるボタン・外側を押しても閉じません。open と一緒に onOpenChange={setOpen} を渡してください。開閉を部品に任せるなら open を省きます。',
      footer:
        'Dialog の footer の Button に onClick がなく、押しても何も起きません。閉じるだけのボタンは <DialogClose asChild><Button>キャンセル</Button></DialogClose> で包み、処理するボタンには onClick を渡してください。',
    },
    (context) => {
      let kei;
      return {
        Program() {
          kei = keiImports(context);
        },
        JSXOpeningElement(node) {
          const name = kei(node.name);
          if (
            ['Dialog', 'ConfirmDialog', 'Popover'].includes(name) &&
            attribute(node, 'open') &&
            missing(node, 'onOpenChange')
          )
            context.report({ node: attribute(node, 'open'), messageId: 'open', data: { name } });
          if (name !== 'Button' || !missing(node, 'onClick') || !missing(node, 'type')) return;
          for (const n of ancestors(node)) {
            if (n.type === 'JSXElement' && kei(n.openingElement.name) === 'DialogClose') return;
            if (n.type === 'JSXAttribute' && n.name.name === 'footer') {
              if (kei(n.parent.name) === 'Dialog') context.report({ node, messageId: 'footer' });
              return;
            }
          }
        },
      };
    },
  ),

  'confirm-dialog-trigger': rule(
    'ConfirmDialog には trigger か open を渡す',
    {
      trigger:
        'ConfirmDialog に trigger も open もなく、開く手段がありません。ボタンから開くなら trigger を、メニューの項目などから開くなら open と onOpenChange を渡してください。',
    },
    onKei(['ConfirmDialog'], (context, node) => {
      if (missing(node, 'trigger') && missing(node, 'open'))
        context.report({ node, messageId: 'trigger' });
    }),
  ),

  'confirm-label': rule(
    'ConfirmDialog の confirmLabel に何が起きるかを書く',
    {
      label:
        "confirmLabel が「OK」「はい」「実行」などで、押すと何が起きるか分かりません。何に何をするかを動詞で書いてください（confirmLabel='3件を削除'）。",
    },
    onKei(['ConfirmDialog'], (context, node) => {
      const attr = attribute(node, 'confirmLabel');
      const label = staticString(attr)?.trim();
      if (label != null && vagueLabel.test(label))
        context.report({ node: attr, messageId: 'label' });
    }),
  ),

  'danger-tone': rule(
    '削除など取り消せない操作は tone を danger にする',
    {
      confirm:
        "confirmLabel が「削除」など取り消せない操作なのに tone='danger' がありません。ConfirmDialog に tone='danger' を付けて、実行のボタンを赤にしてください。",
      menu: "「削除」など取り消せない操作のメニューの項目に tone: 'danger' がありません。項目に tone: 'danger' を付けて、赤の文字にしてください。",
    },
    onKei(['ConfirmDialog', 'DropdownMenu'], (context, node, name) => {
      if (name === 'ConfirmDialog') {
        const attr = attribute(node, 'confirmLabel');
        if (destructive.test(staticString(attr) ?? '') && missing(node, 'tone'))
          context.report({ node: attr, messageId: 'confirm' });
        return;
      }
      const items = attribute(node, 'items')?.value?.expression;
      if (items?.type !== 'ArrayExpression') return;
      for (const item of items.elements) {
        if (item?.type !== 'ObjectExpression') continue;
        const prop = (key) =>
          item.properties.find((p) => p.type === 'Property' && (p.key.name ?? p.key.value) === key);
        const label = prop('label')?.value;
        // `type: 'item'` is an item too; other types (a separator) have no tone.
        const type = prop('type')?.value;
        const isItem = !type || (type.type === 'Literal' && type.value === 'item');
        const hasSpreadProp = item.properties.some((p) => p.type !== 'Property');
        if (
          label?.type === 'Literal' &&
          destructive.test(String(label.value)) &&
          !prop('tone') &&
          isItem &&
          !hasSpreadProp
        )
          context.report({ node: item, messageId: 'menu' });
      }
    }),
  ),

  'icon-button-label': rule(
    'IconButton の label に何をするかを言葉で書く',
    {
      label:
        "IconButton の label が空か記号だけで、読み上げで何のボタンか分かりません。何をするかを言葉で書いてください（label='行の操作'）。",
    },
    onKei(['IconButton'], (context, node) => {
      const attr = attribute(node, 'label');
      const label = staticString(attr);
      if (label != null && /^[\s\p{P}\p{S}]*$/u.test(label))
        context.report({ node: attr, messageId: 'label' });
    }),
  ),

  'icon-only-button': rule(
    'アイコンだけのボタンは IconButton にする',
    {
      icon: "アイコンだけのボタンは IconButton を使い、label で読み上げ用の名前を付けてください（<IconButton label='行の操作' icon={<MoreHorizontal />} />）。label はツールチップにも出ます。",
    },
    (context) => {
      let kei, icons;
      return {
        Program() {
          kei = keiImports(context);
          icons = iconImports(context);
        },
        JSXElement(element) {
          const node = element.openingElement;
          if (kei(node.name) !== 'Button' || hasSpread(node) || attribute(node, 'children')) return;
          const shown = element.children.filter((c) => !(c.type === 'JSXText' && !c.value.trim()));
          // Only what is surely an icon: `<FormattedMessage />` or `<SaveLabel />` may be the text.
          const isIcon = (c) => {
            const name = c.type === 'JSXElement' && c.openingElement.name;
            return (
              name?.type === 'JSXIdentifier' &&
              (icons.has(name.name) || /Icon$/.test(name.name) || /Icon$/.test(kei(name) ?? ''))
            );
          };
          if (shown.every(isIcon) && (shown.length > 0 || attribute(node, 'icon')))
            context.report({ node, messageId: 'icon' });
        },
      };
    },
  ),

  // The order of a paged table belongs to DataTable: it sorts every row, then cuts the page.
  // How the rows are made (slice, filter, a helper) is not looked at, only the components used,
  // and only within one component: the nearest function around the DataTable. A Pagination
  // moved out to a footer component in the same file is missed, rather than stopping a table
  // that another component in the file pages cards beside.
  'table-pagination': rule(
    '並べ替えのある DataTable のページ送りは DataTable に任せる',
    {
      page: "並べ替えのある DataTable の外で Pagination を使うと、区切った後の行の中だけで並べ替わります。全件を rows に渡して pageSize を付け、ページ送りは DataTable に描かせてください（pageSize={10} page={page} onPageChange={setPage}）。サーバーで並べ替えて区切るなら dataMode='server' と totalCount を渡してください。",
    },
    (context) => {
      let kei;
      const tables = [];
      // Every function (and the program) that has a Pagination somewhere inside it.
      const paged = new Set();
      return {
        Program() {
          kei = keiImports(context);
        },
        JSXOpeningElement(node) {
          const name = kei(node.name);
          if (name === 'Pagination') {
            for (const n of ancestors(node))
              if (isFunction(n) || n.type === 'Program') paged.add(n);
          }
          if (name === 'DataTable' && missing(node, 'pageSize') && missing(node, 'dataMode'))
            tables.push(node);
        },
        'Program:exit'(program) {
          for (const node of tables) {
            const owner = [...ancestors(node)].find((n) => isFunction(n) || n.type === 'Program');
            if (paged.has(owner) && sortable(context, node, program))
              context.report({ node, messageId: 'page' });
          }
        },
      };
    },
  ),

  // Units are words, not data: `<span><span className='k-mono'>{n}</span>%</span>`.
  'unit-outside-mono': rule(
    '単位は .k-mono の外に置く',
    {
      unit: "単位（%・円）は .k-mono の外に出して本文の書体にしてください：<span><span className='k-mono'>{n}</span>%</span>",
    },
    (context) => ({
      JSXText(node) {
        const element = node.parent;
        if (
          /[%％円]/.test(node.value) &&
          element?.type === 'JSXElement' &&
          staticString(attribute(element.openingElement, 'className'))
            ?.split(/\s+/)
            .includes('k-mono')
        )
          context.report({ node, messageId: 'unit' });
      },
    }),
  ),
};

const vagueLabel = /^(ok|yes|はい|いいえ|確認|確認する|実行|実行する|決定|了解|続ける|確定)$/i;
const destructive = /削除|破棄|消去|解約|退会|初期化|取り消せません/;

const plugin = {
  meta: { name: 'kei', version: '0.2.0' },
  rules,
};

const recommendedRules = Object.fromEntries(
  Object.keys(rules).map((name) => [`kei/${name}`, 'error']),
);

// ESLint's flat config: `export default [kei.configs.recommended]`.
plugin.configs = {
  recommended: { name: 'kei/recommended', plugins: { kei: plugin }, rules: recommendedRules },
};

export default plugin;
