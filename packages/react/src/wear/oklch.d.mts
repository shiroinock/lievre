export function hexToOklch(hex: string): [number, number, number];
export function oklchToHex(lch: [number, number, number]): string;
export const AGED_HUE: number;
export function fade(hex: string, amount: number): string;
export function deltaE(a: string, b: string): number;
