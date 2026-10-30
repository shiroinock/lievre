// Age: a fourth axis beside theme, density and typography (<LievreProvider age="light">). Parts are
// never aged one by one. A few materials are made here, as tokens and custom properties, and each
// part takes them through the tokens it already uses or the selectors in AGE_PLACES:
//   fade    every colour token loses colour toward an old-paper yellow grey (OKLab, at its own
//           lightness): inks and tints fully, the paper, lines and text by half. One amount for
//           the whole theme, stopped where any pairing would drop below WCAG AA
//   mottle  filled faces take the paper back in blotches where the ink did not hold
//   rules   1px lines thin and thicken along their length, and break now and then
//   chips   corners lose a small irregular piece
// States stay outside age: the focus outline, the selection marks (the selected row's leading
// edge, the active tab) and error marks keep the fresh inks, and nothing aged is ever drawn on a
// disabled control.
import { hash32, mulberry32, noise2, seedFor } from './seed.mjs';
import { encodeIndexedPng } from './png.mjs';
import { mix, ratio, resolve, themeTokens, wornBackgrounds } from './contrast.mjs';
import { fade } from './oklch.mjs';
import { TILE, VARIANTS } from './presets.mjs';
import { THEMES } from './textures.mjs';

export const AGES = ['none', 'light', 'heavy'];
/** How much of each material a level takes; config.age holds the heavy values. */
export const AGE_SCALE = { light: 0.5, heavy: 1 };
/**
 * The tokens that fade, by how much of the amount they take. Every colour token a part can read is
 * here, so no part keeps a fresh colour beside faded ones; only the translucent overlay is not.
 */
export const FADE_GROUPS = {
  inks: {
    share: 1,
    names: ['accent', 'accent-hover', 'success', 'warning', 'danger', 'info'],
  },
  tints: {
    share: 1,
    names: [
      'accent-soft',
      'selected',
      'success-soft',
      'warning-soft',
      'danger-soft',
      'info-soft',
      'skeleton',
    ],
  },
  frame: {
    share: 1,
    names: ['frame', 'frame-hover', 'frame-inset', 'frame-line'],
  },
  neutrals: {
    share: 0.5,
    names: [
      'bg',
      'surface',
      'surface-raised',
      'surface-sunken',
      'text',
      'muted',
      'subtle',
      'border',
      'border-strong',
      'on-accent',
      'on-danger',
      'on-frame',
      'frame-muted',
      'frame-selected',
      'on-frame-selected',
    ],
  },
};
export const FADED = Object.values(FADE_GROUPS).flatMap((g) => g.names);
/** Inks a state mark keeps fresh. */
export const STATE_INKS = FADE_GROUPS.inks.names;
/**
 * Marks drawn with the fresh inks inside an aged scope: the focus outline (through --lv-focus), the
 * selected row's leading edge and its checkbox, the active tab's underline, and error marks.
 */
export const AGE_STATES = [
  'tr[data-selected] > :first-child',
  "[role='tab'][data-state='active']",
  "[aria-invalid='true']",
  '.lv-field-error',
  "[data-tone='error']",
];

/**
 * Where each material goes, and how strongly (a share of the level's value). Headings, meters,
 * empty states and cards can take a lot; tables and inputs at 13–14px take little. A new part
 * joins by adding its selector here, or by carrying one of the lv-age-* classes.
 */
export const AGE_PLACES = {
  card: { selectors: ['.lv-card', '.lv-age-sheet'], rules: 1, chips: 1 },
  fill: {
    selectors: ['.lv-button--primary', '.lv-button--danger', '.lv-age-fill'],
    mottle: 1,
  },
  control: { selectors: ['.lv-button', '.lv-age-corner'], chips: 0.35 },
  table: { selectors: ['.lv-table tbody tr:not(:last-child) td', '.lv-age-rule'], rules: 0.7 },
};

/** The mottle is smooth, so it is stored at half the tile and drawn at the full tile. */
const MOTTLE = TILE / 2;
/** Size of the corner chip images, in pixels. */
export const CHIP = 32;
const CORNERS = ['tl', 'tr', 'br', 'bl'];

const amountFor = (config, level, material, place = 1) =>
  (config.age[material] ?? 0) * (AGE_SCALE[level] ?? 0) * place;

