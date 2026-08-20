import type { AnyType } from '@airlib/core';
import type { AppWorkerOptions, AssetResolver, CacheControl, CacheControlInit } from './types.js';

export function createAssetResolver<E = AnyType>(options: AppWorkerOptions<E>): AssetResolver<E> {
  const isProd = typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
  const defaultAssetCache = isProd ? 'public, max-age=31536000, immutable' : 'no-cache';

  return async (request: Request, url: URL, env?: E) => {
    // If running in Cloudflare Pages:
    if ((env as AnyType)?.ASSETS) {
      try {
        const asset = await (env as AnyType).ASSETS.fetch(request);
        if (asset.status < 400) return asset;
      } catch (_e) {}
    }

    const filePath = `./dist/client${url.pathname}`;
    const cacheControl = resolveCacheControl(options.cache?.assets, url, defaultAssetCache);

    const createHeaders = (pathname: string) => {
      const headers = new Headers();
      headers.set('Content-Type', getMimeType(pathname));
      if (cacheControl) {
        headers.set('Cache-Control', cacheControl);
      }
      return headers;
    };

    // If running in Bun:
    if (typeof Bun !== 'undefined') {
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return new Response(file, { headers: createHeaders(url.pathname) });
      }
    }

    // If running in Deno:
    // @ts-expect-error - Deno global is not defined in standard TS lib
    if (typeof Deno !== 'undefined') {
      try {
        // @ts-expect-error
        const stat = await Deno.stat(filePath);
        if (stat.isFile) {
          // @ts-expect-error
          const file = await Deno.open(filePath, { read: true });
          return new Response(file.readable, {
            headers: createHeaders(url.pathname),
          });
        }
      } catch (_e) {}
    }

    // If running in Node.js:
    if (typeof process !== 'undefined' && process.versions?.node) {
      try {
        const fsName = 'node:fs/promises';
        const fs = await import(/* @vite-ignore */ fsName);
        const stat = await fs.stat(filePath);
        if (stat.isFile()) {
          const buffer = await fs.readFile(filePath);
          return new Response(buffer, {
            headers: createHeaders(url.pathname),
          });
        }
      } catch (_e) {}
    }
  };
}

export function resolveCacheControl(
  cacheConfig: CacheControl | undefined,
  url: URL,
  defaultCache?: string
): string | undefined | null {
  if (cacheConfig === false) return undefined;
  if (cacheConfig === undefined) return defaultCache;
  if (!cacheConfig) return undefined;

  let config: CacheControlInit | string | undefined | null;

  if (typeof cacheConfig === 'function') {
    config = cacheConfig(url);
  } else {
    config = cacheConfig;
  }

  if (!config) return undefined;
  if (typeof config === 'string') return config;

  const parts: string[] = [];
  if (config.public) parts.push('public');
  if (config.private) parts.push('private');
  if (config.maxAge !== undefined) parts.push(`max-age=${config.maxAge}`);
  if (config.sMaxAge !== undefined) parts.push(`s-maxage=${config.sMaxAge}`);
  if (config.staleWhileRevalidate !== undefined) parts.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
  if (config.staleIfError !== undefined) parts.push(`stale-if-error=${config.staleIfError}`);
  if (config.mustRevalidate) parts.push('must-revalidate');
  if (config.noCache) parts.push('no-cache');
  if (config.noStore) parts.push('no-store');
  if (config.immutable) parts.push('immutable');

  return parts.length > 0 ? parts.join(', ') : undefined;
}

export function getMimeType(pathname: string) {
  const match = pathname.match(/\.[^.]+$/);
  const ext = match ? match[0].toLowerCase() : '';
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.cjs': 'application/javascript',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.pdf': 'application/pdf',
};
