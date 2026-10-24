import type { WearConfig, WearKind } from './presets.mjs';
type Tokens = unknown;
export const LEVELS: number;
export const THEMES: ('paper' | 'ink' | 'sepia' | 'rust')[];
export function surfaceField(salt: string): Float32Array;
export function kasureField(salt: string, kasure: WearConfig['kasure']): Float32Array;
export function quantise(field: Float32Array, round?: (n: number) => number): Uint8Array;
export function themeText(tokens: Tokens, theme: string): string;
export function textures(
  config: WearConfig,
  tokens: Tokens,
  deflate?: (rows: Uint8Array) => Uint8Array,
): { pixels: { surface: Uint8Array; kasure: Uint8Array }; files: Record<string, Uint8Array> };
export function placements(salt: string): Record<string, [number, number][]>;
export function wearVars(config: WearConfig, kasure: string): Record<string, string>;
export function liveDistortion(
  config: WearConfig,
  kind: WearKind,
): { baseFrequency: number; scale: number };