/** A theme's tokens with every faded colour moved by `amount` (its group's share of it). */
function fadedSet(set, amount) {
  const out = { ...set };
  for (const { share, names } of Object.values(FADE_GROUPS))
    for (const name of names)
      if (set[name]) out[name] = { $value: fade(resolve(set, name), amount * share) };
  return out;
}

/**
 * Pairings that must hold on a theme, as [foreground, background, minimum, what]: every text
 * colour on every surface and on the worn paper, status text on its tint, text on filled controls
 * and on the selected row, control outlines, the focus outline (fresh accent) on every surface,
 * the state marks that keep their fresh ink, the selected row against what it sits on, and the
 * app frame. `get` reads a colour by name, `fresh` reads it from the fresh theme.
 */
function pairs(get, worn, fresh) {
  const focus = fresh('accent');
  const has = (name) => get(name) !== undefined;
  const surfaces = ['bg', 'surface', 'surface-raised', 'surface-sunken'];
  const grounds = [...surfaces.map(get), ...worn];
  const out = [];
  for (const fg of ['text', 'muted', 'subtle', 'success', 'warning', 'danger', 'info', 'accent'])
    for (const bg of grounds) out.push([get(fg), bg, 4.5, `${fg} の文字`]);
  for (const tone of ['success', 'warning', 'danger', 'info'])
    out.push([get(tone), get(`${tone}-soft`), 4.5, `${tone} の文字（淡い地）`]);
  out.push([get('on-accent'), get('accent'), 4.5, '主ボタンの文字']);
  out.push([get('on-accent'), get('accent-hover'), 4.5, '主ボタンの文字（ホバー）']);
  out.push([get('on-danger'), get('danger'), 4.5, '危険ボタンの文字']);
  for (const fg of ['text', 'muted', 'accent'])
    out.push([get(fg), get('selected'), 4.5, `選択した行の ${fg}`]);
  out.push([get('accent'), get('accent-soft'), 3, '淡い強調の地の上の強調']);
  for (const bg of ['surface', 'surface-raised', 'surface-sunken'])
    out.push([get('border-strong'), get(bg), 3, '操作の輪郭']);
  for (const bg of [...grounds, get('selected'), get('accent-soft')])
    out.push([focus, bg, 3, 'フォーカスの輪郭']);
  for (const name of ['accent', 'danger'])
    for (const bg of grounds) out.push([fresh(name), bg, 4.5, `状態の印の ${name}`]);
  out.push([get('selected'), get('surface'), 1.3, '選択の面と面']);
  out.push([get('selected'), get('bg'), 1.25, '選択の面と地']);
  out.push([get('selected'), get('surface-sunken'), 1.15, '選択の面と凹んだ面']);
  if (has('frame')) {
    for (const bg of ['frame', 'frame-hover', 'frame-inset'])
      for (const fg of ['on-frame', 'frame-muted']) out.push([get(fg), get(bg), 4.5, '枠の文字']);
    out.push([get('on-frame-selected'), get('frame-selected'), 4.5, '枠の選択中の文字']);
    for (const bg of ['frame', 'frame-hover']) {
      out.push([get('frame-selected'), get(bg), 3, '枠の選択中の項目']);
      out.push([get('on-frame'), get(bg), 3, '枠のフォーカスの輪郭']);
    }
  }
  return out;
}

/**
 * Every pairing that fails on an aged set: below its minimum, or below what the fresh theme had
 * where that was already lower. Returns [what, ratio, minimum] for each failure.
 */
function failures(config, tokens, theme, aged) {
  const fresh = themeTokens(tokens, theme);
  const look = (set) => (name) => (set[name] ? resolve(set, name) : undefined);
  const worn = (set) => ['bg', 'surface'].flatMap((b) => wornBackgrounds(config, set, theme, b));
  const now = pairs(look(aged), worn(aged), look(fresh));
  const before = pairs(look(fresh), worn(fresh), look(fresh));
  const out = [];
  now.forEach(([fg, bg, min, what], i) => {
    const value = ratio(fg, bg);
    const floor = Math.min(min, ratio(before[i][0], before[i][1]));
    if (value < floor - 1e-9) out.push([what, value, min]);
  });
  return out;
}

