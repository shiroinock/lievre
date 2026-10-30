// KEI's own stylelint rules. Each one guards a mistake that review has caught before.
import { readFileSync } from 'node:fs';
import stylelint from 'stylelint';

const {
  createPlugin,
  utils: { report, ruleMessages },
} = stylelint;

function rule(name, message, check) {
  const ruleName = `kei/${name}`;
  const messages = ruleMessages(ruleName, { rejected: message });
  const ruleFunction = (primary) => (root, result) => {
    if (!primary) return;
    check(root, (node, text = messages.rejected) =>
      report({ ruleName, result, node, message: text }),
    );
  };
  ruleFunction.ruleName = ruleName;
  ruleFunction.messages = messages;
  ruleFunction.meta = {
    url: 'https://github.com/shiroinock/kei-design-system/blob/main/DESIGN.md',
  };
  return createPlugin(ruleName, ruleFunction);
}

const inside = (node, test) => {
  for (let p = node.parent; p; p = p.parent) if (p.type === 'atrule' && test(p)) return true;
  return false;
};
const selectors = (r) => r.selector.split(',').map((s) => s.replace(/\s+/g, ' ').trim());

// Utilities sit above components, so a size set here would override every component's size.
const utilitiesNoSize = rule(
  'utilities-no-size',
  'kei.utilities のクラスで文字の大きさや行の高さを指定しないでください（部品の指定を上書きします）。下限は kei.base に置きます。',
  (root, fail) => {
    root.walkDecls(/^(font|font-size|line-height)$/, (decl) => {
      if (inside(decl, (a) => a.name === 'layer' && a.params.trim() === 'kei.utilities'))
        fail(decl);
    });
  },
);

// Punctuation that Japanese text sets full width must fall through to the Japanese face.
const FULL_WIDTH = [0x2014, 0x2015, 0x2018, 0x2019, 0x201c, 0x201d, 0x2025, 0x2026, 0x3000];
const monoUnicodeRange = rule(
  'mono-unicode-range',
  'KEI Mono の unicode-range に、日本語で全角に組む約物（— ‘ ’ “ ” ‥ … など）を含めないでください。',
  (root, fail) => {
    root.walkAtRules('font-face', (face) => {
      if (!face.some((d) => d.prop === 'font-family' && /KEI Mono/.test(d.value))) return;
      face.walkDecls('unicode-range', (decl) => {
        const ranges = decl.value.split(',').map((r) => {
          const [lo, hi = lo] = r.trim().replace(/^U\+/i, '').split('-');
          return [parseInt(lo.replace(/\?/g, '0'), 16), parseInt(hi.replace(/\?/g, 'F'), 16)];
        });
        const hit = FULL_WIDTH.filter((c) => ranges.some(([lo, hi]) => c >= lo && c <= hi));
        if (hit.length)
          fail(
            decl,
            `KEI Mono の unicode-range が全角の約物 ${hit.map((c) => String.fromCodePoint(c)).join(' ')} を含んでいます。`,
          );
      });
    });
  },
);

// Every --k-weight-* token needs a real KEI Mono face, or the browser fakes the weight.
const monoWeights = rule('mono-weights', '', (root, fail) => {
  const faces = [];
  root.walkAtRules('font-face', (face) => {
    if (face.some((d) => d.prop === 'font-family' && /KEI Mono/.test(d.value)))
      faces.push(face.nodes.find((d) => d.prop === 'font-weight')?.value ?? '400');
  });
  if (!faces.length) return;
  const css = readFileSync(new URL('../src/styles/kei.css', import.meta.url), 'utf8');
  for (const [, weight] of css.matchAll(/--k-weight-[\w-]+:\s*(\d+);/g))
    if (!faces.includes(weight))
      fail(root.first ?? root, `KEI Mono に font-weight: ${weight} の @font-face がありません。`);
});

