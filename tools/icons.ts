// Writes the PNG icons of the hosted app (blue square, gold medal on a red ribbon) into
// hosted-public/. Run once after a design change: npm run icons
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

type Rgb = readonly [number, number, number];

const BLUE: Rgb = [0x1f, 0x4e, 0x9c];
const GOLD: Rgb = [0xf2, 0xb7, 0x05];
const GOLD_DARK: Rgb = [0xb8, 0x86, 0x00];
const RED: Rgb = [0xc8, 0x10, 0x2e];
const WHITE: Rgb = [0xff, 0xff, 0xff];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** The colour at (u, v) in 0…1 of the square. */
export function pixel(u: number, v: number): Rgb {
  const r = Math.hypot(u - 0.5, v - 0.6);
  // the ribbon: two red bands from the top edge down to the medal
  const band = (x0: number) => v < 0.5 && Math.abs(u - (x0 + (v - 0.08) * (0.5 - x0) * 1.4)) < 0.07;
  if (r < 0.2) return r > 0.17 ? GOLD_DARK : r < 0.06 ? WHITE : GOLD;
  if (v > 0.08 && (band(0.3) || band(0.7))) return RED;
  return BLUE;
}

export function png(size: number): Buffer {
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y += 1) {
    const row = y * (1 + size * 3);
    for (let x = 0; x < size; x += 1) {
      const [r, g, b] = pixel((x + 0.5) / size, (y + 0.5) / size);
      raw[row + 1 + x * 3] = r;
      raw[row + 2 + x * 3] = g;
      raw[row + 3 + x * 3] = b;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

if (process.argv[1]?.endsWith('icons.ts')) {
  const folder = new URL('../hosted-public/', import.meta.url);
  for (const [name, size] of [
    ['icon-192.png', 192],
    ['icon-512.png', 512],
    ['apple-touch-icon.png', 180],
  ] as const) {
    writeFileSync(new URL(name, folder), png(size));
  }
  console.log('Symbole geschrieben: icon-192.png, icon-512.png, apple-touch-icon.png');
}