/**
 * A theme's tokens at a level: one amount for every faded token (config.age.fade at most, and the
 * largest 0.05 step below it at which every pairing still holds), with each token fresh and aged.
 */
export function agedTokens(config, tokens, theme, level) {
  const set = themeTokens(tokens, theme);
  const asked = amountFor(config, level, 'fade');
  let amount = 0;
  for (let step = Math.floor(asked * 20 + 1e-9); step > 0; step--)
    if (!failures(config, tokens, theme, fadedSet(set, step / 20)).length) {
      amount = step / 20;
      break;
    }
  const aged = fadedSet(set, amount);
  const colours = Object.fromEntries(
    FADED.filter((name) => set[name]).map((name) => [
      name,
      { fresh: resolve(set, name), aged: resolve(aged, name) },
    ]),
  );
  return { amount, asked, colours, set: aged };
}

/**
 * The most paper the mottle may let through on a filled control, as an opacity of the page colour:
 * config.age.mottle at most, and less where the control's text would drop below 4.5:1.
 */
export function mottleLimit(
  config,
  tokens,
  theme,
  level,
  aged = agedTokens(config, tokens, theme, level),
) {
  const c = (name) => aged.colours[name].aged;
  const fills = [
    [c('accent'), c('on-accent')],
    [c('accent-hover'), c('on-accent')],
    [c('danger'), c('on-danger')],
  ];
  let limit = amountFor(config, level, 'mottle', AGE_PLACES.fill.mottle);
  while (limit > 0 && fills.some(([fill, text]) => ratio(text, mix(fill, c('bg'), limit)) < 4.5))
    limit = Math.max(0, +(limit - 0.01).toFixed(2));
  return limit;
}

/**
 * What age leaves, per theme at both levels: the failures of the aged tokens (none, since the
 * fade stops before one), the lowest text contrast (4.5:1 pairings, and a filled control's text
 * on the most paper the mottle lets through) and the lowest outline contrast (3:1 pairings).
 * The tuning page checks these before it saves.
 */
export function ageContrast(config, tokens) {
  return Object.fromEntries(
    THEMES.map((theme) => {
      const fresh = themeTokens(tokens, theme);
      let text = Infinity;
      let ui = Infinity;
      const failed = [];
      for (const level of ['light', 'heavy']) {
        const aged = agedTokens(config, tokens, theme, level);
        failed.push(...failures(config, tokens, theme, aged.set));
        const look = (name) => (aged.set[name] ? resolve(aged.set, name) : undefined);
        const worn = ['bg', 'surface'].flatMap((b) => wornBackgrounds(config, aged.set, theme, b));
        for (const [fg, bg, min] of pairs(look, worn, (name) => resolve(fresh, name))) {
          if (min === 4.5) text = Math.min(text, ratio(fg, bg));
          if (min === 3) ui = Math.min(ui, ratio(fg, bg));
        }
        const limit = mottleLimit(config, tokens, theme, level, aged);
        const c = (name) => aged.colours[name].aged;
        for (const [fill, on] of [
          ['accent', 'on-accent'],
          ['accent-hover', 'on-accent'],
          ['danger', 'on-danger'],
        ])
          text = Math.min(text, ratio(c(on), mix(c(fill), c('bg'), limit)));
      }
      return [theme, { text, ui, failed }];
    }),
  );
}

/** Mottle: blotches where the ink did not hold, 0..1 on a repeating tile. */
export function mottleField(salt) {
  const seed = seedFor(salt, 'texture', 'mottle');
  const field = new Float32Array(MOTTLE * MOTTLE);
  for (let y = 0; y < MOTTLE; y++)
    for (let x = 0; x < MOTTLE; x++) {
      const u = (x / MOTTLE) * 6;
      const v = (y / MOTTLE) * 6;
      const blot = noise2(seed, u, v, 6) * 0.6 + noise2(seed ^ 0x2545f491, u * 3, v * 3, 18) * 0.4;
      const t = Math.min(1, Math.max(0, (blot - 0.5) / 0.3));
      // No speckle: the surface grain already has it, and smooth blotches compress well.
      field[y * MOTTLE + x] = t;
    }
  return field;
}

