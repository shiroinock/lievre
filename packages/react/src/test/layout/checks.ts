// Measures one declared part in the rendered page and says, in Japanese, what is off and by how much.
import { inset } from '../../../scripts/measure-alignment.js';
import { CRITERIA, checkId, type LayoutCheck, type LayoutPart } from './declare';

export type Violation = { part: string; check: string; element: string; message: string };

const r1 = (n: number) => Math.round(n * 10) / 10;
const px = (n: number) => `${r1(n)}px`;
// Text kept only for screen readers (VisuallyHidden, .lv-sr-only) sits in a box clipped to 1px:
// it is not on the screen, so no check measures it.
const clippedAway = (el: Element) => {
  for (let a: Element | null = el; a && a !== document.body; a = a.parentElement) {
    const r = a.getBoundingClientRect();
    if (r.width <= 1 && r.height <= 1 && getComputedStyle(a).overflow !== 'visible') return true;
  }
  return false;
};
const visible = (el: Element) => el.getClientRects().length > 0 && !clippedAway(el);

export function describe(el: Element) {
  const classes = [...el.classList].map((c) => `.${c}`).join('');
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 12);
  return `${el.tagName.toLowerCase()}${classes}${text ? `「${text}」` : ''}`;
}

// The first text node outside `skip`, so an icon's own <title> or a nested badge is not used.
function firstText(root: Element, skip?: Element) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.textContent?.trim() && !(skip && skip.contains(n)) && visible(n.parentElement!)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP,
  });
  return walker.nextNode() as Text | null;
}

// A text fragment's box is its font's ascent + descent; leading is split evenly above and
// below, so its centre is also the centre of the line box it sits on.
export function firstLineCentre(text: Text) {
  const range = document.createRange();
  range.selectNodeContents(text);
  const first = [...range.getClientRects()].find((r) => r.width > 0);
  return first ? (first.top + first.bottom) / 2 : null;
}

// The first line's baseline: a text fragment's box is its font's ascent + descent, so the
// baseline sits one ascent below the top.
const canvas = document.createElement('canvas').getContext('2d')!;
export function baselineOf(text: Text) {
  const range = document.createRange();
  range.selectNodeContents(text);
  const first = [...range.getClientRects()].find((r) => r.width > 0);
  if (!first) return null;
  const s = getComputedStyle(text.parentElement!);
  canvas.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
  return first.top + canvas.measureText(text.textContent!.trim() || 'x').fontBoundingBoxAscent;
}

const MARKS = 'path, polyline, polygon, line, rect, circle, ellipse, text';

