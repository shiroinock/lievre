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

export default [utilitiesNoSize, monoUnicodeRange, monoWeights, forcedColorsState, spacingGrid];