/**
 * A corner chip: the irregular piece one corner of a CHIP-pixel square loses, opaque, and nothing
 * elsewhere. Only the piece is drawn, so the square itself never leaves an edge in the mask.
 */
export function chipField(salt, corner) {
  const seed = seedFor(salt, 'chip', corner);
  const field = new Float32Array(CHIP * CHIP);
  for (let y = 0; y < CHIP; y++)
    for (let x = 0; x < CHIP; x++) {
      // Distance from the chipped corner, and the angle around it (0 along one edge, 1 the other).
      const dx = corner.includes('l') ? x + 0.5 : CHIP - x - 0.5;
      const dy = corner.includes('t') ? y + 0.5 : CHIP - y - 0.5;
      const angle = Math.atan2(dy, dx) / (Math.PI / 2);
      const reach = CHIP * (0.32 + 0.22 * noise2(seed, angle * 5, 0.5) + 0.06 * hash32(seed, x, y));
      field[y * CHIP + x] = Math.hypot(dx, dy) < reach ? 1 : 0;
    }
  return field;
}

const LEVELS = 16;
const quantise = (field) =>
  Uint8Array.from(field, (v) => Math.round(Math.min(1, v) * (LEVELS - 1)));
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Image files for age: the mottle per theme and level, and one chip per corner. */
export function ageTextures(config, tokens, themes, deflate) {
  const mottle = quantise(mottleField(config.salt));
  const files = {};
  for (const theme of themes)
    for (const level of ['light', 'heavy']) {
      const aged = agedTokens(config, tokens, theme, level);
      const paper = aged.colours.bg.aged;
      const limit = mottleLimit(config, tokens, theme, level, aged);
      const palette = Array.from({ length: LEVELS }, (_, i) => [
        ...rgb(paper),
        Math.round((i / (LEVELS - 1)) * limit * 255),
      ]);
      files[`age-mottle-${theme}-${level}.png`] = encodeIndexedPng(
        MOTTLE,
        mottle,
        palette,
        deflate,
      );
    }
  const alpha = Array.from({ length: LEVELS }, (_, i) => [0, 0, 0, Math.round((i / 15) * 255)]);
  for (const corner of CORNERS)
    files[`age-chip-${corner}.png`] = encodeIndexedPng(
      CHIP,
      quantise(chipField(config.salt, corner)),
      alpha,
      deflate,
    );
  return { pixels: { mottle }, files };
}

const AT = { tl: 'left top', tr: 'right top', br: 'right bottom', bl: 'left bottom' };

/**
 * A mask that chips the given corners: the whole box, with each corner's piece cut out of it
 * (exclude: the piece lies inside the box, so the two give the box less the piece). Nothing is
 * stitched together, so no seam shows at any zoom.
 */
export function chipMask(corners, size, url) {
  if (!corners.length || size < 1) return 'none';
  const s = `${size.toFixed(1)}px`;
  return [
    ...corners.map((corner) => `${url(corner)} ${AT[corner]} / ${s} ${s} no-repeat exclude`),
    'linear-gradient(#000, #000)',
  ].join(', ');
}

/** How long a worn line runs before its pattern repeats, in pixels: longer than most lines. */
export const RULE_PERIOD = 720;

/**
 * A worn 1px line as gradient stops over RULE_PERIOD pixels, for `amount` 0..1 of wear. Mostly the
 * ink thins and thickens along the line (smooth noise, down to 1 - 0.75 × amount of its strength);
 * now and then (a few times per period at most) it breaks for 1–3px. Segment lengths, the noise and
 * the breaks are all irregular, so the line never reads as a dashed one. tone(opacity) gives the
 * colour at an opacity.
 */
