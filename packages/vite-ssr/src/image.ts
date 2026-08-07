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

/**
 * Vite plugin for AIR Image generation and optimization.
 * Processes imported images with `?airimg` or `?asset` suffixes, generating
 * optimized formats and responsive sizes at build time or lazily in dev mode.
 *
 * @param options Image configuration options.
 * @returns Vite plugin.
 */
export function airImage(options: AirImageOptions = {}): Plugin {
  const { devEnabled } = options;

  let isBuild = false;

  return {
    name: 'anchorlib:vite-image',
    enforce: 'pre',
    configResolved(config) {
      isBuild = config.command === 'build';
    },
    transform(code) {
      if (!isImageAsset(code)) return null;

      const transformed = stripAndEncodeImportAttributes(code);
      if (transformed === code) return null;

      return { code: transformed, map: null };
    },
    async load(id) {
      if (!isImageAsset(id)) return null;

      const { filePath, sizes, format, quality, hasCustomSizes } = resolveImageConfig(id, options);

      try {
        const buffer = await fs.readFile(filePath);

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
        let defaultMeta: { src: string; width: number; height: number; alt: string } | null = null;

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

          // Generate optimized original buffer only when custom sizes are not explicitly supplied
          if (!hasCustomSizes) {
            const optStartTime = Date.now();
            let optimizedBuffer: Buffer;
            if (format === 'webp')
              optimizedBuffer = quality ? await transformer.webp(quality) : await transformer.webp();
            else if (format === 'avif')
              optimizedBuffer = quality ? await transformer.avif({ quality }) : await transformer.avif();
            else if (format === 'png') optimizedBuffer = await transformer.png();
            else optimizedBuffer = quality ? await transformer.jpeg(quality) : await transformer.jpeg();

            src = await emitOrCache(`${basename}.${format}`, optimizedBuffer);

            const optKbOut = (optimizedBuffer.byteLength / 1024).toFixed(2);
            const reduction = ((1 - optimizedBuffer.byteLength / inputSize) * 100).toFixed(1);
            const optTimeTaken = Date.now() - optStartTime;
            console.log(
              `[air:image] ${basename} (original) | ${kbIn}kb -> ${optKbOut}kb (-${reduction}%) | ${optTimeTaken}ms`
            );

            defaultMeta = { src, width, height, alt };
          }

          // Generate srcset sizes
          const srcsetList: string[] = [];
          for (const size of sizes) {
            if (!hasCustomSizes && size >= width) continue;

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
              `[air:image] ${basename} (${size}w) | -> ${sizeKbOut}kb (-${sizeReduction}%) | ${sizeTimeTaken}ms`
            );

            srcsetList.push(`${sizeSrc} ${size}w`);

            sizesMap[size] = { src: sizeSrc, width: size, height: sizeHeight, alt };
          }

          if (!defaultMeta) {
            const generatedSizes = Object.keys(sizesMap)
              .map(Number)
              .sort((a, b) => a - b);
            const lastSize = generatedSizes[generatedSizes.length - 1];
            if (lastSize !== undefined && sizesMap[lastSize]) {
              defaultMeta = sizesMap[lastSize];
            } else {
              defaultMeta = { src: `/@fs${filePath}`, width, height, alt };
            }
          }

          src = defaultMeta.src;
          srcset = srcsetList.join(', ');
        } else {
          src = `/@fs${filePath}`;
          srcset = '';
          defaultMeta = { src, width, height, alt };
        }

        const objStr = `{
  src: ${JSON.stringify(src)},
  width: ${defaultMeta.width},
  height: ${defaultMeta.height},
  alt: ${JSON.stringify(defaultMeta.alt)},
  default: { src: ${JSON.stringify(defaultMeta.src)}, width: ${defaultMeta.width}, height: ${defaultMeta.height}, alt: ${JSON.stringify(defaultMeta.alt)} },
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
      const best = match ? target.sizes[match] : (target.default || target);
      
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
        console.error(`[air:image] Failed to process image ${filePath}:`, err);
        return null;
      }
    },
  };
}

function isImageAsset(str: string): boolean {
  return str.includes('?airimg') || str.includes('?asset') || str.includes('&airimg') || str.includes('&asset');
}

function stripAndEncodeImportAttributes(code: string): string {
  const attrRegex = /(['"])([^'"]*(?:\?|&)(?:airimg|asset)[^'"]*)\1\s*(?:with|assert)\s*\{([^}]+)\}/g;

  return code.replace(attrRegex, (_match, quote, source: string, attributes: string) => {
    const queryParams: string[] = [];
    const pairRegex = /(?:['"]?([a-zA-Z0-9_-]+)['"]?)\s*:\s*(?:['"]([^'"]*)['"]|([0-9]+|true|false))/g;

    let pairMatch: RegExpExecArray | null;
    while ((pairMatch = pairRegex.exec(attributes)) !== null) {
      const key = pairMatch[1];
      const value = pairMatch[2] ?? pairMatch[3];
      if (key && value !== undefined) {
        queryParams.push(`${key}=${value}`);
      }
    }

    if (queryParams.length === 0) {
      return `${quote}${source}${quote}`;
    }

    const separator = source.includes('?') ? '&' : '?';
    const rewrittenSource = `${source}${separator}${queryParams.join('&')}`;

    return `${quote}${rewrittenSource}${quote}`;
  });
}

function resolveImageConfig(id: string, options: AirImageOptions) {
  const defaultSizes = options.sizes || [128, 256, 512, 1024];
  const defaultFormat = options.format || 'webp';
  const defaultQuality = options.quality ?? 75;

  const questionIndex = id.indexOf('?');
  const filePath = questionIndex !== -1 ? id.slice(0, questionIndex) : id;
  const queryString = questionIndex !== -1 ? id.slice(questionIndex + 1) : '';
  const params = new URLSearchParams(queryString);

  let sizes = defaultSizes;
  let hasCustomSizes = false;
  const sizeParam = params.get('sizes');
  if (sizeParam) {
    const parsedSizes = sizeParam
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((s) => !Number.isNaN(s) && s > 0);
    if (parsedSizes.length > 0) {
      sizes = parsedSizes;
      hasCustomSizes = true;
    }
  }

  let format = defaultFormat;
  const formatParam = params.get('format') as AirImageOptions['format'] | null;
  if (formatParam && ['webp', 'png', 'jpeg', 'avif'].includes(formatParam)) {
    format = formatParam;
  }

  let quality = defaultQuality;
  const qualityParam = params.get('quality');
  if (qualityParam) {
    const parsedQuality = parseInt(qualityParam, 10);
    if (!Number.isNaN(parsedQuality) && parsedQuality > 0 && parsedQuality <= 100) {
      quality = parsedQuality;
    }
  }

  return { filePath, sizes, format, quality, hasCustomSizes };
}
