// A minimal PNG writer for the baked wear textures: 8-bit indexed colour with transparency.
// Node's zlib is the only dependency, so `npm run wear` needs nothing installed.
import { deflateSync } from 'node:zlib';

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
function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

/**
 * @param {number} size  width and height in pixels
 * @param {Uint8Array} indices  one palette index per pixel, row by row
 * @param {[number, number, number, number][]} palette  RGBA entries
 */
export function encodeIndexedPng(size, indices, palette) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 3, 0, 0, 0], 8);
  const rows = Buffer.alloc(size * (size + 1));
  for (let y = 0; y < size; y++)
    rows.set(indices.subarray(y * size, (y + 1) * size), y * (size + 1) + 1);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('PLTE', Buffer.from(palette.flatMap(([r, g, b]) => [r, g, b]))),
    chunk('tRNS', Buffer.from(palette.map(([, , , a]) => a))),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
