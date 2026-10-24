import type { WearConfig } from './presets.mjs';
export type Age = 'none' | 'light' | 'heavy';
export const AGES: Age[];
export const AGE_SCALE: { light: number; heavy: number };
export const FADED: string[];
export const AGE_STATES: string[];
export const AGE_PLACES: Record<
  string,
  { selectors: string[]; rules?: number; chips?: number; shift?: number; mottle?: number }
>;
export const CHIP: number;
export function fadedInks(
  config: WearConfig,
  tokens: unknown,
  theme: string,
  level: Age,
): Record<string, { fresh: string; aged: string; amount: number; asked: number }>;
export function mottleLimit(config: WearConfig, tokens: unknown, theme: string, level: Age): number;
export function mottleField(salt: string): Float32Array;
export function chipField(salt: string, corner: string): Float32Array;
export function ageTextures(
  config: WearConfig,
  tokens: unknown,
  themes: string[],
  deflate?: (rows: Uint8Array) => Uint8Array,
): { pixels: { mottle: Uint8Array }; files: Record<string, Uint8Array> };
export function chipMask(corners: string[], size: number, url: (corner: string) => string): string;
export function ruleStops(seed: number, share: number, ink: string, faint: string): string | null;
export function ageVars(
  config: WearConfig,
  tokens: unknown,
  theme: string,
  level: Age,
  url: (name: string) => string,
): Record<string, string>;
export function ageRules(): string[];
export function ageInkVars(
  config: WearConfig,
  tokens: unknown,
  theme: string,
  level: Age,
  url: (name: string) => string,
): Record<string, string>;
export function ageShapeVars(
  config: WearConfig,
  level: Age,
  url: (name: string) => string,
): Record<string, string>;
export function ageContrast(
  config: WearConfig,
  tokens: unknown,
): Record<string, { text: number; ui: number }>;
