// Age: a fourth axis beside theme, density and typography (<KeiProvider age="light">). Parts are
// never aged one by one. A few materials are made here, as tokens and custom properties, and each
// part takes them through the selectors in AGE_PLACES:
//   fade    accent and status inks lose colour (OKLCH), stopping where contrast would fail
//   shift   filled controls print their fill off the key line by 0.5–1px
//   mottle  filled faces take the paper back in blotches where the ink did not hold
//   rules   1px lines break and thin here and there
//   chips   corners lose a small irregular piece
// States stay outside age: focus, the selected row, the active tab, checked controls and error
// marks keep the fresh inks, and nothing aged is ever drawn on a disabled control.
import { hash32, mulberry32, noise2, seedFor } from './seed.mjs';
import { encodeIndexedPng } from './png.mjs';
import { mix, ratio, resolve, themeTokens, wornBackgrounds } from './contrast.mjs';
import { fade } from './oklch.mjs';
import { TILE, VARIANTS } from './presets.mjs';
import { THEMES } from './textures.mjs';

export const AGES = ['none', 'light', 'heavy'];
/** How much of each material a level takes; config.age holds the heavy values. */
export const AGE_SCALE = { light: 0.5, heavy: 1 };
/** Inks that fade. Their soft tints, the text and the surfaces keep their colour. */
export const FADED = ['accent', 'accent-hover', 'success', 'warning', 'danger', 'info'];
/** States drawn with the fresh inks wherever they appear inside an aged scope. */
export const AGE_STATES = [
  '[data-selected]',
  "[data-state='checked']",
  "[data-state='indeterminate']",
  ':checked',
  ':indeterminate',
  "[data-state='active']",
  "[aria-sort='ascending']",
  "[aria-sort='descending']",
  '[aria-current]',
  "[aria-invalid='true']",
  '.k-field-error',
  "[data-tone='error']",
];

/**
 * Where each material goes, and how strongly (a share of the level's value). Headings, meters,
 * empty states and cards can take a lot; tables and inputs at 13–14px take little. A new part
 * joins by adding its selector here, or by carrying one of the k-age-* classes.
 */
export const AGE_PLACES = {
  card: { selectors: ['.k-card', '.k-age-sheet'], rules: 1, chips: 1 },
  fill: {
    selectors: ['.k-button--primary', '.k-button--danger', '.k-age-fill'],
    shift: 1,
    mottle: 1,
  },
  print: { selectors: ['.k-badge', '.k-age-print'], shift: 0.7 },
  control: { selectors: ['.k-button', '.k-age-corner'], chips: 0.35 },
  table: { selectors: ['.k-table tbody tr:not(:last-child) td', '.k-age-rule'], rules: 0.5 },
};

/** The mottle is smooth, so it is stored at half the tile and drawn at the full tile. */
const MOTTLE = TILE / 2;
/** Size of the corner chip images, in pixels. */
export const CHIP = 32;
const CORNERS = ['tl', 'tr', 'br', 'bl'];

const amountFor = (config, level, material, place = 1) =>
  (config.age[material] ?? 0) * (AGE_SCALE[level] ?? 0) * place;

// Contrast a faded ink must keep, as [foreground, background, minimum] by token name; `self` is the
// faded ink. Text on every surface (and on the worn paper), status text on its soft tint, and the
// text set on a filled control.
function needs(name, set, worn) {
  const surfaces = ['bg', 'surface', 'surface-raised'].map((k) => resolve(set, k)).concat(worn);
  const asText = surfaces.map((bg) => ['self', bg, 4.5]);
  switch (name) {
    case 'accent':
      return [...asText, [resolve(set, 'on-accent'), 'self', 4.5]];
    case 'accent-hover':
      return [[resolve(set, 'on-accent'), 'self', 4.5]];
    case 'danger':
      return [
        ...asText,
        ['self', resolve(set, 'danger-soft'), 4.5],
        [resolve(set, 'on-danger'), 'self', 4.5],
      ];
    default:
      return [...asText, ['self', resolve(set, `${name}-soft`), 4.5]];
  }
}

