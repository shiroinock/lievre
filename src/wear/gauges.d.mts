import type { WearConfig, WearKind } from './presets.mjs';
export type GaugeLevel = 'ok' | 'caution' | 'warn';
export interface DistortionGauge {
  px: number;
  ratio: number;
  level: GaugeLevel;
}
export interface KasureGauge {
  thinned: number;
  faintest: number;
  level: GaugeLevel;
}
export const STEM: number;
export const GUIDES: {
  shift: [number, number];
  thinned: [number, number];
  contrast: number;
  smallSize: number;
};
export const SAMPLES: { size: number; kind: WearKind; label: string }[];
export function distortionGauge(config: WearConfig, kind: WearKind, size: number): DistortionGauge;
export function kasureGauge(config: WearConfig, kind: WearKind, field?: Float32Array): KasureGauge;
export function contrastGauge(
  config: WearConfig,
  tokens: unknown,
): Record<string, { min: number; level: GaugeLevel }>;
export function gauges(
  config: WearConfig,
  tokens: unknown,
): {
  kinds: Record<WearKind, { distortion: DistortionGauge; kasure: KasureGauge }>;
  samples: {
    size: number;
    kind: WearKind;
    label: string;
    distortion: DistortionGauge;
    kasure: KasureGauge;
  }[];
  contrast: Record<string, { min: number; level: GaugeLevel }>;
  level: GaugeLevel;
};
