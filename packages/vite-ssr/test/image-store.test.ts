import fs from 'node:fs';
import { deflateSync } from 'node:zlib';
import { afterEach, describe, expect, it } from 'vitest';
import { ImageStore } from '../src/modules/image-store.js';
import { cleanFixture, fixturePath, makeFixture } from './fixture.js';

/** CRC-32 (IEEE) for PNG chunk integrity. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/**
 * A deterministic RGBA PNG. Solid images stay tiny after compression; noise
 * keeps the file large enough to exercise human-readable size formatting.
 */
function makePng(width: number, height: number, noise = false): Buffer {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  let seed = 0x2f6e2b1;
  const next = () => {
    seed ^= (seed << 13) >>> 0;
    seed >>>= 0;
    seed ^= seed >>> 17;
    seed ^= (seed << 5) >>> 0;
    seed >>>= 0;
    return seed & 0xff;
  };
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    for (let x = 0; x < stride; x++) {
      raw[y * (stride + 1) + 1 + x] = noise ? next() : 0x3c;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

describe('image optimization — sources are encoded and cached by request', () => {
  let dir = '';

  afterEach(() => cleanFixture(dir));

  function source(width: number, height: number, noise = false): string {
    dir = makeFixture({});
    const file = fixturePath(dir, 'hero.png');
    fs.writeFileSync(file, makePng(width, height, noise));
    return file;
  }

  it('falls back to the working directory when no root is given', () => {
    expect(new ImageStore().rootDir).toBe(process.cwd());
    expect(new ImageStore({}, '').rootDir).toBe(process.cwd());
  });

  it('serves an optimized original plus responsive sizes for a source image', async () => {
    const file = source(400, 300, true);
    const store = new ImageStore({}, dir);

    const result = await store.resolve(file);

    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
    expect(result.src).toMatch(/^\/@fs.*\.webp$/);
    expect(result.srcset).toContain('128w');
    expect(result.srcset).toContain('256w');
    expect(result.srcset).not.toContain('512w');
    expect(result.sizes[128].width).toBe(128);
    expect(result.sizes[256].width).toBe(256);
  });

  it('serves cached artifacts on repeat requests', async () => {
    const file = source(400, 300);
    const store = new ImageStore({}, dir);

    const first = await store.resolve(file);
    const second = await store.resolve(file);

    expect(second.src).toBe(first.src);
    expect(second.srcset).toBe(first.srcset);
    expect(second.sizes[128].src).toBe(first.sizes[128].src);
  });

  it('skips responsive sizes larger than the source', async () => {
    const file = source(64, 48);
    const store = new ImageStore({}, dir);

    const result = await store.resolve(file);

    expect(result.srcset).toBe('');
    expect(Object.keys(result.sizes)).toHaveLength(0);
    expect(result.width).toBe(64);
  });

  it('honors custom sizes and formats from the module id', async () => {
    const file = source(400, 300);
    const store = new ImageStore({}, dir);

    const result = await store.resolve(`${file}?sizes=64,128&format=png&quality=80`);

    expect(result.sizes[64].width).toBe(64);
    expect(result.sizes[128].width).toBe(128);
    expect(result.src).toContain('128w.png');
  });

  it('falls back to defaults for malformed query parameters', async () => {
    const file = source(400, 300);
    const store = new ImageStore({}, dir);

    const result = await store.resolve(`${file}?format=bmp&quality=999&sizes=abc`);

    expect(result.src).toMatch(/\.webp$/);
    expect(result.srcset).toContain('128w');
  });

  it('keeps valid sizes from a partially malformed sizes list', async () => {
    const file = source(400, 300);
    const store = new ImageStore({}, dir);

    const result = await store.resolve(`${file}?sizes=abc,50`);

    expect(Object.keys(result.sizes)).toEqual(['50']);
  });

  it('encodes avif and jpeg on request', async () => {
    const file = source(64, 48);
    const store = new ImageStore({}, dir);

    const avif = await store.resolve(`${file}?format=avif`);
    expect(avif.src).toMatch(/\.avif$/);

    const jpeg = await store.resolve(`${file}?format=jpeg`);
    expect(jpeg.src).toMatch(/\.jpeg$/);
  });

  it('encodes without a quality hint when quality is configured as zero', async () => {
    const file = source(64, 48);
    const store = new ImageStore({ quality: 0 }, dir);

    const webp = await store.resolve(file);
    expect(webp.src).toMatch(/\.webp$/);

    const avif = await store.resolve(`${file}?format=avif`);
    expect(avif.src).toMatch(/\.avif$/);

    const jpeg = await store.resolve(`${file}?format=jpeg`);
    expect(jpeg.src).toMatch(/\.jpeg$/);
  });

  it('reports readable sizes for large sources', async () => {
    // 513px is the narrowest source that still emits the 512w size; noise keeps
    // the file above 1MB so the MB branch of the size formatter is exercised.
    // A smaller source also avoids paying worst-case encoder cost on noise.
    const file = source(513, 513, true);
    const store = new ImageStore({ quality: 10 }, dir);

    const result = await store.resolve(file);

    expect(result.width).toBe(513);
    expect(result.srcset).toContain('512w');
  });
});
