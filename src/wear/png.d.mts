export function storedDeflate(bytes: Uint8Array): Uint8Array;
export function encodeIndexedPng(
  size: number,
  indices: Uint8Array,
  palette: [number, number, number, number][],
  deflate?: (rows: Uint8Array) => Uint8Array,
): Uint8Array;