export function ruleStops(seed, amount, tone) {
  if (amount <= 0) return null;
  const next = mulberry32(seed);
  // Two scales of noise, wrapping at the period so the repeat has no seam, stretched so the line
  // runs from full strength to its faintest rather than hovering in between.
  const strength = (at) => {
    const n =
      noise2(seed, at / 90, 0.5, RULE_PERIOD / 90) * 0.7 +
      noise2(seed ^ 0x2545f491, at / 22.5, 0.5, RULE_PERIOD / 22.5) * 0.3;
    return 1 - 0.75 * amount * Math.min(1, Math.max(0, (n - 0.3) / 0.4));
  };
  const stops = [];
  const add = (opacity, at) => stops.push(`${tone(+opacity.toFixed(2))} ${at}px`);
  let at = 0;
  add(strength(0), 0);
  while (at < RULE_PERIOD) {
    at = Math.min(RULE_PERIOD, at + 6 + Math.round(next() * next() * 40));
    if (at < RULE_PERIOD - 4 && next() < amount * 0.08) {
      // A break: the ink stops dead and starts again, with nothing between.
      const gap = 1 + Math.floor(next() * 3);
      add(strength(at), at);
      add(0, at);
      add(0, at + gap);
      at += gap;
    }
    add(strength(at % RULE_PERIOD), at);
  }
  return stops.join(', ');
}

const maskTone = (opacity) =>
  `#000000${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0')}`;

/**
 * The ring a card's border is drawn as under age: four 1px edges with breaks, and the four
 * rounded corners whole (the chips take care of those).
 */
function ringMask(seed, amount, radius) {
  const h = ruleStops(seed, amount, maskTone);
  const v = ruleStops(seed ^ 0x51ed270b, amount, maskTone);
  if (!h) return 'none';
  const edge = (dir, stops, pos, size) =>
    `repeating-linear-gradient(${dir}, ${stops}) ${pos} / ${size} no-repeat`;
  const corner = (pos) => `linear-gradient(#000, #000) ${pos} / ${radius} ${radius} no-repeat`;
  return [
    edge('90deg', h, 'left top', '100% 1px'),
    edge('90deg', h, 'left bottom', '100% 1px'),
    edge('180deg', v, 'left top', '1px 100%'),
    edge('180deg', v, 'right top', '1px 100%'),
    ...['left top', 'right top', 'right bottom', 'left bottom'].map(corner),
  ].join(', ');
}

/**
 * Custom properties age sets for one theme and level: every faded token (and the fresh inks, kept
 * for state marks and focus) and the mottle. url(name) gives the address of an image from
 * ageTextures.
 */
export function ageInkVars(config, tokens, theme, level, url) {
  const { colours } = agedTokens(config, tokens, theme, level);
  const vars = {};
  for (const [name, { aged }] of Object.entries(colours)) vars[`--lv-${name}`] = aged;
  for (const name of STATE_INKS) vars[`--lv-age-fresh-${name}`] = colours[name].fresh;
  // Focus is a state: it keeps the fresh accent, whatever the accent does.
  vars['--lv-focus'] = colours.accent.fresh;
  vars['--lv-age-mottle'] = url(`age-mottle-${theme}-${level}.png`);
  return vars;
}

/** Custom properties age sets for a level in every theme: the per-variant mottle, chips and breaks. */
export function ageShapeVars(config, level, url) {
  const vars = {};
  const chipUrl = (corner) => url(`age-chip-${corner}.png`);
  for (let n = 0; n < VARIANTS; n++) {
    const next = mulberry32(seedFor(config.salt, 'age', n));
    // Two draws went to the misregistration, now dropped; spending them keeps the rest in place.
    next();
    next();
    vars[`--lv-age-mottle-pos-${n}`] =
      `${Math.floor(next() * TILE)}px ${Math.floor(next() * TILE)}px`;
    // One or two corners, never the same pair for every part.
    const first = CORNERS[Math.floor(next() * 4)];
    const second = CORNERS[(CORNERS.indexOf(first) + 1 + Math.floor(next() * 3)) % 4];
    const corners = next() < 0.5 ? [first] : [first, second];
    for (const place of ['card', 'control']) {
      const size = CHIP * amountFor(config, level, 'chips', AGE_PLACES[place].chips);
      vars[`--lv-age-chips-${place}-${n}`] = chipMask(corners, size, chipUrl);
    }
    vars[`--lv-age-ring-${n}`] = ringMask(
      seedFor(config.salt, 'ring', n),
      amountFor(config, level, 'rules', AGE_PLACES.card.rules),
      'var(--lv-radius-lg)',
    );
  }
  const stops = ruleStops(
    seedFor(config.salt, 'table-rule'),
    amountFor(config, level, 'rules', AGE_PLACES.table.rules),
    (opacity) =>
      opacity >= 1
        ? 'var(--lv-border)'
        : `color-mix(in srgb, var(--lv-border) ${Math.round(opacity * 100)}%, transparent)`,
  );
  vars['--lv-age-rule'] = stops ? `repeating-linear-gradient(90deg, ${stops})` : 'none';
  return vars;
}

