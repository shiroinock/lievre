// The wear settings in force: wear.config.json (written by the tuning page, pnpm run wear:tune),
// filled out from the standard preset. Shared by the baked textures, the live provider and the
// contrast tests, so raising a value that breaks 4.5:1 fails src/test/contrast.test.tsx.
import saved from '../../wear.config.json' with { type: 'json' };
import { normaliseConfig } from './presets.mjs';

export { TEXT_KINDS, TILE, VARIANTS } from './presets.mjs';
export const WEAR_CONFIG = normaliseConfig(saved);
/** Darkest point of grain and stains on a surface, as the opacity of the text colour. */
export const SURFACE_MAX = WEAR_CONFIG.stain.strength;
/** Faintest point of a worn glyph, as the opacity left by the dry-brush mask. */
export const KASURE_FLOOR = WEAR_CONFIG.kasure.floor;