/**
 * The faded inks of a theme at a level. Each fades by config.age.fade at most, and less where a
 * pairing would drop below its minimum (or below what the fresh ink had, if that was lower).
 */
export function fadedInks(config, tokens, theme, level) {
  const set = themeTokens(tokens, theme);
  const worn = ['bg', 'surface'].flatMap((b) => wornBackgrounds(config, set, theme, b));
  const target = amountFor(config, level, 'fade');
  return Object.fromEntries(
    FADED.map((name) => {
      const fresh = resolve(set, name);
      const rules = needs(name, set, worn);
      const holds = (colour) =>
        rules.every(([fg, bg, min]) => {
          const pair = (c) => ratio(fg === 'self' ? c : fg, bg === 'self' ? c : bg);
          return pair(colour) >= Math.min(min, pair(fresh));
        });
      let amount = 0;
      for (let step = 1; step <= 20 && (step / 20) * 1 <= target + 1e-9; step++) {
        if (!holds(fade(fresh, step / 20))) break;
        amount = step / 20;
      }
      return [name, { fresh, aged: fade(fresh, amount), amount, asked: target }];
    }),
  );
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
  inks = fadedInks(config, tokens, theme, level),
) {
  const set = themeTokens(tokens, theme);
  const paper = resolve(set, 'bg');
  const fills = [
    [inks.accent.aged, resolve(set, 'on-accent')],
    [inks['accent-hover'].aged, resolve(set, 'on-accent')],
    [inks.danger.aged, resolve(set, 'on-danger')],
  ];
  let limit = amountFor(config, level, 'mottle', AGE_PLACES.fill.mottle);
  while (limit > 0 && fills.some(([fill, text]) => ratio(text, mix(fill, paper, limit)) < 4.5))
    limit = Math.max(0, +(limit - 0.01).toFixed(2));
  return limit;
}

/**
 * The lowest contrast age leaves, per theme at the heavy level (light is half of it): every faded
 * pairing in `needs`, and the control's text on the most paper the mottle lets through (text,
 * against 4.5:1); the focus ring, which keeps the fresh accent, on every surface (ui, against 3:1).
 * The fade and the mottle stop themselves before these fail; the tuning page checks them anyway.
 */
