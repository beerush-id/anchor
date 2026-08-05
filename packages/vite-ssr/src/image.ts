import fs from 'node:fs/promises';
import path from 'node:path';
import { Transformer } from '@napi-rs/image';
import type { Plugin } from 'vite';

export interface AirImageOptions {
  /**
   * Default sizes to generate (e.g. [128, 256, 512, 1024])
   * @default [128, 256, 512, 1024]
   */
  sizes?: number[];
  /**
   * Default format to convert to
   * @default 'webp'
   */
  format?: 'webp' | 'png' | 'jpeg' | 'avif';
  /**
   * Compression quality (1-100)
   * @default 75
   */
  quality?: number;
  /**
   * Enable image generation and resizing in dev mode.
   * If false, falls back to original raw file path for faster HMR.
   * @default false
   */
  devEnabled?: boolean;
}

export function airImage(options: AirImageOptions = {}): Plugin {
  const { sizes = [128, 256, 512, 1024], format = 'webp', quality = 75, devEnabled } = options;

  let isBuild = false;

  return {
    name: 'anchorlib:vite-image',
    enforce: 'pre',
    configResolved(config) {
      isBuild = config.command === 'build';
    },
    async load(id) {
      if (!id.includes('?airimg')) return null;

      // Extract raw file path by removing all query parameters
      const [filePath] = id.split('?');

      try {
        const buffer = await fs.readFile(filePath);

        // Wait, @napi-rs/image uses Transformer API. Let me check its API if possible.
        // Usually it's: const transformer = new Transformer(buffer);
        // const meta = await transformer.metadata();
        const transformer = new Transformer(buffer);
        const meta = await transformer.metadata();

        const width = meta.width;
        const height = meta.height;

        // Generate Alt Text from file name
        const basename = path.basename(filePath, path.extname(filePath));
        const alt = basename.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

        let src = '';
        let srcset = '';
        const sizesMap: Record<number, { src: string; width: number; height: number; alt: string }> = {};

        if (isBuild || devEnabled !== false) {
          const inputSize = buffer.byteLength;
          const kbIn = (inputSize / 1024).toFixed(2);

          const emitOrCache = async (name: string, buf: Buffer) => {
            if (isBuild) {
              const ref = this.emitFile({ type: 'asset', name, source: buf });
              return `__VITE_ASSET__${ref}__`;
            } else {
              const cacheDir = path.join(process.cwd(), 'node_modules', '.cache', 'air-image');
              await fs.mkdir(cacheDir, { recursive: true });

              const hash = Buffer.from(filePath).toString('base64url').slice(-8);
              const uniqueName = `${hash}-${name}`;
              const outPath = path.join(cacheDir, uniqueName);

              await fs.writeFile(outPath, buf);
              return `/@fs${outPath}`;
            }
          };

          // Generate optimized original buffer
          const optStartTime = Date.now();
          let optimizedBuffer: Buffer;
          if (format === 'webp') optimizedBuffer = quality ? await transformer.webp(quality) : await transformer.webp();
          else if (format === 'avif')
            optimizedBuffer = quality ? await transformer.avif({ quality }) : await transformer.avif();
          else if (format === 'png') optimizedBuffer = await transformer.png();
          else optimizedBuffer = quality ? await transformer.jpeg(quality) : await transformer.jpeg();

          src = await emitOrCache(`${basename}.${format}`, optimizedBuffer);

          const optKbOut = (optimizedBuffer.byteLength / 1024).toFixed(2);
          const reduction = ((1 - optimizedBuffer.byteLength / inputSize) * 100).toFixed(1);
          const optTimeTaken = Date.now() - optStartTime;
          console.log(
            `[airImage] ${basename} (original) | ${kbIn}kb -> ${optKbOut}kb (-${reduction}%) | ${optTimeTaken}ms`
          );

          // Generate srcset sizes
          const srcsetList: string[] = [];
          for (const size of sizes) {
            if (size >= width) continue;

            const ratio = size / width;
            const sizeHeight = Math.round(height * ratio);
            const sizeStartTime = Date.now();

            const t = new Transformer(buffer);
            t.resize(size, sizeHeight);

            let resizedBuffer: Buffer;
            if (format === 'webp') resizedBuffer = quality ? await t.webp(quality) : await t.webp();
            else if (format === 'avif') resizedBuffer = quality ? await t.avif({ quality }) : await t.avif();
            else if (format === 'png') resizedBuffer = await t.png();
            else resizedBuffer = quality ? await t.jpeg(quality) : await t.jpeg();

            const sizeSrc = await emitOrCache(`${basename}-${size}w.${format}`, resizedBuffer);

            const sizeKbOut = (resizedBuffer.byteLength / 1024).toFixed(2);
            const sizeReduction = ((1 - resizedBuffer.byteLength / inputSize) * 100).toFixed(1);
            const sizeTimeTaken = Date.now() - sizeStartTime;
            console.log(
              `[airImage] ${basename} (${size}w) | -> ${sizeKbOut}kb (-${sizeReduction}%) | ${sizeTimeTaken}ms`
            );

            srcsetList.push(`${sizeSrc} ${size}w`);

            sizesMap[size] = { src: sizeSrc, width: size, height: sizeHeight, alt };
          }

          srcset = srcsetList.join(', ');
        } else {
          src = `/@fs${filePath}`;
          srcset = '';
        }

        const objStr = `{
  src: ${JSON.stringify(src)},
  width: ${width},
  height: ${height},
  alt: ${JSON.stringify(alt)},
  srcset: ${JSON.stringify(srcset)},
  sizes: {
${Object.entries(sizesMap)
  .map(
    ([s, m]) =>
      `    ${s}: { src: ${JSON.stringify(m.src)}, width: ${m.width}, height: ${m.height}, alt: ${JSON.stringify(m.alt)} }`
  )
  .join(',\n')}
  }
}`;

        const code = `
const img = ${objStr};

export default new Proxy(img, {
  get(target, prop) {
    if (prop in target) return target[prop];
    if (typeof prop === 'string' && /^\\d+$/.test(prop)) {
      const req = parseInt(prop, 10);
      const available = Object.keys(target.sizes).map(Number).sort((a, b) => a - b);
      const match = available.find(s => s >= req);
      const best = match ? target.sizes[match] : target;
      
      return { 
        src: best.src, 
        width: best.width, 
        height: best.height, 
        alt: best.alt 
      };
    }
  }
});
        `;

        return { code, map: null };
      } catch (err) {
        console.error(`[airImage] Failed to process image ${filePath}:`, err);
        return null;
      }
    },
  };
}
