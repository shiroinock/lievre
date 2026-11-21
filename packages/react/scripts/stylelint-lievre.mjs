// lievre's own stylelint rules. Each one guards a mistake that review has caught before.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import stylelint from 'stylelint';

const {
  createPlugin,
  utils: { report, ruleMessages },
} = stylelint;

function rule(name, message, check) {
  const ruleName = `lievre/${name}`;
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
    url: 'https://github.com/shiroinock/lievre/blob/main/DESIGN.md',
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
  'lievre.utilities のクラスで文字の大きさや行の高さを指定しないでください（部品の指定を上書きします）。下限は lievre.base に置きます。',
  (root, fail) => {
    root.walkDecls(/^(font|font-size|line-height)$/, (decl) => {
      if (inside(decl, (a) => a.name === 'layer' && a.params.trim() === 'lievre.utilities'))
        fail(decl);
    });
  },
);

// Punctuation that Japanese text sets full width must fall through to the Japanese face.
const FULL_WIDTH = [0x2014, 0x2015, 0x2018, 0x2019, 0x201c, 0x201d, 0x2025, 0x2026, 0x3000];
const monoUnicodeRange = rule(
  'mono-unicode-range',
  'Lievre Mono の unicode-range に、日本語で全角に組む約物（— ‘ ’ “ ” ‥ … など）を含めないでください。',
  (root, fail) => {
    root.walkAtRules('font-face', (face) => {
      if (!face.some((d) => d.prop === 'font-family' && /Lievre Mono/.test(d.value))) return;
      face.walkDecls('unicode-range', (decl) => {
        const ranges = decl.value.split(',').map((r) => {
          const [lo, hi = lo] = r.trim().replace(/^U\+/i, '').split('-');
          return [parseInt(lo.replace(/\?/g, '0'), 16), parseInt(hi.replace(/\?/g, 'F'), 16)];
        });
        const hit = FULL_WIDTH.filter((c) => ranges.some(([lo, hi]) => c >= lo && c <= hi));
        if (hit.length)
          fail(
            decl,
            `Lievre Mono の unicode-range が全角の約物 ${hit.map((c) => String.fromCodePoint(c)).join(' ')} を含んでいます。`,
          );
      });
    });
  },
);

// Every --lv-weight-* token needs a real Lievre Mono face, or the browser fakes the weight.
const monoWeights = rule('mono-weights', '', (root, fail) => {
  const faces = [];
  root.walkAtRules('font-face', (face) => {
    if (face.some((d) => d.prop === 'font-family' && /Lievre Mono/.test(d.value)))
      faces.push(face.nodes.find((d) => d.prop === 'font-weight')?.value ?? '400');
  });
  if (!faces.length) return;
  const css = readFileSync(
    createRequire(import.meta.url).resolve('@lievre/tokens/tokens.css'),
    'utf8',
  );
  for (const [, weight] of css.matchAll(/--lv-weight-[\w-]+:\s*(\d+);/g))
    if (!faces.includes(weight))
      fail(
        root.first ?? root,
        `Lievre Mono に font-weight: ${weight} の @font-face がありません。`,
      );
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

// The forced-colors block sits in the utilities layer and resets a part's border with the
// `border` shorthand, so a line shape set in the components layer (a dashed read-only
// outline) is lost there unless the block sets it again.
const LINE_SHAPE = /\b(dashed|dotted|double)\b/;
const forcedColorsBorderStyle = rule('forced-colors-border-style', '', (root, fail) => {
  const isForced = (a) => a.name === 'media' && /forced-colors:\s*active/.test(a.params);
  const reset = new Set();
  const kept = new Set();
  root.walkRules((r) => {
    if (!inside(r, isForced)) return;
    for (const d of r.nodes) {
      if (d.type !== 'decl') continue;
      if (d.prop === 'border')
        selectors(r)
          .filter((s) => /^\.[\w-]+$/.test(s))
          .forEach((s) => reset.add(s));
      if (/^border(-style)?$/.test(d.prop) && LINE_SHAPE.test(d.value))
        selectors(r).forEach((s) => kept.add(s));
    }
  });
  root.walkDecls(/^border(-style)?$/, (decl) => {
    const r = decl.parent;
    if (r.type !== 'rule' || inside(r, isForced) || !LINE_SHAPE.test(decl.value)) return;
    for (const s of selectors(r)) {
      const last = s.split(/[\s>+~]+/).pop();
      const part = [...reset].find((c) => new RegExp(`\\${c}(?![\\w-])`).test(last));
      if (part && !kept.has(s))
        fail(
          decl,
          `「${s}」の線の形（${decl.value}）は、@media (forced-colors: active) の「${part}」の border の一括指定で実線に戻ります。@media (forced-colors: active) に「${s} { border-style: … }」を足してください。`,
        );
    }
  });
});

// A touch pointer raises a part to 44px in @media (pointer: coarse). A rule elsewhere that
// names the same part with more qualifiers (a size, a density) is more specific and would
// pull it back below 44px on touch, so it has to be raised in the coarse block as well.
const COARSE_TARGET = 44;
const coarseTarget = rule('coarse-target', '', (root, fail) => {
  const isCoarse = (a) => a.name === 'media' && /pointer:\s*coarse/.test(a.params);
  const raised = new Set();
  const covered = new Set();
  root.walkRules((r) => {
    if (!inside(r, isCoarse)) return;
    selectors(r).forEach((s) => covered.add(s));
    const h = r.nodes.find((d) => d.type === 'decl' && d.prop === 'min-height');
    if (h && parseFloat(h.value) >= COARSE_TARGET)
      selectors(r)
        .filter((s) => /^\.[\w-]+$/.test(s))
        .forEach((s) => raised.add(s));
  });
  root.walkDecls('min-height', (decl) => {
    const r = decl.parent;
    if (r.type !== 'rule' || inside(r, isCoarse)) return;
    const m = /^(\d*\.?\d+)px$/.exec(decl.value.trim());
    if (!m || parseFloat(m[1]) >= COARSE_TARGET) return;
    for (const s of selectors(r)) {
      const last = s.split(/[\s>+~]+/).pop();
      const part = [...raised].find((c) => s !== c && new RegExp(`\\${c}(?![\\w-])`).test(last));
      if (part && !covered.has(s))
        fail(
          decl,
          `「${s}」は min-height: ${decl.value} で、タッチの @media (pointer: coarse) が「${part}」に付ける ${COARSE_TARGET}px より強く効きます。@media (pointer: coarse) に「${s}」を足して ${COARSE_TARGET}px にしてください。`,
        );
    }
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
          `${decl.prop}: ${decl.value} の ${n}px は4pxの格子から外れています。4の倍数にするか、光学的な補正なら理由を書いて stylelint-disable-next-line lievre/spacing-grid -- 理由 としてください。`,
        );
    }
  });
});

