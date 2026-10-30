export function lievreNames(css: string): { classes: Set<string>; variables: Set<string> };
export function migrate(text: string, names: ReturnType<typeof lievreNames>): string;
