// Readability gauges for a wear config, shown on the tuning page and checked for the presets.
// They estimate from the same values the build uses; the font check (npm run wear:font) and the
// contrast tests are the hard limits.
import { mix, ratio, resolve, themeTokens } from './contrast.mjs';
import { OUTLINE_CAPS, TEXT_KINDS, THIN } from './presets.mjs';
import { kasureField, THEMES } from './textures.mjs';

/** Guides: ok up to the first value, caution up to the second, warn beyond. */
export const GUIDES = {
  edge: [0.2, 0.3], // how far an edge is asked to move, as a share of the thinnest stroke
  thinned: [0.15, 0.3], // share of a glyph's pixels the dry brush thins
  contrast: 4.5, // the darkest point must still reach this
  smallSize: 14, // below this, any worn edge is a caution
};
const level = (value, [ok, warn]) => (value <= ok ? 'ok' : value <= warn ? 'caution' : 'warn');
const worst = (levels) =>
  levels.includes('warn') ? 'warn' : levels.includes('caution') ? 'caution' : 'ok';

/** Sample sizes on the tuning page and the text kind each one is set as. */
export const SAMPLES = [
  { size: 12, kind: 'small', label: '12px 補足' },
  { size: 14, kind: 'text', label: '14px 本文（操作画面）' },
  { size: 16, kind: 'text', label: '16px 本文' },
  { size: 28, kind: 'heading', label: '28px 見出し' },
];

/**
 * How far a glyph edge moves at a size. The font caps the move against the thinnest stroke
 * (OUTLINE_CAPS); the share is what the values ask for before that cap, so a share past the cap
 * means the edge is pinned at its limit across much of the glyph.
 */
export function outlineGauge(config, kind, size) {
  if (!config.kinds[kind].distort) return { px: 0, ratio: 0, level: 'ok' };
  const { font } = TEXT_KINDS[kind];
  const em = font === 'mono' ? size * 0.83333 : size;
  const thin = THIN[font];
  const { rough, swell } = config.outline;
  const moved = Math.min(
    OUTLINE_CAPS.total * thin,
    Math.min(rough, OUTLINE_CAPS.edge * thin) + Math.min(swell, OUTLINE_CAPS.swell * thin),
  );
  const share = (rough + swell) / thin;
  const base = level(share, GUIDES.edge);
  return {
    px: (moved / 1000) * em,
    ratio: share,
    level: size < GUIDES.smallSize && base === 'ok' && share > 0 ? 'caution' : base,
  };
}

/** Share of pixels the dry brush thins by more than 5%, and the faintest point, for a kind. */
export function kasureGauge(config, kind, field = kasureField(config.salt, config.kasure)) {
  const depth = config.kinds[kind].kasure;
  let thinned = 0;
  for (const v of field) if ((1 - v) * depth > 0.05) thinned++;
  const share = thinned / field.length;
  return {
    thinned: share,
    faintest: 1 - (1 - config.kasure.floor) * depth,
    level: level(share, GUIDES.thinned),
  };
}

/**
 * The most worn backgrounds of a surface in a theme: stained at the darkest speckle, then browned
 * at the darkest corner of the yake, and that again with the most rubbed scuff on top. Text sits
 * on all three somewhere near an edge, so each must hold.
 */
export function wornBackgrounds(config, set, theme, background) {
  const tone = config.tones[theme];
  const stained = mix(resolve(set, background), resolve(set, 'text'), config.stain.strength);
  const browned = mix(stained, tone.yake, config.yake.strength * tone.amount);
  const rubbed = mix(browned, tone.sure, config.sure.strength);
  return [stained, browned, rubbed];
}

/**
 * Contrast at the darkest point, per theme: every text colour on the most worn surface (stain,
 * yake and scuffs at their strongest), and text-coloured glyphs at the faintest point of the
 * deepest dry brush on top of that. at says which layer was the worst.
 */
export function contrastGauge(config, tokens) {
  const depth = Math.max(...Object.values(config.kinds).map((k) => k.kasure));
  const faintest = 1 - (1 - config.kasure.floor) * depth;
  return Object.fromEntries(
    THEMES.map((theme) => {
      const set = themeTokens(tokens, theme);
      let min = Infinity;
      let at = '';
      const layers = ['汚れ', 'ヤケ', 'スレ'];
      for (const background of ['bg', 'surface'])
        wornBackgrounds(config, set, theme, background).forEach((worn, i) => {
          const check = (value) => {
            if (value < min) [min, at] = [value, layers[i]];
          };
          for (const fg of ['text', 'muted', 'subtle', 'success', 'warning', 'danger', 'info'])
            check(ratio(resolve(set, fg), worn));
          check(ratio(mix(worn, resolve(set, 'text'), faintest), worn));
        });
      return [theme, { min, at, level: min >= GUIDES.contrast ? 'ok' : 'warn' }];
    }),
  );
}

export function gauges(config, tokens) {
  const field = kasureField(config.salt, config.kasure);
  const kinds = Object.fromEntries(
    Object.entries(TEXT_KINDS).map(([kind, { size }]) => [
      kind,
      { outline: outlineGauge(config, kind, size), kasure: kasureGauge(config, kind, field) },
    ]),
  );
  const samples = SAMPLES.map((s) => ({
    ...s,
    outline: outlineGauge(config, s.kind, s.size),
    kasure: kinds[s.kind].kasure,
  }));
  const contrast = contrastGauge(config, tokens);
  const all = [
    ...Object.values(kinds).flatMap((k) => [k.outline.level, k.kasure.level]),
    ...Object.values(contrast).map((c) => c.level),
  ];
  return { kinds, samples, contrast, level: worst(all) };
}
