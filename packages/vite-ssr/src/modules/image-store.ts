import fs from 'node:fs/promises';
import path from 'node:path';
import { Transformer } from '@napi-rs/image';

export type ImageFormat = 'webp' | 'png' | 'jpeg' | 'avif';

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
  format?: ImageFormat;
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

export type ImageMeta = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

export interface ImageResolution {
  /** URL of the optimized original, or the best available size when custom sizes were requested. */
  src: string;
  /** Responsive `srcset` string of generated sizes. */
  srcset?: string;
  width: number;
  height: number;
  alt: string;
  /** Fallback image metadata — what `default` access on the module resolves to. */
  default: ImageMeta;
  /** Generated sizes keyed by target width. */
  sizes: Record<number, ImageMeta>;
}

/**
 * Centralizes the image encoding and caching lifecycle. Encoded artifacts are
 * written to a deterministic cache directory (keyed by source path + format +
 * quality + size) and only re-encoded on cache misses, so repeated builds and
 * dev restarts never pay the CPU cost twice.
 */
export class ImageStore {
  constructor(
    private readonly cacheDir: string,
    private readonly options: AirImageOptions = {}
  ) {}

  /**
   * Resolves a raw Vite module id (e.g. `/image.png?format=webp&sizes=400,800`)
   * into the encoded responsive image metadata. Missing query parameters fall
   * back to the options internalized at construction time.
   */
  public async resolve(id: string): Promise<ImageResolution> {
    const { filePath, sizes, format, quality, hasCustomSizes } = this.parseQuery(id);
    const { width, height } = await readImageMeta(filePath);

    const basename = path.basename(filePath, path.extname(filePath));
    const alt = basename.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

    const hash = Buffer.from(filePath).toString('base64url').slice(-8);
    const outPath = (name: string) => path.join(this.cacheDir, `${hash}-${name}`);
    const url = (abs: string) => `/@fs${abs}`;

    const getOrEncode = async (name: string, size?: number): Promise<string> => {
      const abs = outPath(name);
      try {
        await fs.access(abs);
        return abs;
      } catch {}

      const buf = await this.encodeImage(filePath, format, quality, size);
      await fs.writeFile(abs, buf);
      return abs;
    };

    const sizesMap: Record<number, ImageMeta> = {};
    let defaultMeta: ImageMeta | null = null;

    // The optimized original is only produced when no custom sizes were requested.
    if (!hasCustomSizes) {
      const abs = await getOrEncode(`${basename}.${format}`);
      defaultMeta = { src: url(abs), width, height, alt };
    }

    const srcsetList: string[] = [];
    for (const size of sizes) {
      if (!hasCustomSizes && size >= width) continue;

      const abs = await getOrEncode(`${basename}-${size}w.${format}`, size);
      const sizeMeta = {
        src: url(abs),
        width: size,
        height: Math.round(height * (size / width)),
        alt,
      };
      sizesMap[size] = sizeMeta;
      srcsetList.push(`${sizeMeta.src} ${size}w`);
    }

    if (!defaultMeta) {
      const generatedSizes = Object.keys(sizesMap)
        .map(Number)
        .sort((a, b) => a - b);
      const lastSize = generatedSizes[generatedSizes.length - 1];
      defaultMeta =
        lastSize !== undefined && sizesMap[lastSize]
          ? sizesMap[lastSize]
          : { src: `/@fs${filePath}`, width, height, alt };
    }

    return {
      src: defaultMeta.src,
      srcset: srcsetList.join(', '),
      width: defaultMeta.width,
      height: defaultMeta.height,
      alt: defaultMeta.alt,
      default: defaultMeta,
      sizes: sizesMap,
    };
  }

  private async encodeImage(filePath: string, format: string, quality?: number, size?: number): Promise<Buffer> {
    const buffer = await fs.readFile(filePath);
    const transformer = new Transformer(buffer);

    if (size) {
      const meta = await transformer.metadata();
      const sizeHeight = Math.round(meta.height * (size / meta.width));
      transformer.resize(size, sizeHeight);
    }

    if (format === 'webp') return quality ? transformer.webp(quality) : transformer.webp();
    if (format === 'avif') return quality ? transformer.avif({ quality }) : transformer.avif();
    if (format === 'png') return transformer.png();
    return quality ? transformer.jpeg(quality) : transformer.jpeg();
  }

  private parseQuery(id: string) {
    const defaultSizes = this.options.sizes ?? [128, 256, 512, 1024];
    const defaultFormat = this.options.format ?? 'webp';
    const defaultQuality = this.options.quality ?? 75;

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
    const formatParam = params.get('format') as ImageFormat | null;
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
}

export async function readImageMeta(filePath: string): Promise<{ width: number; height: number }> {
  const buffer = await fs.readFile(filePath);
  const transformer = new Transformer(buffer);
  const meta = await transformer.metadata();
  return { width: meta.width, height: meta.height };
}
