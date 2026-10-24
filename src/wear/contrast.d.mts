type TokenSet = Record<string, { $value: string }>;
export function themeTokens(tokens: unknown, theme: string): TokenSet;
export function resolve(set: TokenSet, key: string): string;
export function luminance(hex: string): number;
export function mix(a: string, b: string, amount: number): string;
export function ratio(a: string, b: string): number;
