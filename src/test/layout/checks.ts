// Measures one declared part in the rendered page and says, in Japanese, what is off and by how much.
import { inset } from '../../../scripts/measure-alignment.js';
import { CRITERIA, checkId, type LayoutCheck, type LayoutPart } from './declare';

export type Violation = { part: string; check: string; element: string; message: string };

const r1 = (n: number) => Math.round(n * 10) / 10;
const px = (n: number) => `${r1(n)}px`;
const visible = (el: Element) => el.getClientRects().length > 0;

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

function checkOne(el: Element, check: LayoutCheck): string | null {
  const s = getComputedStyle(el);
  const box = el.getBoundingClientRect();
  const fontSize = parseFloat(s.fontSize);

  if (check === 'inset-x' || check === 'inset-y') {
    const m = inset(el);
    if (!m) return null;
    if (check === 'inset-x') {
      if (Math.abs(m.dx) <= CRITERIA.insetX) return null;
      return `中身が左右の中央から ${px(Math.abs(m.dx))} ${m.dx > 0 ? '右' : '左'}に寄っています（左の余白 ${px(m.l)}・右の余白 ${px(m.r)}）。基準：左右の余白の差の半分が ${CRITERIA.insetX}px 以内。`;
    }
    const limit = CRITERIA.insetYEm * fontSize;
    if (Math.abs(m.dy) <= limit + 0.05) return null;
    return `中身が上下の中央から ${px(Math.abs(m.dy))} ${m.dy > 0 ? '下' : '上'}に寄っています（上の余白 ${px(m.t)}・下の余白 ${px(m.b)}）。基準：上下の余白の差の半分が ${CRITERIA.insetYEm}em（${px(limit)}）以内。`;
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

  if (check === 'padding-equal') {
    const sides = ['Top', 'Right', 'Bottom', 'Left'].map((k) =>
      parseFloat(s.getPropertyValue(`padding-${k.toLowerCase()}`)),
    );
    if (Math.max(...sides) - Math.min(...sides) <= CRITERIA.size) return null;
    return `padding が上 ${px(sides[0])}・右 ${px(sides[1])}・下 ${px(sides[2])}・左 ${px(sides[3])} です。基準：パネルの padding は上下左右で同じ値。`;
  }

  if (check === 'fits') {
    // Glyphs may rise above a tight line box without harm; they are only cut where the box clips.
    const over = el.scrollWidth - el.clientWidth;
    const down = s.overflowY === 'visible' ? 0 : el.scrollHeight - el.clientHeight;
    if (over <= 0 && down <= 0) return null;
    return `中身がはみ出しています（${[over > 0 && `横に ${over}px`, down > 0 && `縦に ${down}px`].filter(Boolean).join('・')}）。基準：scrollWidth・scrollHeight が clientWidth・clientHeight を超えない。文字を折り返すか、幅を中身に合わせてください。`;
  }

  if ('padding' in check) {
    const ratio = CRITERIA.paddingRatio[check.padding];
    const want = Math.round((box.height * ratio) / CRITERIA.grid) * CRITERIA.grid;
    const l = parseFloat(s.paddingLeft);
    const r = parseFloat(s.paddingRight);
    if (Math.abs(l - want) <= CRITERIA.size && Math.abs(r - want) <= CRITERIA.size) return null;
    return `左右の padding が左 ${px(l)}・右 ${px(r)} です。基準：高さ ${px(box.height)} の${check.padding === 'button' ? 'ボタン' : '入力欄'}は ${want}px（高さ×${ratio} を ${CRITERIA.grid}px に丸めた値）。`;
  }

  if ('icon' in check) {
    const problems: string[] = [];
    for (const icon of el.querySelectorAll(check.icon)) {
      if (!visible(icon)) continue;
      const textRoot = check.text ? el.querySelector(check.text) : el;
      const text = textRoot && firstText(textRoot, icon);
      const line = text && firstLineCentre(text);
      if (!text || line == null) continue;
      const r = icon.getBoundingClientRect();
      const dy = (r.top + r.bottom) / 2 - line;
      if (Math.abs(dy) <= CRITERIA.icon) continue;
      problems.push(
        `${describe(icon)} の縦の中心が、文字「${text.textContent!.trim().slice(0, 12)}」の1行目の行ボックスの中心より ${px(Math.abs(dy))} ${dy > 0 ? '下' : '上'}にあります。基準：${CRITERIA.icon}px 以内。`,
      );
    }
    return problems.length ? problems.join(' ') : null;
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
    .filter((el) => visible(el) && el.closest('.kei'))
    .filter((el) => !parts.some((p) => el.closest(p.selector)))
    .map(describe);
}