/** Everything age sets on a scope of one theme and level (the live provider sets these inline). */
export function ageVars(config, tokens, theme, level, url) {
  return { ...ageShapeVars(config, level, url), ...ageInkVars(config, tokens, theme, level, url) };
}

const block = (selector, declarations) =>
  `  ${selector} {\n${Object.entries(declarations)
    .map(([k, v]) => `    ${k}: ${v};`)
    .join('\n')}\n  }`;
const nth = (n) => (n ? `:nth-of-type(${VARIANTS}n + ${n + 1})` : '');

/**
 * Rules that hand the materials to the parts in AGE_PLACES, the same for every theme and level.
 * They read only custom properties, so the live provider can set those inline.
 */
export function ageRules() {
  const aged = ".lievre:is([data-age='light'], [data-age='heavy'])";
  const any = (selectors) => (selectors.length > 1 ? `:is(${selectors.join(', ')})` : selectors[0]);
  const rules = [
    block(`${aged} ${any(AGE_STATES)}`, {
      ...Object.fromEntries(
        STATE_INKS.map((name) => [`--lv-${name}`, `var(--lv-age-fresh-${name})`]),
      ),
    }),
  ];
  const { card, fill, control, table } = AGE_PLACES;
  // Cards: the border is drawn again as a ring inside the card, where it can break, and the
  // corners are chipped. The old border stays, transparent, so nothing moves.
  rules.push(
    block(`${aged} ${any(card.selectors)}`, {
      position: 'relative',
      'border-color': 'transparent',
      'background-clip': 'padding-box',
    }),
    block(`${aged} ${any(card.selectors)}::after`, {
      content: "''",
      position: 'absolute',
      inset: '0',
      border: '1px solid var(--lv-border)',
      'border-radius': 'calc(var(--lv-radius-lg) - 1px)',
      'pointer-events': 'none',
      mask: 'var(--lv-age-ring-0)',
    }),
  );
  for (let n = 0; n < VARIANTS; n++) {
    rules.push(
      // A mask clips what is inside too, so a card holding focus is drawn whole.
      block(`${aged} ${any(card.selectors)}:not(:focus-within)${nth(n)}`, {
        mask: `var(--lv-age-chips-card-${n})`,
      }),
    );
    if (n)
      rules.push(
        block(`${aged} ${any(card.selectors)}${nth(n)}::after`, {
          mask: `var(--lv-age-ring-${n})`,
        }),
      );
    // Filled controls: the paper shows through the fill in blotches. The box, its outline, its
    // edges and the label are left as they are.
    rules.push(
      block(`${aged} ${any(fill.selectors)}:not(:disabled)${nth(n)}`, {
        'background-image': 'var(--lv-age-mottle)',
        'background-position': `var(--lv-age-mottle-pos-${n})`,
        'background-size': `${TILE}px ${TILE}px`,
      }),
      // A mask would also cut off the focus ring, so a focused control is drawn whole.
      block(`${aged} ${any(control.selectors)}:not(:disabled, :focus-visible)${nth(n)}`, {
        mask: `var(--lv-age-chips-control-${n})`,
      }),
    );
  }
  rules.push(
    block(`${aged} ${any(table.selectors)}`, {
      'border-bottom-color': 'transparent',
      'background-image': 'var(--lv-age-rule)',
      'background-position': 'left bottom',
      'background-size': '100% 1px',
      'background-repeat': 'no-repeat',
    }),
    // The worn rule shares the cell's background with the selected row's leading edge: draw both,
    // so the selection never falls back to the fill alone.
    block(`${aged} .lv-table tbody tr[data-selected]:not(:last-child) > :first-child`, {
      'background-image': 'linear-gradient(var(--lv-accent), var(--lv-accent)), var(--lv-age-rule)',
      'background-position': 'left top, left bottom',
      'background-size': '4px 100%, 100% 1px',
    }),
  );
  return rules;
}
