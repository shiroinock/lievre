type TokenSet = Record<string, { $value: string }>;
export function themeTokens(tokens: unknown, theme: string): TokenSet;
export function resolve(set: TokenSet, key: string): string;
export function luminance(hex: string): number;
export function mix(a: string, b: string, amount: number): string;
export function ratio(a: string, b: string): number;
export const TEXT_COLOURS: string[];
export const UI_COLOURS: string[];
export function wornBackgrounds(
  config: import('./presets.mjs').WearConfig,
  set: TokenSet,
  theme: string,
  background: string,
): string[];
export function heldOutline(
  config: import('./presets.mjs').WearConfig,
  set: TokenSet,
  theme: string,
): string;
