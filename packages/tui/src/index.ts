// The terminal parts. core decides colors and glyphs without Ink; ink draws them.
export * from './core/glyphs.js';
export * from './core/palette.js';
export * from './ink/components.js';
export { Screen, type Focus } from './ink/screen.js';
