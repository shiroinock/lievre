export type TokenFile = { $description: string } & Record<
  string,
  Record<string, { $type: string; $value: string }>
>;
export function buildTokens(css: string): TokenFile;
