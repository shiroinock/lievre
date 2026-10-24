import type { WearConfig } from '../src/wear/presets.mjs';
export function buildRules(): string;
export function buildWear(
  config: WearConfig,
  tokens: unknown,
): {
  files: Record<string, Uint8Array>;
  css: string;
  rules: string;
  meta: {
    config: WearConfig;
    pixels: Record<string, string>;
    bytes: Record<string, number>;
  };
};
export function readConfig(path?: string | URL): WearConfig;
export function writeWear(config?: WearConfig): ReturnType<typeof buildWear>['meta'];
