// Measures how evenly lievre parts sit in their boxes, from the rendered page.
// In the browser (Storybook or the demo), run:
//   const { measure } = await import('/scripts/measure-alignment.js');
//   console.table(measure());
// Each row gives the space between the box's padding edge and the ink of what is inside it
// (glyph outlines, icons, dots), so a positive dx means the content leans right, dy down.

const canvas = document.createElement('canvas').getContext('2d');

function fontOf(el) {
  const s = getComputedStyle(el);
  return { css: `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`, size: parseFloat(s.fontSize) };
}

// Glyph bounds from measureText differ by platform: Linux Chromium returns each outline's
// control box, which bulges past the curves by 0.1-0.2px at 14px (を, 削's tail), and rounds it
// to whole pixels. So the ink is found by drawing each character large and reading the pixels
// back. A character's rows depend only on the font, so they are cached; a string's height is
// the union of its characters'. The font's ascent stays at the real size: layout uses that one.
const INK_PX = 256;
const ink = document.createElement('canvas');
ink.width = INK_PX * 2;
ink.height = INK_PX * 2;
const inkCtx = ink.getContext('2d', { willReadFrequently: true });
const glyphs = new Map();
function glyphInk(weight, family, ch) {
  const key = `${weight} ${family} ${ch}`;
  if (!glyphs.has(key)) {
    const baseline = INK_PX * 1.25;
    inkCtx.clearRect(0, 0, ink.width, ink.height);
    inkCtx.font = `${weight} ${INK_PX}px ${family}`;
    inkCtx.textBaseline = 'alphabetic';
    inkCtx.fillText(ch, INK_PX / 2, baseline);
    const { data } = inkCtx.getImageData(0, 0, ink.width, ink.height);
    let top = -1;
    let bottom = -1;
    for (let y = 0; y < ink.height; y++) {
      for (let x = 3; x < ink.width * 4; x += 4) {
        if (data[y * ink.width * 4 + x] < 128) continue;
        if (top < 0) top = y;
        bottom = y + 1;
        break;
      }
    }
    const g = top < 0 ? null : { ascent: baseline - top, descent: bottom - baseline };
    // A web font still loading draws in the fallback: measure again once it has arrived.
    if (!document.fonts.check(inkCtx.font, ch)) return g;
    glyphs.set(key, g);
  }
  return glyphs.get(key);
}

function measureText(el, text) {
  const s = getComputedStyle(el);
  const k = parseFloat(s.fontSize) / INK_PX;
  canvas.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
  const real = canvas.measureText(text);
  let ascent = -Infinity;
  let descent = -Infinity;
  for (const ch of new Set(text)) {
    const g = glyphInk(s.fontWeight, s.fontFamily, ch);
    if (!g) continue;
    ascent = Math.max(ascent, g.ascent);
    descent = Math.max(descent, g.descent);
  }
  return {
    width: real.width,
    actualBoundingBoxAscent: ascent === -Infinity ? 0 : ascent * k,
    actualBoundingBoxDescent: descent === -Infinity ? 0 : descent * k,
    fontBoundingBoxAscent: real.fontBoundingBoxAscent,
    fontBoundingBoxDescent: real.fontBoundingBoxDescent,
  };
}

// The first line's baseline. A text range's box is the primary font's ascent + descent,
// so the baseline sits one ascent below its top. (A probe element would become a flex item.)
function baselineOf(textNode) {
  const range = document.createRange();
  range.selectNodeContents(textNode);
  const first = [...range.getClientRects()].find((r) => r.width > 0);
  const m = measureText(textNode.parentElement, textNode.textContent.trim() || 'x');
  return first.top + m.fontBoundingBoxAscent;
}

// Text can also be placed by its face instead of its ink: the Japanese em box (1em tall, its
// middle FACE_MIDDLE above the baseline). Lievre Sans and Lievre Term JP put this box in the middle
// of the line box (DESIGN.md「書体」), so a box whose face is off centre has uneven padding or a
// font that lost its correction; the ink also moves with the glyphs (lowercase, figures).
export const FACE_MIDDLE = 0.38;
function faceOf(el, base) {
  const size = parseFloat(getComputedStyle(el).fontSize);
  return { top: base - (FACE_MIDDLE + 0.5) * size, bottom: base - (FACE_MIDDLE - 0.5) * size };
}

