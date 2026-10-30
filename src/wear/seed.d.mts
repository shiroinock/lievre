export function hashString(text: string): number;
export function seedFor(salt: string, kind: string, id?: string | number): number;
export function mulberry32(seed: number): () => number;
export function hash32(seed: number, x: number, y: number): number;
export function noise2(
  seed: number,
  x: number,
  y: number,
  period?: number | [number, number],
): number;
