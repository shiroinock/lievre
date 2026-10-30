// A minimal PNG writer for the wear textures: 8-bit indexed colour with transparency.
// The build passes Node's zlib; the browser (live) stores the rows uncompressed, which is larger
// but decodes to exactly the same pixels.

const table = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
function concat(parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) out.set(p, (at += p.length) - p.length);
  return out;
}
function chunk(type, data) {
  const body = concat([Uint8Array.from(type, (c) => c.charCodeAt(0)), data]);
  return concat([Uint8Array.from(u32(data.length)), body, Uint8Array.from(u32(crc32(body)))]);
}

/** zlib stream of stored (uncompressed) deflate blocks. */
export function storedDeflate(bytes) {
  const blocks = [Uint8Array.of(0x78, 0x01)];
  for (let at = 0; at < bytes.length || at === 0; at += 65535) {
    const part = bytes.subarray(at, at + 65535);
    const last = at + 65535 >= bytes.length ? 1 : 0;
    const n = part.length;
    blocks.push(Uint8Array.of(last, n & 255, n >> 8, ~n & 255, (~n >> 8) & 255), part);
    if (!bytes.length) break;
  }
  let a = 1,
    b = 0;
  for (const byte of bytes) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  blocks.push(Uint8Array.from(u32(((b << 16) | a) >>> 0)));
  return concat(blocks);
}

/**
 * @param {number} size  width and height in pixels
 * @param {Uint8Array} indices  one palette index per pixel, row by row
 * @param {[number, number, number, number][]} palette  RGBA entries
 * @param {(rows: Uint8Array) => Uint8Array} [deflate]  zlib compressor
 */
export function encodeIndexedPng(size, indices, palette, deflate = storedDeflate) {
  const header = Uint8Array.from([...u32(size), ...u32(size), 8, 3, 0, 0, 0]);
  const rows = new Uint8Array(size * (size + 1));
  for (let y = 0; y < size; y++)
    rows.set(indices.subarray(y * size, (y + 1) * size), y * (size + 1) + 1);
  return concat([
    Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
    chunk('IHDR', header),
    chunk('PLTE', Uint8Array.from(palette.flatMap(([r, g, b]) => [r, g, b]))),
    chunk('tRNS', Uint8Array.from(palette.map(([, , , a]) => a))),
    chunk('IDAT', deflate(rows)),
    chunk('IEND', new Uint8Array(0)),
  ]);
}
