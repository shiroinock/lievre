type TokenSet = Record<string, { $type: string; $value: string }>;
export type TokenFile = { $description: string } & Record<
  'paper' | 'ink' | 'compact' | 'interface',
  TokenSet
>;
export function buildTokens(css: string): TokenFile;