// A state shown only by a background colour disappears when the browser forces colours.
const STATE =
  /\[data-(state|highlighted|selected)|:checked|\[aria-(selected|checked|current|pressed|expanded)/;
const SYSTEM_COLOR =
  /\b(Canvas|CanvasText|Highlight|HighlightText|ButtonFace|ButtonText|GrayText|LinkText|AccentColor|AccentColorText|Mark|MarkText|SelectedItem|SelectedItemText)\b/;
const forcedColorsState = rule('forced-colors-state', '', (root, fail) => {
  const forced = new Set();
  root.walkRules((r) => {
    if (
      inside(r, (a) => a.name === 'media' && /forced-colors:\s*active/.test(a.params)) &&
      r.some((d) => d.type === 'decl' && SYSTEM_COLOR.test(d.value))
    )
      selectors(r).forEach((s) => forced.add(s));
  });
  root.walkRules((r) => {
    if (inside(r, (a) => a.name === 'media' && /forced-colors/.test(a.params))) return;
    if (!r.some((d) => d.type === 'decl' && /^background(-color)?$/.test(d.prop))) return;
    for (const s of selectors(r))
      if (STATE.test(s) && !forced.has(s))
        fail(
          r,
          `「${s}」は背景色で状態を示しています。@media (forced-colors: active) に同じセレクタで、システムカラー（Highlight など）の指定を加えてください。`,
        );
  });
});

// Spacing sits on the 4px grid. 0 and 1px (a border's width) pass; anything else needs a
// stylelint-disable comment that says why. calc() and var() are left to their inputs.
const SPACING =
  /^(padding|margin)(-(top|right|bottom|left|block|inline)(-(start|end))?)?$|^(row-|column-)?gap$/;
const spacingGrid = rule('spacing-grid', '', (root, fail) => {
  root.walkDecls((decl) => {
    const spacing = SPACING.test(decl.prop) || /^--[\w-]*(padding|gap|space)/.test(decl.prop);
    if (!spacing || decl.value.includes('(')) return;
    for (const [, n] of decl.value.matchAll(/(-?\d*\.?\d+)px\b/g)) {
      const px = Math.abs(parseFloat(n));
      if (px > 1 && px % 4)
        fail(
          decl,
          `${decl.prop}: ${decl.value} の ${n}px は4pxの格子から外れています。4の倍数にするか、光学的な補正なら理由を書いて stylelint-disable-next-line kei/spacing-grid -- 理由 としてください。`,
        );
    }
  });
});

// Content sits on the theme's surfaces; re-pointing them (e.g. to ultramarine) leaves no colour for "pressable".
const surfaceTokens = rule(
  'surface-tokens',
  '面のトークン（--k-bg / --k-surface* / --k-frame* / --k-on-frame*）は kei.tokens のテーマでだけ定義してください。中身の地を別の色にするなら、KeiProvider の theme を入れ子にします。アプリの枠（サイドバー）は --k-frame を使います（Paper ではウルトラマリン）。',
  (root, fail) => {
    root.walkDecls(/^--k-(bg|surface[\w-]*|frame[\w-]*|on-frame[\w-]*)$/, (decl) => {
      if (!inside(decl, (a) => a.name === 'layer' && a.params.trim() === 'kei.tokens')) fail(decl);
    });
  },
);

// Every colour a part draws comes through a token, so a theme (and age, which fades the tokens)
// reaches it. A literal colour outside the themes stays fresh beside faded parts.
const COLOUR =
  /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(|\b(?:white|black|red|green|blue|navy|gray|grey|silver|orange|yellow|purple|pink|brown)\b/i;
const colourTokens = rule(
  'colour-tokens',
  '色は kei.tokens のトークン（var(--k-…)）を通して使ってください。値を直接書くと、テーマや経年の褪色が届きません。透明度だけを使うマスクの #000 は例外です。',
  (root, fail) => {
    root.walkDecls((decl) => {
      if (/^(-webkit-)?mask/.test(decl.prop)) return;
      if (inside(decl, (a) => a.name === 'layer' && a.params.trim() === 'kei.tokens')) return;
      if (COLOUR.test(decl.value.replace(/(['"]).*?\1/g, ''))) fail(decl);
    });
  },
);

export default [
  utilitiesNoSize,
  monoUnicodeRange,
  monoWeights,
  forcedColorsState,
  spacingGrid,
  surfaceTokens,
  colourTokens,
];

// ------------------------------------------------------------- layout gate
// Static half of the layout gate (docs/quality-gate.md); the browser half is src/test/layout.

const disableHint = (name) =>
  `わざと外すときは、直前の行に /* stylelint-disable-next-line kei/${name} -- 理由 */ を書いてください。`;
// Splits a value on top-level spaces, keeping calc(…) and var(…) whole.
const words = (value) => value.match(/(?:[^\s(]+|\([^)]*\))+/g) ?? [];
const inComponents = (decl) =>
  inside(decl, (a) => a.name === 'layer' && /^kei\.(components|utilities)$/.test(a.params.trim()));

// Parts are centred in their box, so the left and right padding must match unless a comment says why.
const paddingSymmetry = rule('padding-symmetry', '', (root, fail) => {
  root.walkRules((r) => {
    if (!inComponents(r)) return;
    const sides = {};
    r.each((d) => {
      if (d.type !== 'decl') return;
      const v = words(d.value);
      if (d.prop === 'padding') [sides.left, sides.right] = [v[3] ?? v[1] ?? v[0], v[1] ?? v[0]];
      if (d.prop === 'padding-inline') [sides.left, sides.right] = [v[0], v[1] ?? v[0]];
      if (d.prop === 'padding-left' || d.prop === 'padding-inline-start') sides.left = d.value;
      if (d.prop === 'padding-right' || d.prop === 'padding-inline-end') sides.right = d.value;
      if (/^padding/.test(d.prop)) sides.decl = d;
    });
    if (!sides.decl || sides.left === sides.right) return;
    const [left, right] = [sides.left ?? 'なし', sides.right ?? 'なし'];
    fail(
      sides.decl,
      `「${r.selector}」の padding は左右が違います（左 ${left}・右 ${right}）。部品の中身は左右の中央に置くので、左右を同じ値にしてください。${disableHint('padding-symmetry')}`,
    );
  });
});

// Heights sit on the 4px grid. 1px and 2px are rules and indicator lines, not boxes.
// `known` lists today's misses in kei.css so they can be fixed one by one; an entry that no
// longer happens is reported, so the list only shrinks.
// (Written with createPlugin directly, because this rule takes options.)
const heightGridCheck = (root, fail, options = {}) => {
  const known = options.known ?? [];
  const used = new Set();
  root.walkDecls(/^(min-|max-)?height$/, (decl) => {
    if (!inComponents(decl) || /\(/.test(decl.value)) return;
    const n = decl.value.match(/^(-?[\d.]+)px$/)?.[1];
    if (n === undefined || [0, 1, 2].includes(Number(n)) || Number(n) % 4 === 0) return;
    const selector = decl.parent.selector;
    const k = known.findIndex((e) => e.selector === selector && e.prop === decl.prop);
    if (k >= 0) return used.add(k);
    const lo = Math.floor(n / 4) * 4;
    fail(
      decl,
      `「${selector}」の ${decl.prop}: ${decl.value} は 4px の倍数ではありません（近いのは ${lo}px か ${lo + 4}px）。高さは 4px の倍数か、操作の高さのトークン --k-control-height（40 / 32px）を使ってください。${disableHint('height-grid')}`,
    );
  });
  if (!root.source?.input.file?.endsWith('src/styles/kei.css')) return;
  known.forEach((e, k) => {
    if (!used.has(k))
      fail(
        root.first ?? root,
        `kei/height-grid の既知の例外「${e.selector} { ${e.prop} }」はもう起きていません。stylelint.config.mjs の一覧から消してください。`,
      );
  });
};
const heightGridRule = (primary, options) => (root, result) => {
  if (!primary) return;
  heightGridCheck(
    root,
    (node, message) => report({ ruleName: 'kei/height-grid', result, node, message }),
    options,
  );
};
heightGridRule.ruleName = 'kei/height-grid';
heightGridRule.messages = ruleMessages('kei/height-grid', {});
heightGridRule.meta = {
  url: 'https://github.com/shiroinock/kei-design-system/blob/main/docs/quality-gate.md',
};
const heightGrid = createPlugin('kei/height-grid', heightGridRule);

export const layoutRules = [paddingSymmetry, heightGrid];