// Content sits on the theme's surfaces; re-pointing them (e.g. to ultramarine) leaves no colour for "pressable".
const surfaceTokens = rule(
  'surface-tokens',
  '面のトークン（--lv-bg / --lv-surface* / --lv-frame* / --lv-on-frame*）は lievre.tokens のテーマでだけ定義してください。中身の地を別の色にするなら、LievreProvider の theme を入れ子にします。アプリの枠（サイドバー）は --lv-frame を使います（Paper ではウルトラマリン）。',
  (root, fail) => {
    root.walkDecls(/^--lv-(bg|surface[\w-]*|frame[\w-]*|on-frame[\w-]*)$/, (decl) => {
      if (!inside(decl, (a) => a.name === 'layer' && a.params.trim() === 'lievre.tokens'))
        fail(decl);
    });
  },
);

// Every colour a part draws comes through a token, so a theme (and age, which fades the tokens)
// reaches it. A literal colour outside the themes stays fresh beside faded parts.
const COLOUR =
  /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(|\b(?:white|black|red|green|blue|navy|gray|grey|silver|orange|yellow|purple|pink|brown)\b/i;
const colourTokens = rule(
  'colour-tokens',
  '色は lievre.tokens のトークン（var(--lv-…)）を通して使ってください。値を直接書くと、テーマや経年の褪色が届きません。透明度だけを使うマスクの #000 は例外です。',
  (root, fail) => {
    root.walkDecls((decl) => {
      if (/^(-webkit-)?mask/.test(decl.prop)) return;
      if (inside(decl, (a) => a.name === 'layer' && a.params.trim() === 'lievre.tokens')) return;
      if (COLOUR.test(decl.value.replace(/(['"]).*?\1/g, ''))) fail(decl);
    });
  },
);

// A coloured band down one side of a box is a decoration that says nothing: it is unclear what it
// marks, and it is a cue made of colour alone. Hairline (1px) dividers on one side pass, and so
// does the accent edge of a state the selector names (a selected row, the current tab), because
// there the edge means "this one is chosen" beside the fill. Several gradient layers (a meter's
// bars) are drawings, not a band.
const ONE_SIDE =
  /^border-(left|right|top|bottom|inline-start|inline-end|block-start|block-end)(-width)?$/;
const px = (word) => {
  if (word === 'thin') return 1;
  if (word === 'medium') return 3;
  if (word === 'thick') return 5;
  const m = /^(-?\d*\.?\d+)(px|r?em)?$/.exec(word);
  if (!m) return undefined;
  return Math.abs(parseFloat(m[1])) * (m[2] ? (m[2] === 'px' ? 1 : 16) : 1);
};
const sideStripeMessage = (s, what) =>
  `「${s}」の ${what} は、片側だけの飾りの帯です。何を示すのかが曖昧で、色だけの合図になります（DESIGN.md）。今のもの・強調するものは、枠全体（border）、見出し、アイコンと文字で示してください。状態の印なら、セレクタに状態（[data-selected]・[aria-current] など）を書きます。区切り線は 1px にします。`;
const sideStripe = rule('side-stripe', '', (root, fail) => {
  root.walkRules((r) => {
    const names = selectors(r).filter((sel) => !STATE.test(sel));
    if (!names.length) return;
    const name = names.join(', ');
    r.each((decl) => {
      if (decl.type !== 'decl') return;
      if (ONE_SIDE.test(decl.prop)) {
        const width = words(decl.value)
          .map(px)
          .find((n) => n !== undefined);
        if (width !== undefined && width > 1)
          fail(decl, sideStripeMessage(name, `${decl.prop}: ${decl.value}`));
        return;
      }
      // An inset shadow pushed to one side, with no blur or spread, draws the same band.
      if (decl.prop === 'box-shadow') {
        for (const layer of decl.value.split(/,(?![^(]*\))/)) {
          const w = words(layer.trim());
          if (!w.includes('inset')) continue;
          const [x = 0, y = 0, blur = 0, spread = 0] = w.map(px).filter((n) => n !== undefined);
          if (blur === 0 && spread === 0 && Math.max(x, y) > 1 && Math.min(x, y) === 0) {
            fail(decl, sideStripeMessage(name, `box-shadow: ${decl.value}`));
            return;
          }
        }
        return;
      }
      if (!/^background(-image)?$/.test(decl.prop)) return;
      const layers = [
        ...decl.value.matchAll(/(?<!-)linear-gradient\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g),
      ];
      if (layers.length !== 1) return;
      const stops = layers[0][1].split(/,(?![^(]*\))/).map((t) => t.trim());
      if (stops.length !== 2 || stops[0] !== stops[1]) return;
      const sizeDecl = r.nodes.find((d) => d.type === 'decl' && d.prop === 'background-size');
      const size = decl.value.includes('/') ? decl.value.split('/').pop() : (sizeDecl?.value ?? '');
      const [w, h] = words(size.trim());
      const thick = (a, b) => b === '100%' && (px(a) ?? 0) > 1;
      if (thick(w, h) || thick(h, w))
        fail(decl, sideStripeMessage(name, `単色のグラデーション（${words(size).join(' ')}）`));
    });
  });
});

export default [
  utilitiesNoSize,
  monoUnicodeRange,
  monoWeights,
  forcedColorsState,
  coarseTarget,
  forcedColorsBorderStyle,
  spacingGrid,
  surfaceTokens,
  colourTokens,
  sideStripe,
];

// ------------------------------------------------------------- layout gate
// Static half of the layout gate (docs/quality-gate.md); the browser half is src/test/layout.

const disableHint = (name) =>
  `わざと外すときは、直前の行に /* stylelint-disable-next-line lievre/${name} -- 理由 */ を書いてください。`;
// Splits a value on top-level spaces, keeping calc(…) and var(…) whole.
const words = (value) => value.match(/(?:[^\s(]+|\([^)]*\))+/g) ?? [];
const inComponents = (decl) =>
  inside(
    decl,
    (a) => a.name === 'layer' && /^lievre\.(components|utilities)$/.test(a.params.trim()),
  );

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
// `known` lists today's misses in lievre.css so they can be fixed one by one; an entry that no
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
      `「${selector}」の ${decl.prop}: ${decl.value} は 4px の倍数ではありません（近いのは ${lo}px か ${lo + 4}px）。高さは 4px の倍数か、操作の高さのトークン --lv-control-height（40 / 32px）を使ってください。${disableHint('height-grid')}`,
    );
  });
  if (!root.source?.input.file?.endsWith('src/styles/lievre.css')) return;
  known.forEach((e, k) => {
    if (!used.has(k))
      fail(
        root.first ?? root,
        `lievre/height-grid の既知の例外「${e.selector} { ${e.prop} }」はもう起きていません。stylelint.config.mjs の一覧から消してください。`,
      );
  });
};
const heightGridRule = (primary, options) => (root, result) => {
  if (!primary) return;
  heightGridCheck(
    root,
    (node, message) => report({ ruleName: 'lievre/height-grid', result, node, message }),
    options,
  );
};
heightGridRule.ruleName = 'lievre/height-grid';
heightGridRule.messages = ruleMessages('lievre/height-grid', {});
heightGridRule.meta = {
  url: 'https://github.com/shiroinock/lievre/blob/main/docs/quality-gate.md',
};
const heightGrid = createPlugin('lievre/height-grid', heightGridRule);

export const layoutRules = [paddingSymmetry, heightGrid];
