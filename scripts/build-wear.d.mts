export function resolveSalt(argv?: string[], env?: Record<string, string | undefined>): string;
export function surfaceField(salt: string): Float32Array;
export function kasureField(salt: string): Float32Array;
export function placements(salt: string): Record<string, [number, number][]>;
export function buildWear(
  salt: string,
  tokens: unknown,
): {
  files: Record<string, Uint8Array>;
  css: string;
  meta: {
    salt: string;
    surfaceMax: number;
    kasureFloor: number;
    tile: number;
    pixels: Record<string, string>;
    bytes: Record<string, number>;
  };
};
