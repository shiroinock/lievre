export type WearKind = 'small' | 'text' | 'heading' | 'figure' | 'data';
export interface WearKindSettings {
  distort: boolean;
  kasure: number;
}
export interface WearConfig {
  preset: string;
  salt: string;
  outline: { rough: number; roughScale: number; swell: number; swellScale: number; step: number };
  kasure: { density: number; threshold: number; floor: number };
  stain: { strength: number };
  kinds: Record<WearKind, WearKindSettings>;
}
export const TEXT_KINDS: Record<
  WearKind,
  { selectors: string[]; font: 'sans' | 'mono'; size: number }
>;
export const PRESETS: Record<'subtle' | 'standard' | 'strong', Omit<WearConfig, 'preset'>>;
export const PRESET_NAMES: Record<keyof typeof PRESETS, string>;
export function normaliseConfig(config?: unknown): WearConfig;
export const TILE: number;
export const VARIANTS: number;
export const OUTLINE_CAPS: { edge: number; swell: number; total: number };
export const THIN: { sans: number; mono: number };
