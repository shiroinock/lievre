// Live wear: the same textures and offsets as the baked build, made in the browser from
// wearSeed, plus SVG filters that distort text where the baked build swaps in worn faces.
import type { CSSProperties } from 'react';
import tokens from '../../tokens/tokens.json';
import { seedFor } from './seed.mjs';
import { liveEdge, sheetThemeVars, sheetVars, textures, wearVars } from './textures.mjs';
import { TEXT_KINDS, VARIANTS } from './params.mjs';
import type { WearConfig, WearKind } from './presets.mjs';

const kinds = Object.keys(TEXT_KINDS) as WearKind[];
// feTurbulence seeds are read as numbers; keep them small enough to stay exact.
const turbulenceSeed = (salt: string, kind: string, id: string | number) =>
  seedFor(salt, kind, id) % 100000;

function toUrl(bytes: Uint8Array) {
  if (typeof URL.createObjectURL === 'function')
    return URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'image/png' }));
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return `data:image/png;base64,${btoa(binary)}`;
}

// Textures depend on the salt, the kasure, stain, yake and sure values and the theme's colours;
// tuning rebuilds them often, so keep the last few and release the rest.
type Urls = { surface: string; kasure: string; yake: string; sure: string };
const cache = new Map<string, Urls>();
function textureUrls(config: WearConfig, theme: string) {
  const key = JSON.stringify([
    config.salt,
    config.kasure,
    config.stain,
    config.yake,
    config.sure,
    config.tones,
    theme,
  ]);
  let hit = cache.get(key);
  if (!hit) {
    const { files } = textures(config, tokens);
    hit = {
      surface: toUrl(files[`surface-${theme}.png`] ?? files['surface-paper.png']),
      kasure: toUrl(files['kasure.png']),
      yake: toUrl(files[`yake-${theme}.png`] ?? files['yake-paper.png']),
      sure: toUrl(files[`sure-${theme}.png`] ?? files['sure-paper.png']),
    };
    cache.set(key, hit);
    for (const [old, urls] of cache)
      if (cache.size > 8 && old !== key) {
        cache.delete(old);
        if (urls.surface.startsWith('blob:')) Object.values(urls).forEach(URL.revokeObjectURL);
      }
  }
  return hit;
}

/** Custom properties a live provider (and its portals) needs. */
export function liveWearStyle(prefix: string, config: WearConfig, theme: string): CSSProperties {
  const urls = textureUrls(config, theme);
  const style: Record<string, string> = {
    ...wearVars(config, `url(${urls.kasure})`),
    '--k-wear-surface': `url(${urls.surface})`,
    ...sheetVars(config),
    ...sheetThemeVars(config, theme, { yake: `url(${urls.yake})`, sure: `url(${urls.sure})` }),
  };
  for (const kind of kinds)
    if (config.kinds[kind].distort)
      for (let n = 0; n < VARIANTS; n++)
        style[`--k-wear-${kind}-${n}`] = `url(#${prefix}-${kind}-${n})`;
  return style as CSSProperties;
}

/** One edge-wear filter per worn kind and variant. */
export function LiveWearFilters({ prefix, config }: { prefix: string; config: WearConfig }) {
  return (
    <svg aria-hidden width="0" height="0" style={{ position: 'absolute', width: 0, height: 0 }}>
      {kinds
        .filter((kind) => config.kinds[kind].distort)
        .flatMap((kind) => {
          const { baseFrequency, scale } = liveEdge(config, kind);
          return Array.from({ length: VARIANTS }, (_, n) => (
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
                baseFrequency={baseFrequency}
                numOctaves={2}
                seed={turbulenceSeed(config.salt, kind, n)}
                result="warp"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="warp"
                scale={scale}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          ));
        })}
    </svg>
  );
}
