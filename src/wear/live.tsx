// Live wear: SVG textures and filters written in the browser from wearSeed.
// feTurbulence takes the seed directly, so the same seed draws the same grain and distortion.
import type { CSSProperties } from 'react';
import tokens from '../../tokens/tokens.json';
import { seedFor } from './seed.mjs';
import { printMarks } from './marks.mjs';
import { DISPLACEMENT, KASURE_FLOOR, SURFACE_MAX, TEXT_KINDS, TILE, VARIANTS } from './params.mjs';

type Kind = keyof typeof TEXT_KINDS;
const kinds = Object.keys(TEXT_KINDS) as Kind[];
// feTurbulence seeds are read as numbers; keep them small enough to stay exact.
const turbulenceSeed = (salt: string, kind: string, id: string | number) =>
  seedFor(salt, kind, id) % 100000;

function textColour(theme: string) {
  const scope = (tokens as unknown as Record<string, Record<string, { $value: string }>>)[theme];
  return scope?.text?.$value ?? tokens.paper.text.$value;
}

/** Grain and stains as an SVG image in the theme's text colour, at most SURFACE_MAX opaque. */
function surfaceImage(salt: string, theme: string) {
  const grain = turbulenceSeed(salt, 'texture', 'grain');
  const stain = turbulenceSeed(salt, 'texture', 'stain');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${TILE}' height='${TILE}'><filter id='s' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='1' seed='${grain}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 6 0 0 0 -4.6' result='g'/><feTurbulence type='fractalNoise' baseFrequency='.016' numOctaves='2' seed='${stain}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 3 0 0 0 -1.7'/><feComponentTransfer><feFuncA type='linear' slope='.7'/></feComponentTransfer><feComposite in2='g' operator='arithmetic' k2='1' k3='1'/><feComponentTransfer result='a'><feFuncA type='linear' slope='${SURFACE_MAX}'/></feComponentTransfer><feFlood flood-color='${textColour(theme)}'/><feComposite in2='a' operator='in'/></filter><rect width='100%' height='100%' filter='url(%23s)'/></svg>`;
  return `url("data:image/svg+xml,${svg.replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E')}")`;
}

/** Custom properties a live provider (and its portals) needs. */
export function liveWearStyle(prefix: string, salt: string, theme: string): CSSProperties {
  const { shift, rule, dash } = printMarks(salt);
  const style: Record<string, string> = {
    '--k-wear-surface': surfaceImage(salt, theme),
    '--k-wear-shift': shift,
    '--k-wear-rule': rule,
    '--k-wear-dash': dash,
  };
  for (const kind of kinds)
    for (let n = 0; n < VARIANTS; n++)
      style[`--k-wear-${kind}-${n}`] = `url(#${prefix}-${kind}-${n})`;
  return style as CSSProperties;
}

/** One distortion-and-dry-brush filter per text kind and variant. */
export function LiveWearFilters({ prefix, salt }: { prefix: string; salt: string }) {
  return (
    <svg aria-hidden width="0" height="0" style={{ position: 'absolute', width: 0, height: 0 }}>
      {kinds.flatMap((kind) =>
        Array.from({ length: VARIANTS }, (_, n) => (
          <filter
            key={`${kind}-${n}`}
            id={`${prefix}-${kind}-${n}`}
            x="-4%"
            y="-12%"
            width="108%"
            height="124%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.045"
              numOctaves={2}
              seed={turbulenceSeed(salt, kind, n)}
              result="warp"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="warp"
              scale={DISPLACEMENT[kind]}
              xChannelSelector="R"
              yChannelSelector="G"
              result="moved"
            />
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.03 0.5"
              numOctaves={1}
              seed={turbulenceSeed(salt, `${kind}-kasure`, n)}
            />
            <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -4 0 0 0 3.2" />
            <feComponentTransfer>
              <feFuncA type="linear" slope={1 - KASURE_FLOOR} intercept={KASURE_FLOOR} />
            </feComponentTransfer>
            <feComposite in="moved" operator="in" />
          </filter>
        )),
      )}
    </svg>
  );
}