function textInk(node, face = false) {
  const text = node.textContent.replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const range = document.createRange();
  range.selectNodeContents(node);
  const rects = [...range.getClientRects()].filter((r) => r.width > 0);
  if (!rects.length) return null;
  const m = measureText(node.parentElement, text);
  const base = baselineOf(node);
  const last = rects.at(-1);
  const box = face
    ? faceOf(node.parentElement, base)
    : { top: base - m.actualBoundingBoxAscent, bottom: base + m.actualBoundingBoxDescent };
  // Later lines share the first line's ink metrics, shifted by their own offset.
  return {
    left: Math.min(...rects.map((r) => r.left)),
    right: Math.max(...rects.map((r) => r.right)),
    top: box.top,
    bottom: box.bottom + (last.top - rects[0].top),
    base,
  };
}

// Input values are not text nodes: place their line box from the content box instead.
function inputInk(el, face = false) {
  const text = el.value || el.placeholder;
  if (!text) return null;
  const s = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const m = measureText(el, text);
  const padT = parseFloat(s.paddingTop) + parseFloat(s.borderTopWidth);
  const padB = parseFloat(s.paddingBottom) + parseFloat(s.borderBottomWidth);
  const lineH = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.2;
  const contentH = r.height - padT - padB;
  const lineTop = r.top + padT + (el.tagName === 'TEXTAREA' ? 0 : (contentH - lineH) / 2);
  const half = (lineH - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2;
  const base = lineTop + half + m.fontBoundingBoxAscent;
  const left = r.left + parseFloat(s.paddingLeft) + parseFloat(s.borderLeftWidth);
  const box = face
    ? faceOf(el, base)
    : { top: base - m.actualBoundingBoxAscent, bottom: base + m.actualBoundingBoxDescent };
  return { left, right: left + m.width, ...box, base };
}

const drawn = (el) => {
  const s = getComputedStyle(el);
  return (
    el instanceof SVGSVGElement ||
    ['IMG', 'INPUT', 'CANVAS'].includes(el.tagName) ||
    (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent') ||
    parseFloat(s.borderTopWidth) > 0
  );
};

// An icon is measured by its own square, even when its box is stretched to a line's height.
function svgInk(el) {
  if (!(el instanceof SVGSVGElement)) return null;
  const r = el.getBoundingClientRect();
  if (r.height <= r.width) return r;
  const mid = r.top + r.height / 2;
  return {
    left: r.left,
    right: r.right,
    top: mid - r.width / 2,
    bottom: mid + r.width / 2,
    width: r.width,
    height: r.width,
  };
}

function union(a, b) {
  if (!a) return b;
  if (!b) return a;
  return {
    left: Math.min(a.left, b.left),
    right: Math.max(a.right, b.right),
    top: Math.min(a.top, b.top),
    bottom: Math.max(a.bottom, b.bottom),
    base: a.base ?? b.base,
  };
}

function inkInside(el, face) {
  let ink = null;
  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) ink = union(ink, textInk(child, face));
    else if (child.nodeType === Node.ELEMENT_NODE) {
      const s = getComputedStyle(child);
      if (s.display === 'none' || s.visibility === 'hidden' || s.position === 'absolute') continue;
      if (child.classList.contains('lv-sr-only')) continue;
      if (drawn(child)) {
        const r = svgInk(child) ?? child.getBoundingClientRect();
        if (r.width && r.height) ink = union(ink, r);
      } else ink = union(ink, inkInside(child, face));
    }
  }
  return ink;
}

const round = (n) => Math.round(n * 10) / 10;

// Space from the padding edge to the ink on each side. With `{ face: true }`, text counts by
// its Japanese em box instead of its ink (icons and other drawn boxes are the same either way).
export function inset(el, { face = false } = {}) {
  const ink = el.matches('input, textarea') ? inputInk(el, face) : inkInside(el, face);
  if (!ink) return null;
  const r = el.getBoundingClientRect();
  const s = getComputedStyle(el);
  const l = ink.left - r.left - parseFloat(s.borderLeftWidth);
  const rt = r.right - parseFloat(s.borderRightWidth) - ink.right;
  const t = ink.top - r.top - parseFloat(s.borderTopWidth);
  const b = r.bottom - parseFloat(s.borderBottomWidth) - ink.bottom;
  return {
    w: round(r.width),
    h: round(r.height),
    l: round(l),
    r: round(rt),
    t: round(t),
    b: round(b),
    dx: round((l - rt) / 2),
    dy: round((t - b) / 2),
  };
}