function checkOne(el: Element, check: LayoutCheck): string | null {
  const s = getComputedStyle(el);
  const box = el.getBoundingClientRect();
  const fontSize = parseFloat(s.fontSize);

  if (check === 'inset-x' || check === 'inset-y') {
    if (check === 'inset-x') {
      const m = inset(el);
      if (!m) return null;
      if (Math.abs(m.dx) <= CRITERIA.insetX) return null;
      return `中身が左右の中央から ${px(Math.abs(m.dx))} ${m.dx > 0 ? '右' : '左'}に寄っています（左の余白 ${px(m.l)}・右の余白 ${px(m.r)}）。基準：左右の余白の差の半分が ${CRITERIA.insetX}px 以内。`;
    }
    const m = inset(el, { face: true });
    if (!m) return null;
    if (Math.abs(m.dy) <= CRITERIA.insetY) return null;
    return `中身が上下の中央から ${px(Math.abs(m.dy))} ${m.dy > 0 ? '下' : '上'}に寄っています（文字は日本語の字面の枠で測って、上の余白 ${px(m.t)}・下の余白 ${px(m.b)}）。基準：上下の余白の差の半分が ${CRITERIA.insetY}px 以内。padding が上下で同じか、行の高さが 4px に乗っているか、書体が Lievre Sans・Lievre Term JP（@lievre/react/fonts.css）か確かめてください。`;
  }

  if (check === 'control-height') {
    const ok = [...CRITERIA.controlHeights, CRITERIA.coarseControlHeight].some(
      (h) => Math.abs(box.height - h) <= CRITERIA.size,
    );
    if (ok) return null;
    return `高さが ${px(box.height)} です。基準：操作の高さ ${CRITERIA.controlHeights.join(' / ')}px（タッチは ${CRITERIA.coarseControlHeight}px）のどれか。`;
  }

  if (check === 'grid-height') {
    const off = box.height % CRITERIA.grid;
    if (Math.min(off, CRITERIA.grid - off) <= CRITERIA.size) return null;
    return `高さが ${px(box.height)} です。基準：${CRITERIA.grid}px の倍数（近いのは ${Math.floor(box.height / 4) * 4}px か ${Math.ceil(box.height / 4) * 4}px）。`;
  }

  if (check === 'square') {
    if (Math.abs(box.width - box.height) <= CRITERIA.size) return null;
    return `幅 ${px(box.width)}・高さ ${px(box.height)} で、正方形になっていません。基準：幅と高さの差が ${CRITERIA.size}px 以内。padding ではなく width と height で大きさを決めてください。`;
  }

  if (check === 'focus-room') {
    // The ring is drawn outside the box, so any ancestor that clips its overflow must leave room.
    const ring = CRITERIA.focusRing;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const as = getComputedStyle(a);
      if (as.overflowX === 'visible' && as.overflowY === 'visible') continue;
      const r = a.getBoundingClientRect();
      const inner = {
        left: r.left + parseFloat(as.borderLeftWidth),
        right: r.right - parseFloat(as.borderRightWidth),
        top: r.top + parseFloat(as.borderTopWidth),
        bottom: r.bottom - parseFloat(as.borderBottomWidth),
      };
      const cut = [
        ['左', box.left - ring - inner.left],
        ['右', inner.right - (box.right + ring)],
        ['上', box.top - ring - inner.top],
        ['下', inner.bottom - (box.bottom + ring)],
      ].filter(([, room]) => (room as number) < -CRITERIA.size);
      if (cut.length)
        return `フォーカスの輪郭が、はみ出しを切る親 ${describe(a)} に${cut.map(([side, room]) => `${side}で ${px(-(room as number))}`).join('・')} 切られます。基準：要素の外に ${ring}px（輪郭 2px と隙間 2px）の余地がある。親の padding を空けるか、overflow を visible にしてください。`;
    }
    return null;
  }

  if (check === 'line-grid') {
    const inner =
      box.height -
      ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'].reduce(
        (sum, k) => sum + parseFloat(s[k as 'paddingTop']),
        0,
      );
    const off = inner % CRITERIA.grid;
    if (Math.min(off, CRITERIA.grid - off) <= CRITERIA.line) return null;
    // Either the line-height itself is off the grid, or text in another face or size on the
    // same line pushes the line box past it.
    const lh = parseFloat(s.lineHeight);
    const lines = Math.max(1, Math.round(inner / lh));
    const faces = new Set<string>();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent?.trim()) continue;
      const t = getComputedStyle(n.parentElement!);
      faces.add(`${t.fontFamily.split(',')[0].replace(/["']/g, '')} ${t.fontSize}`);
    }
    const mixed =
      inner > lines * lh + CRITERIA.line && faces.size > 1
        ? `line-height は ${px(lh)} ですが、同じ行に ${[...faces].join('・')} の文字が混ざり、行の箱がそれより高くなっています。混ぜた側（等幅の数字・単位など）の line-height を小さく（1 など）するか、行の高さを 4px に丸めてください。`
        : `line-height が ${px(lh)} です。4px の倍数になるトークン（--lv-line-tight・--lv-line-body）を使ってください。`;
    return `行の箱の高さが ${px(inner)} で、${CRITERIA.grid}px の倍数から ${px(Math.min(off, CRITERIA.grid - off))} ずれています。基準：${CRITERIA.grid}px の倍数（差 ${CRITERIA.line}px 以内）。${mixed}`;
  }

  if (check === 'padding-equal') {
    const sides = ['Top', 'Right', 'Bottom', 'Left'].map((k) =>
      parseFloat(s.getPropertyValue(`padding-${k.toLowerCase()}`)),
    );
    if (Math.max(...sides) - Math.min(...sides) <= CRITERIA.size) return null;
    return `padding が上 ${px(sides[0])}・右 ${px(sides[1])}・下 ${px(sides[2])}・左 ${px(sides[3])} です。基準：パネルの padding は上下左右で同じ値。`;
  }

  if (check === 'action-band') {
    const [t, r, b, l] = ['Top', 'Right', 'Bottom', 'Left'].map((k) =>
      parseFloat(s.getPropertyValue(`padding-${k.toLowerCase()}`)),
    );
    // The band's sides line up with the section above it (the panel's body).
    const above = el.previousElementSibling;
    const side = above ? parseFloat(getComputedStyle(above).paddingLeft) : l;
    const near = (a: number, want: number) => Math.abs(a - want) <= CRITERIA.size;
    if (near(t, CRITERIA.bandY) && near(b, CRITERIA.bandY) && near(l, side) && near(r, side))
      return null;
    return `padding が上 ${px(t)}・右 ${px(r)}・下 ${px(b)}・左 ${px(l)} です。基準：操作の帯は上下 ${CRITERIA.bandY}px、左右は上の区画と同じ ${px(side)}。`;
  }

  if (check === 'fits') {
    // Glyphs may rise above a tight line box without harm; they are only cut where the box clips.
    const over = el.scrollWidth - el.clientWidth;
    const down = s.overflowY === 'visible' ? 0 : el.scrollHeight - el.clientHeight;
    if (over <= 0 && down <= 0) return null;
    return `中身がはみ出しています（${[over > 0 && `横に ${over}px`, down > 0 && `縦に ${down}px`].filter(Boolean).join('・')}）。基準：scrollWidth・scrollHeight が clientWidth・clientHeight を超えない。文字を折り返すか、幅を中身に合わせてください。`;
  }

  if (check === 'fills-x') {
    const marks = [...el.querySelectorAll(MARKS)]
      .filter(visible)
      .map((m) => m.getBoundingClientRect());
    if (!marks.length) return null;
    const left =
      Math.min(...marks.map((m) => m.left)) -
      (box.left + parseFloat(s.paddingLeft) + parseFloat(s.borderLeftWidth));
    const right =
      box.right -
      parseFloat(s.paddingRight) -
      parseFloat(s.borderRightWidth) -
      Math.max(...marks.map((m) => m.right));
    if (Math.max(left, right) <= CRITERIA.fill) return null;
    return `描いた中身が箱の幅いっぱいに広がっていません（箱の幅 ${px(box.width)}、左に ${px(left)}・右に ${px(right)} の空き）。基準：左右の空きが ${CRITERIA.fill}px 以内。svg なら viewBox の縦横比に縛られていないか（preserveAspectRatio）を確かめてください。`;
  }

  if ('padding' in check) {
    const ratio = CRITERIA.paddingRatio[check.padding];
    const want = Math.round((box.height * ratio) / CRITERIA.grid) * CRITERIA.grid;
    const l = parseFloat(s.paddingLeft);
    const r = parseFloat(s.paddingRight);
    if (Math.abs(l - want) <= CRITERIA.size && Math.abs(r - want) <= CRITERIA.size) return null;
    return `左右の padding が左 ${px(l)}・右 ${px(r)} です。基準：高さ ${px(box.height)} の${check.padding === 'button' ? 'ボタン' : '入力欄'}は ${want}px（高さ×${ratio} を ${CRITERIA.grid}px に丸めた値）。`;
  }

  if ('baseline' in check) {
    const items = [...el.querySelectorAll(check.baseline)]
      .filter(visible)
      .map((item) => ({ item, text: firstText(item) }))
      .filter((x): x is { item: Element; text: Text } => !!x.text);
    // Only items that share a line with the first one are compared.
    const top = items[0]?.item.getBoundingClientRect();
    const row = items.filter(({ item }) => {
      const r = item.getBoundingClientRect();
      return top && r.top < top.bottom && r.bottom > top.top;
    });
    const lines = row.map(({ item, text }) => ({ item, text, base: baselineOf(text) ?? 0 }));
    const bases = lines.map((l) => l.base);
    if (lines.length < 2 || Math.max(...bases) - Math.min(...bases) <= CRITERIA.baseline)
      return null;
    const list = lines
      .map(({ item, text, base }, n) => {
        const size = getComputedStyle(text.parentElement!).fontSize;
        const off = n === 0 ? 'を基準に' : `${base > bases[0] ? '+' : ''}${r1(base - bases[0])}px`;
        return `${describe(item)}（${size}）${off}`;
      })
      .join('、');
    return `同じ行の文字のベースラインがそろっていません：${list}。基準：差が ${CRITERIA.baseline}px 以内。flex なら align-items: baseline にしてください。`;
  }

  if ('icon' in check) {
    const problems: string[] = [];
    for (const icon of el.querySelectorAll(check.icon)) {
      if (!visible(icon)) continue;
      const textRoot = check.text ? el.querySelector(check.text) : el;
      const text = textRoot && firstText(textRoot, icon);
      let line = text && firstLineCentre(text);
      if (check.block && textRoot) {
        const box = textRoot.getBoundingClientRect();
        line = (box.top + box.bottom) / 2;
      }
      if (!text || line == null) continue;
      const r = icon.getBoundingClientRect();
      const dy = (r.top + r.bottom) / 2 - line;
      if (Math.abs(dy) <= CRITERIA.icon) continue;
      const target = check.block
        ? `文字のまとまり「${(textRoot!.textContent ?? '').trim().slice(0, 12)}」の中心`
        : `文字「${text.textContent!.trim().slice(0, 12)}」の1行目の行ボックスの中心`;
      problems.push(
        `${describe(icon)} の縦の中心が、${target}より ${px(Math.abs(dy))} ${dy > 0 ? '下' : '上'}にあります。基準：${CRITERIA.icon}px 以内。`,
      );
    }
    return problems.length ? problems.join(' ') : null;
  }

  if ('textEdge' in check) {
    const start = check.textEdge === 'start';
    const edges = [...el.querySelectorAll(check.of)]
      .filter(visible)
      .map((item) => {
        const range = document.createRange();
        range.selectNodeContents(item);
        const rects = [...range.getClientRects()].filter((r) => r.width > 0);
        if (!rects.length) return null;
        return {
          item,
          x: start ? Math.min(...rects.map((r) => r.left)) : Math.max(...rects.map((r) => r.right)),
        };
      })
      .filter((e): e is { item: Element; x: number } => !!e);
    const xs = edges.map((e) => e.x);
    if (edges.length < 2 || Math.max(...xs) - Math.min(...xs) <= CRITERIA.size) return null;
    const list = edges
      .map(
        ({ item, x }, n) =>
          `${describe(item)} ${n === 0 ? 'を基準に' : `${x > xs[0] ? '+' : ''}${r1(x - xs[0])}px`}`,
      )
      .join('、');
    return `文字の${start ? '左端' : '右端'}がそろっていません：${list}。基準：差が ${CRITERIA.size}px 以内。アイコンの列は中身がなくても同じ幅を取ってください。`;
  }

  const items = [...el.querySelectorAll(check.sameHeight)].filter(visible);
  const heights = items.map((i) => i.getBoundingClientRect().height);
  if (items.length < 2 || Math.max(...heights) - Math.min(...heights) <= CRITERIA.size) return null;
  return `並んだ部品の高さが揃っていません：${items.map((i, n) => `${describe(i)} ${px(heights[n])}`).join('、')}。基準：差が ${CRITERIA.size}px 以内。`;
}

/** 宣言された部品を root の中から探して測る。見つかった数も返す。 */
export function checkPart(part: LayoutPart, root: ParentNode = document) {
  const violations: Violation[] = [];
  const elements = [...root.querySelectorAll(part.selector)].filter(visible);
  for (const el of elements)
    for (const check of part.checks) {
      const message = checkOne(el, check);
      if (message)
        violations.push({ part: part.name, check: checkId(check), element: describe(el), message });
    }
  return { found: elements.length, violations };
}

const INTERACTIVE =
  'button, input, select, textarea, a[href], [role="tab"], [role="switch"], [role="checkbox"], [role="combobox"], [role="option"], [role="radio"]';

/** 操作できる要素のうち、どの部品の宣言にも入っていないもの。 */
export function undeclared(parts: LayoutPart[], root: ParentNode = document) {
  return [...root.querySelectorAll(INTERACTIVE)]
    .filter((el) => visible(el) && el.closest('.lievre'))
    .filter((el) => !parts.some((p) => el.closest(p.selector)))
    .map(describe);
}
