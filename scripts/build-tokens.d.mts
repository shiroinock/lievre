type TokenSet = Record<string, { $type: string; $value: string }>;
export type TokenFile = { $description: string } & Record<
  'paper' | 'ink' | 'sepia' | 'rust' | 'compact' | 'interface',
  TokenSet
>;
export function buildTokens(css: string): TokenFile;