// Where an icon or control sits against the text beside it: 0 means its centre is on
// the centre of the text's x-height band (Latin) or em box (Japanese).
export function iconOffset(icon, textEl) {
  const node = [...textEl.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
  const textNode =
    node ??
    document
      .createTreeWalker(textEl, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => (n.textContent.trim() ? 1 : 3),
      })
      .nextNode();
  if (!textNode) return null;
  const base = baselineOf(textNode);
  const { size } = fontOf(textNode.parentElement);
  const cjk = /[぀-ヿ一-鿿]/.test(textNode.textContent);
  const m = measureText(textNode.parentElement, cjk ? '国' : 'x');
  // Japanese: centre of the ideographic face; Latin: half the x-height.
  const centre = cjk
    ? base - (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2
    : base - m.actualBoundingBoxAscent / 2;
  const r = icon.getBoundingClientRect();
  return { dy: round(r.top + r.height / 2 - centre), size };
}

export const PARTS = [
  '.lv-button',
  '.lv-icon-button',
  '.lv-badge',
  '.lv-input',
  '.lv-select-trigger',
  '.lv-select-item',
  '.lv-tab',
  '.lv-tab-count',
  '.lv-kbd',
  '.lv-avatar',
  '.lv-tooltip',
  '.lv-alert',
  '.lv-toast',
  '.lv-checkbox',
  '.lv-switch',
  '.lv-table th',
  '.lv-table td',
  '.lv-table-detail',
  '.lv-pagination button',
  '.lv-card',
  '.lv-dialog',
  '.lv-dialog-footer',
  '.lv-select-content',
  '.lv-table-sort',
  '.lv-empty',
  '.lv-metric',
  '.lv-dialog-footer',
  '.main-nav button',
  '.theme-segment button',
];

// One row per part (the first visible instance of each variant).
export function measure(selectors = PARTS, root = document) {
  const rows = [];
  for (const sel of selectors) {
    const seen = new Set();
    for (const el of root.querySelectorAll(sel)) {
      if (!el.getClientRects().length) continue;
      const key = sel + ' ' + [...el.classList].filter((c) => c.includes('--')).join(' ');
      if (seen.has(key)) continue;
      const m = inset(el);
      if (!m) continue;
      seen.add(key);
      rows.push({ part: key.trim(), text: el.textContent.trim().slice(0, 12), ...m });
    }
  }
  return rows;
}

// Icons and controls against the first line of the text next to them.
export function measureIcons(root = document) {
  const rows = [];
  const pairs = [
    ['.lv-button', 'svg'],
    ['.lv-alert', ':scope > svg'],
    ['.lv-toast', ':scope > svg'],
    ['.lv-tab', 'svg'],
    ['.lv-select-trigger', ':scope > svg'],
    ['.lv-select-item', 'svg'],
    ['.lv-badge', '.lv-status-dot'],
    ['.lv-check-field', '.lv-checkbox'],
    ['.lv-radio-option', 'input'],
    ['.lv-metric-change', 'svg'],
    ['.lv-table-sort', 'svg'],
    ['.lv-table-detail', 'svg'],
    ['.main-nav button', 'svg'],
    ['.theme-segment button', 'svg'],
    ['.lv-empty', '.lv-empty-icon'],
  ];
  for (const [host, iconSel] of pairs) {
    const el = [...root.querySelectorAll(host)].find(
      (h) => h.getClientRects().length && h.querySelector(iconSel),
    );
    if (!el) continue;
    const icon = el.querySelector(iconSel);
    const texts = [...el.querySelectorAll('*')].filter(
      (e) =>
        !e.contains(icon) &&
        !icon.contains(e) &&
        [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()),
    );
    const textEl = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
      ? el
      : texts[0];
    if (!textEl) continue;
    const o = iconOffset(icon, textEl);
    if (o) rows.push({ part: `${host} ${iconSel}`, ...o });
  }
  return rows;
}

const selectorOf = (el) =>
  el.tagName.toLowerCase() + [...el.classList].map((c) => '.' + c).join('');

// Every drawn box (background or border) whose top and bottom, or left and right, ink
// insets differ by more than `tolerance` px. Wide boxes are only checked vertically.
export function audit(root = document, tolerance = 2) {
  const rows = [];
  const seen = new Set();
  for (const el of root.querySelectorAll('.lievre *')) {
    if (el instanceof SVGElement || !el.getClientRects().length || !drawn(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.height > 160 || r.height < 12) continue;
    const key = selectorOf(el);
    if (seen.has(key)) continue;
    const m = inset(el);
    if (!m) continue;
    seen.add(key);
    const s = getComputedStyle(el);
    const centred = s.justifyContent === 'center' || s.textAlign === 'center';
    const off = Math.abs(m.t - m.b) > tolerance || (centred && Math.abs(m.l - m.r) > tolerance);
    if (off) rows.push({ part: key, text: el.textContent.trim().slice(0, 12), ...m });
  }
  return rows;
}