export function ageContrast(config, tokens) {
  return Object.fromEntries(
    THEMES.map((theme) => {
      const set = themeTokens(tokens, theme);
      const worn = ['bg', 'surface'].flatMap((b) => wornBackgrounds(config, set, theme, b));
      let text = Infinity;
      let ui = Infinity;
      for (const level of ['light', 'heavy']) {
        const inks = fadedInks(config, tokens, theme, level);
        for (const name of FADED)
          for (const [fg, bg] of needs(name, set, worn)) {
            const c = (v) => (v === 'self' ? inks[name].aged : v);
            text = Math.min(text, ratio(c(fg), c(bg)));
          }
        const paper = resolve(set, 'bg');
        const limit = mottleLimit(config, tokens, theme, level, inks);
        for (const [fill, on] of [
          ['accent', 'on-accent'],
          ['accent-hover', 'on-accent'],
          ['danger', 'on-danger'],
        ])
          text = Math.min(text, ratio(resolve(set, on), mix(inks[fill].aged, paper, limit)));
        for (const bg of ['bg', 'surface', 'surface-raised']
          .map((k) => resolve(set, k))
          .concat(worn))
          ui = Math.min(ui, ratio(resolve(set, 'accent'), bg));
      }
      return [theme, { text, ui }];
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

/** A corner chip: opaque except an irregular bite out of one corner of a CHIP-pixel square. */
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
      field[y * CHIP + x] = Math.hypot(dx, dy) < reach ? 0 : 1;
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
      const paper = resolve(themeTokens(tokens, theme), 'bg');
      const limit = mottleLimit(config, tokens, theme, level);
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

// Where each chipped corner sits, the conic gradient that keeps everything but that corner's
// square, and the side of the conic that is left out (clockwise from the top).
const AT = {
  tl: ['left top', (s) => `${s} ${s}`, [270, 360]],
  tr: ['right top', (s) => `calc(100% - ${s}) ${s}`, [0, 90]],
  br: ['right bottom', (s) => `calc(100% - ${s}) calc(100% - ${s})`, [90, 180]],
  bl: ['left bottom', (s) => `${s} calc(100% - ${s})`, [180, 270]],
};
function keepAllBut(corner, size) {
  const [, at, [from, to]] = AT[corner];
  return `conic-gradient(at ${at(size)}, #000 0deg ${from}deg, transparent ${from}deg ${to}deg, #000 ${to}deg)`;
}

/**
 * A mask that chips the given corners: for each, the chip image over its corner square, added to
 * a conic that keeps the rest; the corners combine by intersection.
 */
export function chipMask(corners, size, url) {
  if (!corners.length || size < 1) return 'none';
  const s = `${size.toFixed(1)}px`;
  const layers = corners.flatMap((corner, i) => [
    `${url(corner)} ${AT[corner][0]} / ${s} ${s} no-repeat add`,
    `${keepAllBut(corner, s)} ${i < corners.length - 1 ? 'intersect' : 'add'}`,
  ]);
  return layers.join(', ');
}

/** Breaks in a line: runs of ink and short gaps, a share `share` of the length missing or faint. */
export function ruleStops(seed, share, ink, faint) {
  if (share <= 0) return null;
  const next = mulberry32(seed);
  let at = 0;
  const stops = [];
  // Sixteen breaks before the pattern repeats, with runs spread exponentially (long clean
  // stretches, then breaks close together), so the line reads as worn rather than dashed.
  for (let i = 0; i < 16; i++) {
    const gap = 1 + Math.round(next() * 4);
    const spread = -Math.log(1 - next() * 0.95);
    const run = Math.max(3, Math.round(((gap * (1 - share)) / share) * spread));
    stops.push(`${ink} ${at}px ${at + run}px`);
    at += run;
    stops.push(`${next() < 0.5 ? 'transparent' : faint} ${at}px ${at + gap}px`);
    at += gap;
  }
  return stops.join(', ');
}

/**
 * The ring a card's border is drawn as under age: four 1px edges with breaks, and the four
 * rounded corners whole (the chips take care of those).
 */
function ringMask(seed, share, radius) {
  const h = ruleStops(seed, share, '#000', '#0006');
  const v = ruleStops(seed ^ 0x51ed270b, share, '#000', '#0006');
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
 * Custom properties age sets for one theme and level: the faded inks (and the fresh ones, kept for
 * states and focus) and the mottle. url(name) gives the address of an image from ageTextures.
 */
export function ageInkVars(config, tokens, theme, level, url) {
  const inks = fadedInks(config, tokens, theme, level);
  const vars = {};
  for (const [name, { fresh, aged }] of Object.entries(inks)) {
    vars[`--k-${name}`] = aged;
    vars[`--k-age-fresh-${name}`] = fresh;
  }
  // Focus is a state: it keeps the fresh accent, whatever the accent does.
  vars['--k-focus'] = inks.accent.fresh;
  vars['--k-age-mottle'] = url(`age-mottle-${theme}-${level}.png`);
  return vars;
}

/** Custom properties age sets for a level in every theme: the per-variant shift, chips and breaks. */
export function ageShapeVars(config, level, url) {
  const vars = {};
  const shift = amountFor(config, level, 'shift', 1);
  const chipUrl = (corner) => url(`age-chip-${corner}.png`);
  for (let n = 0; n < VARIANTS; n++) {
    const next = mulberry32(seedFor(config.salt, 'age', n));
    const [dx, dy] = [next(), next()].map((v) => (0.5 + v * 0.5) * shift);
    for (const place of ['fill', 'print'])
      vars[`--k-age-shift-${place}-${n}`] =
        `${(dx * AGE_PLACES[place].shift).toFixed(2)}px ${(dy * AGE_PLACES[place].shift).toFixed(2)}px`;
    vars[`--k-age-mottle-pos-${n}`] =
      `${Math.floor(next() * TILE)}px ${Math.floor(next() * TILE)}px`;
    // One or two corners, never the same pair for every part.
    const first = CORNERS[Math.floor(next() * 4)];
    const second = CORNERS[(CORNERS.indexOf(first) + 1 + Math.floor(next() * 3)) % 4];
    const corners = next() < 0.5 ? [first] : [first, second];
    for (const place of ['card', 'control']) {
      const size = CHIP * amountFor(config, level, 'chips', AGE_PLACES[place].chips);
      vars[`--k-age-chips-${place}-${n}`] = chipMask(corners, size, chipUrl);
    }
    const share = 0.2 * amountFor(config, level, 'rules', AGE_PLACES.card.rules);
    vars[`--k-age-ring-${n}`] = ringMask(
      seedFor(config.salt, 'ring', n),
      share,
      'var(--k-radius-lg)',
    );
  }
  const tableShare = 0.2 * amountFor(config, level, 'rules', AGE_PLACES.table.rules);
  const stops = ruleStops(
    seedFor(config.salt, 'table-rule'),
    tableShare,
    'var(--k-border)',
    'color-mix(in srgb, var(--k-border) 40%, transparent)',
  );
  vars['--k-age-rule'] = stops ? `repeating-linear-gradient(90deg, ${stops})` : 'none';
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
  const aged = ".kei:is([data-age='light'], [data-age='heavy'])";
  const any = (selectors) => (selectors.length > 1 ? `:is(${selectors.join(', ')})` : selectors[0]);
  const rules = [
    block(`${aged} ${any(AGE_STATES)}`, {
      ...Object.fromEntries(FADED.map((name) => [`--k-${name}`, `var(--k-age-fresh-${name})`])),
    }),
  ];
  const { card, fill, print, control, table } = AGE_PLACES;
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
      border: '1px solid var(--k-border)',
      'border-radius': 'calc(var(--k-radius-lg) - 1px)',
      'pointer-events': 'none',
      mask: 'var(--k-age-ring-0)',
    }),
  );
  for (let n = 0; n < VARIANTS; n++) {
    rules.push(
      // A mask clips what is inside too, so a card holding focus is drawn whole.
      block(`${aged} ${any(card.selectors)}:not(:focus-within)${nth(n)}`, {
        mask: `var(--k-age-chips-card-${n})`,
      }),
    );
    if (n)
      rules.push(
        block(`${aged} ${any(card.selectors)}${nth(n)}::after`, { mask: `var(--k-age-ring-${n})` }),
      );
    // Filled controls: the fill slips off its key line, and the paper shows through in blotches.
    rules.push(
      block(`${aged} ${any(fill.selectors)}:not(:disabled)${nth(n)}`, {
        'border-color': 'color-mix(in srgb, var(--k-text) 45%, transparent)',
        'box-shadow': `inset var(--k-age-shift-fill-${n}) 0 0 color-mix(in srgb, var(--k-bg) 70%, transparent)`,
        'background-image': 'var(--k-age-mottle)',
        'background-position': `var(--k-age-mottle-pos-${n})`,
        'background-size': `${TILE}px ${TILE}px`,
      }),
      // Badges: the tint slips off its place a little less, with no key line to slip from.
      block(`${aged} ${any(print.selectors)}${nth(n)}`, {
        'box-shadow': `inset var(--k-age-shift-print-${n}) 0 0 color-mix(in srgb, var(--k-bg) 70%, transparent)`,
      }),
      // A mask would also cut off the focus ring, so a focused control is drawn whole.
      block(`${aged} ${any(control.selectors)}:not(:disabled, :focus-visible)${nth(n)}`, {
        mask: `var(--k-age-chips-control-${n})`,
      }),
    );
  }
  rules.push(
    block(`${aged} ${any(table.selectors)}`, {
      'border-bottom-color': 'transparent',
      'background-image': 'var(--k-age-rule)',
      'background-position': 'left bottom',
      'background-size': '100% 1px',
      'background-repeat': 'no-repeat',
    }),
  );
  return rules;
}
