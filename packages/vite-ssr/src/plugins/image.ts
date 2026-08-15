import fs from 'node:fs/promises';
import path from 'node:path';
import type { Plugin } from 'vite';
import { AIR_ENV } from '../modules/env.js';
import { type AirImageOptions, type ImageMeta, type ImageResolution, readImageMeta } from '../modules/image-store.js';

export type { AirImageOptions } from '../modules/image-store.js';

/**
 * Vite plugin for AIR Image generation and optimization.
 * Processes imported images with `?airimg` or `?asset` suffixes, generating
 * optimized formats and responsive sizes at build time or lazily in dev mode.
 *
 * Encoding is opt-in during development: `devEnabled` must be explicitly
 * `true`, otherwise the raw file path is served for fast HMR.
 *
 * @param options Image configuration options.
 * @returns Vite plugin.
 */
export function airImage(options: AirImageOptions = {}): Plugin {
  const { devEnabled } = options;
  let isBuild = false;

  return {
    name: 'air-pages:image',
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

      const filePath = id.split('?')[0];

      if (!isBuild && devEnabled !== true) {
        const { width, height } = await readImageMeta(filePath);
        const basename = path.basename(filePath, path.extname(filePath));
        const alt = basename.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
        const src = `/@fs${filePath}`;

        const raw: ImageResolution = {
          src,
          srcset: '',
          width,
          height,
          alt,
          default: { src, width, height, alt },
          sizes: {},
        };

        return { code: buildImageModule(raw), map: null };
      }

      const resolution = await AIR_ENV.images.resolve(id);
      const img = isBuild ? await emitAssets(this, resolution) : resolution;

      return { code: buildImageModule(img), map: null };
    },
  };

  async function emitAssets(
    ctx: { emitFile: (asset: { type: 'asset'; name?: string; source: string | Uint8Array }) => string },
    resolution: ImageResolution
  ): Promise<ImageResolution> {
    const urls = [
      resolution.src,
      resolution.default.src,
      ...Object.values(resolution.sizes).map((m) => m.src),
      ...resolution.srcset!.split(',').map((s) => s.trim().split(' ')[0]),
    ];
    const fsUrls = [...new Set(urls.filter((u) => u.startsWith('/@fs')))];

    const replacements = new Map<string, string>();
    for (const fsUrl of fsUrls) {
      const abs = fsUrl.slice('/@fs'.length);
      const buf = await fs.readFile(abs);
      const ref = ctx.emitFile({ type: 'asset', name: path.basename(abs), source: buf });
      replacements.set(fsUrl, `__VITE_ASSET__${ref}__`);
    }

    const mapUrl = (url: string) => {
      for (const [from, to] of replacements) url = url.replaceAll(from, to);
      return url;
    };

    const mapMeta = (m: ImageMeta): ImageMeta => ({ ...m, src: mapUrl(m.src) });

    return {
      src: mapUrl(resolution.src),
      srcset: mapUrl(resolution.srcset ?? ''),
      width: resolution.width,
      height: resolution.height,
      alt: resolution.alt,
      default: mapMeta(resolution.default),
      sizes: Object.fromEntries(Object.entries(resolution.sizes).map(([s, m]) => [s, mapMeta(m)])),
    };
  }
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

function buildImageModule(img: ImageResolution): string {
  const objStr = `{
  src: ${JSON.stringify(img.src)},
  width: ${img.width},
  height: ${img.height},
  alt: ${JSON.stringify(img.alt)},
  default: { src: ${JSON.stringify(img.default.src)}, width: ${img.default.width}, height: ${img.default.height}, alt: ${JSON.stringify(img.default.alt)} },
  srcset: ${JSON.stringify(img.srcset ?? '')},
  sizes: {
${Object.entries(img.sizes)
  .map(
    ([s, m]) =>
      `    ${s}: { src: ${JSON.stringify(m.src)}, width: ${m.width}, height: ${m.height}, alt: ${JSON.stringify(m.alt)} }`
  )
  .join(',\n')}
  }
}`;

  return `
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
}
