import type { WearConfig, WearKind } from './presets.mjs';
export type GaugeLevel = 'ok' | 'caution' | 'warn';
export interface OutlineGauge {
  px: number;
  ratio: number;
  level: GaugeLevel;
}
export interface KasureGauge {
  thinned: number;
  faintest: number;
  level: GaugeLevel;
}
export const GUIDES: {
  edge: [number, number];
  thinned: [number, number];
  contrast: number;
  smallSize: number;
};
export const SAMPLES: { size: number; kind: WearKind; label: string }[];
export function outlineGauge(config: WearConfig, kind: WearKind, size: number): OutlineGauge;
export function kasureGauge(config: WearConfig, kind: WearKind, field?: Float32Array): KasureGauge;
export function contrastGauge(
  config: WearConfig,
  tokens: unknown,
): Record<string, { min: number; level: GaugeLevel }>;
export function gauges(
  config: WearConfig,
  tokens: unknown,
): {
  kinds: Record<WearKind, { outline: OutlineGauge; kasure: KasureGauge }>;
  samples: {
    size: number;
    kind: WearKind;
    label: string;
    outline: OutlineGauge;
    kasure: KasureGauge;
  }[];
  contrast: Record<string, { min: number; level: GaugeLevel }>;
  level: GaugeLevel;
};
