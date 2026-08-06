import type { Router, StaticOption, StaticOptions } from '@anchorlib/router';
import { resolveCacheControl } from './assets.js';
import type { CacheControl } from './types.js';

export type { StaticOptions };

export type StaticAdapter<E = unknown> = {
  get(url: URL, ctx?: Record<string, unknown>, env?: E): Promise<Response | undefined | null>;
  set(url: URL, body: string, ctx?: Record<string, unknown>, env?: E): Promise<Response | void | null>;
};

export type StaticResolverOptions<E = unknown> = {
  cache?: {
    pages?: CacheControl;
  };
  adapter?: StaticAdapter<E>;
  cacheDir?: string;
};

export function createStatic<E = unknown>(router: Router, options?: StaticResolverOptions<E>) {
  const cacheDir = options?.cacheDir ?? '../pages';

  return {
    async get(url: URL, env?: E): Promise<{ html: string; headers: Headers } | void> {
      if (!router) return;
      const match = router.find(url, true);
      if (!match?.route.options?.static) return;

      const { headers, cacheControl, maxAge, ctx } = resolveStaticMetadata(
        match.route.options.static,
        url,
        options?.cache?.pages
      );

      if (options?.adapter) {
        const res = await options.adapter.get(url, ctx, env);
        if (res && res.status === 200) {
          const html = await res.text();
          const resHeaders = new Headers(res.headers);
          if (cacheControl && !resHeaders.has('Cache-Control')) {
            resHeaders.set('Cache-Control', cacheControl);
          }
          return { html, headers: resHeaders };
        }
        return;
      }

      const filePath = resolveStaticPath(cacheDir, url.pathname);
      const content = await readStaticFile(filePath, maxAge);

      if (content) {
        return { html: content, headers };
      }
    },
    async set(url: URL, content: string, env?: E): Promise<void> {
      if (!router) return;
      const match = router.find(url, true);
      if (!match?.route.options?.static) return;

      if (options?.adapter) {
        const { ctx } = resolveStaticMetadata(match.route.options.static, url, options.cache?.pages);
        await options.adapter.set(url, content, ctx, env);
        return;
      }

      const filePath = resolveStaticPath(cacheDir, url.pathname);
      await writeStaticFile(filePath, content);
    },
  };
}

function resolveStaticMetadata(staticOpt: StaticOption, url: URL, fallbackCache?: CacheControl) {
  const headers = createStaticHeaders(staticOpt, url, fallbackCache);
  const cacheControl = headers.get('Cache-Control');
  const matchAge = cacheControl?.match(/max-age=(\d+)/);
  const maxAge = matchAge ? parseInt(matchAge[1], 10) : undefined;
  const ctx = mergeStaticContext(staticOpt, url, fallbackCache, maxAge);

  return { headers, cacheControl, maxAge, ctx };
}

function resolveStaticPath(cacheDir: string, pathname: string): string {
  const cleanPath = pathname === '/' ? '/index' : pathname.replace(/\/$/, '');
  const ext = cleanPath.endsWith('.html') ? '' : '.html';
  return `${cacheDir}${cleanPath}${ext}`;
}

function createStaticHeaders(staticOpt: StaticOption, url: URL, fallbackCache?: CacheControl): Headers {
  const headers = new Headers({
    'Content-Type': 'text/html',
  });

  let cacheControl: string | null | undefined;

  if (typeof staticOpt === 'object') {
    const cacheConfig: CacheControl = {
      public: true,
      maxAge: staticOpt.maxAge,
      staleWhileRevalidate: staticOpt.staleWhileRevalidate,
    };
    cacheControl = resolveCacheControl(cacheConfig, url);
  }

  if (!cacheControl && fallbackCache) {
    cacheControl = resolveCacheControl(fallbackCache, url);
  }

  if (cacheControl) {
    headers.set('Cache-Control', cacheControl);
  }

  return headers;
}

function mergeStaticContext(
  staticOpt: StaticOption,
  url: URL,
  fallbackCache?: CacheControl,
  maxAge?: number
): Record<string, unknown> {
  const ctx: Record<string, unknown> = {};

  if (fallbackCache && typeof fallbackCache === 'function') {
    const res = fallbackCache(url);
    if (typeof res === 'object' && res !== null) Object.assign(ctx, res);
  } else if (typeof fallbackCache === 'object' && fallbackCache !== null) {
    Object.assign(ctx, fallbackCache);
  }

  if (typeof staticOpt === 'object' && staticOpt !== null) {
    Object.assign(ctx, staticOpt);
  }

  if (ctx.maxAge === undefined && maxAge !== undefined) {
    ctx.maxAge = maxAge;
  }

  return ctx;
}

async function readStaticFile(filePath: string, maxAge?: number): Promise<string | undefined> {
  if (typeof Bun !== 'undefined') {
    const file = Bun.file(filePath);
    if ((await file.exists()) && !isExpired(file.lastModified, maxAge)) {
      return file.text();
    }
  }

  // @ts-expect-error
  if (typeof Deno !== 'undefined') {
    try {
      // @ts-expect-error
      const stat = await Deno.stat(filePath);
      if (stat.isFile && !isExpired(stat.mtime?.getTime(), maxAge)) {
        // @ts-expect-error
        return await Deno.readTextFile(filePath);
      }
    } catch (_e) {}
  }

  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      const fsName = 'node:fs/promises';
      const fs = await import(/* @vite-ignore */ fsName);
      const stat = await fs.stat(filePath);
      if (stat.isFile() && !isExpired(stat.mtimeMs, maxAge)) {
        return await fs.readFile(filePath, 'utf-8');
      }
    } catch (_e) {}
  }
}

async function writeStaticFile(filePath: string, content: string): Promise<void> {
  if (typeof Bun !== 'undefined') {
    await Bun.write(filePath, content);
    return;
  }

  const dir = filePath.slice(0, filePath.lastIndexOf('/'));

  // @ts-expect-error
  if (typeof Deno !== 'undefined') {
    try {
      // @ts-expect-error
      await Deno.mkdir(dir, { recursive: true });
      // @ts-expect-error
      await Deno.writeTextFile(filePath, content);
    } catch (_e) {}
    return;
  }

  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      const fsName = 'node:fs/promises';
      const fs = await import(/* @vite-ignore */ fsName);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (_e) {}
  }
}

function isExpired(mtimeMs: number | undefined, maxAge: number | undefined): boolean {
  if (mtimeMs === undefined || maxAge === undefined) return false;
  return Date.now() - mtimeMs >= maxAge * 1000;
}
