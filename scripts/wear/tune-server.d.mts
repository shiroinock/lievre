import type { Plugin } from 'vite';
import type { WearConfig } from '../../src/wear/presets.mjs';
export function validate(config: WearConfig, tokens: unknown): string[];
export function wearTuneServer(): Plugin;
