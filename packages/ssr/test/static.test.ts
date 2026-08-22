import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStatic } from '../src/index.js';

describe('createStatic', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.stubGlobal('Bun', createMockBun());
  });

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('returns void for get and set when router is undefined', async () => {
    const staticRes = createStatic(undefined as never);
    const url = new URL('http://localhost/about');

    expect(await staticRes.get(url)).toBeUndefined();
    expect(await staticRes.set(url, '<html>test</html>')).toBeUndefined();
  });

  it('returns void when matched route is not marked as static', async () => {
    const router = createMockRouter({ static: false });
    const staticRes = createStatic(router as never);
    const url = new URL('http://localhost/dynamic');

    expect(await staticRes.get(url)).toBeUndefined();
    expect(await staticRes.set(url, '<html>dynamic</html>')).toBeUndefined();
    expect(router.find).toHaveBeenCalledWith(url, true);
  });

  it('returns void when static file does not exist on disk', async () => {
    const router = createMockRouter({ static: true });
    const staticRes = createStatic(router as never, { cacheDir: '/tmp/pages' });
    const url = new URL('http://localhost/missing');

    const result = await staticRes.get(url);
    expect(result).toBeUndefined();
  });

  it('retrieves cached html and generates default static headers on hit', async () => {
    const router = createMockRouter({ static: true });
    const staticRes = createStatic(router as never, { cacheDir: '/tmp/pages' });
    const url = new URL('http://localhost/about');

    await staticRes.set(url, '<h1>About Page</h1>');
    const cached = await staticRes.get(url);

    expect(cached).toBeDefined();
    expect(cached?.html).toBe('<h1>About Page</h1>');
    expect(cached?.headers.get('Content-Type')).toBe('text/html');
    expect(cached?.headers.has('Cache-Control')).toBe(false);
  });

  it('applies Cache-Control header when route static option configures caching directives', async () => {
    const router = createMockRouter({
      static: { maxAge: 3600, staleWhileRevalidate: 60 },
    });
    const staticRes = createStatic(router as never, { cacheDir: '/tmp/pages' });
    const url = new URL('http://localhost/blog');

    await staticRes.set(url, '<h1>Blog Post</h1>');
    const cached = await staticRes.get(url);

    expect(cached?.headers.get('Cache-Control')).toBe('public, max-age=3600, stale-while-revalidate=60');
  });

  it('falls back to worker options cache when route static option is boolean true, and allows route config to override', async () => {
    const defaultRouter = createMockRouter({ static: true });
    const fallbackRes = createStatic(defaultRouter as never, {
      cacheDir: '/tmp/pages',
      cache: { pages: 'public, max-age=1800' },
    });
    const defaultUrl = new URL('http://localhost/fallback');
    await fallbackRes.set(defaultUrl, '<h1>Fallback</h1>');
    const fallbackCached = await fallbackRes.get(defaultUrl);
    expect(fallbackCached?.headers.get('Cache-Control')).toBe('public, max-age=1800');

    const overrideRouter = createMockRouter({ static: { maxAge: 900 } });
    const overrideRes = createStatic(overrideRouter as never, {
      cacheDir: '/tmp/pages',
      cache: { pages: 'public, max-age=1800' },
    });
    const overrideUrl = new URL('http://localhost/override');
    await overrideRes.set(overrideUrl, '<h1>Override</h1>');
    const overrideCached = await overrideRes.get(overrideUrl);
    expect(overrideCached?.headers.get('Cache-Control')).toBe('public, max-age=900');
  });

  it('resolves correct static filenames for root and custom paths', async () => {
    const router = createMockRouter({ static: true });
    const staticRes = createStatic(router as never, { cacheDir: '/cache' });

    await staticRes.set(new URL('http://localhost/'), '<h1>Home</h1>');
    await staticRes.set(new URL('http://localhost/custom.html'), '<h1>Custom</h1>');

    const home = await staticRes.get(new URL('http://localhost/'));
    const custom = await staticRes.get(new URL('http://localhost/custom.html'));

    expect(home?.html).toBe('<h1>Home</h1>');
    expect(custom?.html).toBe('<h1>Custom</h1>');
  });

  it('reads and writes static files using Deno APIs when running in Deno runtime', async () => {
    vi.stubGlobal('Bun', undefined);
    const deno = createMockDeno();
    vi.stubGlobal('Deno', deno);

    const router = createMockRouter({ static: true });
    const staticRes = createStatic(router as never, { cacheDir: '/deno/pages' });
    const url = new URL('http://localhost/about');

    await staticRes.set(url, '<h1>Deno Page</h1>');
    const cached = await staticRes.get(url);

    expect(cached?.html).toBe('<h1>Deno Page</h1>');
  });

  it('reads and writes static files using Node file system APIs when running in Node runtime', async () => {
    vi.stubGlobal('Bun', undefined);
    vi.stubGlobal('Deno', undefined);

    const router = createMockRouter({ static: true });
    const staticRes = createStatic(router as never, { cacheDir: './dist/test-static-pages' });
    const url = new URL('http://localhost/node-test');

    await staticRes.set(url, '<h1>Node Page</h1>');
    const cached = await staticRes.get(url);

    expect(cached?.html).toBe('<h1>Node Page</h1>');

    const fs = await import('node:fs/promises');
    await fs.rm('./dist/test-static-pages', { recursive: true, force: true });
  });

  it('silently handles read and write errors in Deno runtime', async () => {
    vi.stubGlobal('Bun', undefined);
    vi.stubGlobal('Deno', {
      stat: vi.fn().mockRejectedValue(new Error('Deno stat error')),
      mkdir: vi.fn().mockRejectedValue(new Error('Deno mkdir error')),
    });

    const router = createMockRouter({ static: true });
    const staticRes = createStatic(router as never, { cacheDir: '/deno/error' });
    const url = new URL('http://localhost/error-test');

    await expect(staticRes.get(url)).resolves.toBeUndefined();
    await expect(staticRes.set(url, '<h1>Error</h1>')).resolves.toBeUndefined();
  });

  it('silently handles file system errors during writes in Node runtime', async () => {
    vi.stubGlobal('Bun', undefined);
    vi.stubGlobal('Deno', undefined);

    const router = createMockRouter({ static: true });
    const staticRes = createStatic(router as never, { cacheDir: '\0invalid-dir' });
    const url = new URL('http://localhost/node-error');

    await expect(staticRes.set(url, '<h1>Node Error</h1>')).resolves.toBeUndefined();
  });

  it('returns void when static file modification age exceeds configured maxAge on disk', async () => {
    const bun = createMockBun();
    vi.stubGlobal('Bun', bun);

    const router = createMockRouter({ static: { maxAge: 60 } });
    const staticRes = createStatic(router as never, { cacheDir: '/tmp/expired' });
    const url = new URL('http://localhost/old-page');

    await staticRes.set(url, '<h1>Old Page</h1>');
    const fresh = await staticRes.get(url);
    expect(fresh?.html).toBe('<h1>Old Page</h1>');

    bun.setTime('/tmp/expired/old-page/index.html', Date.now() - 120 * 1000);
    const expired = await staticRes.get(url);
    expect(expired).toBeUndefined();
  });

  it('delegates to StaticAdapter when configured, forwarding merged route static and worker cache options in ctx', async () => {
    const mockGet = vi.fn(
      async (_url: URL, _ctx?: unknown) =>
        new Response('<h1>Adapter HTML</h1>', { status: 200, headers: { 'Content-Type': 'text/html' } })
    );
    const mockSet = vi.fn(async (_url: URL, _body: string, _ctx?: unknown) => undefined);

    const router = createMockRouter({ static: { maxAge: 900, staleWhileRevalidate: 30, customFlag: 'override' } });
    const staticRes = createStatic(router as never, {
      adapter: { get: mockGet, set: mockSet },
      cache: { pages: { maxAge: 3600, public: true } },
    });

    const url = new URL('http://localhost/adapter-test');
    const mockEnv = { KV_BUCKET: 'test-bucket' };

    await staticRes.set(url, '<h1>New Adapter Content</h1>', mockEnv);
    expect(mockSet).toHaveBeenCalledWith(
      url,
      '<h1>New Adapter Content</h1>',
      expect.objectContaining({
        public: true,
        maxAge: 900,
        staleWhileRevalidate: 30,
        customFlag: 'override',
      }),
      mockEnv
    );

    const cached = await staticRes.get(url, mockEnv);
    expect(cached?.html).toBe('<h1>Adapter HTML</h1>');
    expect(cached?.headers.get('Cache-Control')).toBe('public, max-age=900, stale-while-revalidate=30');
    expect(mockGet).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        public: true,
        maxAge: 900,
        staleWhileRevalidate: 30,
        customFlag: 'override',
      }),
      mockEnv
    );
  });

  it('returns void on adapter cache miss and resolves function-based fallback cache in context merging', async () => {
    const mockGet = vi.fn(async () => null);
    const router = createMockRouter({ static: true });
    const fallbackFn = vi.fn((url: URL) => (url.pathname === '/miss' ? { maxAge: 600, public: true } : 'no-cache'));

    const staticRes = createStatic(router as never, {
      adapter: { get: mockGet, set: vi.fn() },
      cache: { pages: fallbackFn },
    });

    const url = new URL('http://localhost/miss');
    const result = await staticRes.get(url);

    expect(result).toBeUndefined();
    expect(fallbackFn).toHaveBeenCalledWith(url);
    expect(mockGet).toHaveBeenCalledWith(url, expect.objectContaining({ maxAge: 600, public: true }), undefined);
  });

  it('bypasses static caching when devMode is true and supports cacheAdapter property', async () => {
    const mockGet = vi.fn(async () => new Response('<h1>Not used</h1>', { status: 200 }));
    const mockSet = vi.fn();
    const router = createMockRouter({ static: true });

    const options = {
      devMode: true,
      cacheAdapter: { get: mockGet, set: mockSet },
    };
    const staticRes = createStatic(router as never, options);

    const url = new URL('http://localhost/dev-test');
    expect(await staticRes.get(url)).toBeUndefined();
    await staticRes.set(url, '<h1>New HTML</h1>');

    expect(mockGet).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();

    options.devMode = false;
    const cached = await staticRes.get(url);
    expect(cached?.html).toBe('<h1>Not used</h1>');
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});

function createMockRouter(options: Record<string, unknown> = {}) {
  return {
    find: vi.fn((_url: URL, _passive?: boolean) => ({
      route: {
        options,
      },
    })),
  };
}

function createMockBun() {
  const store = new Map<string, { content: string; mtimeMs: number }>();

  return {
    file: (path: string) => {
      const entry = store.get(path);
      return {
        exists: vi.fn(async () => store.has(path)),
        text: vi.fn(async () => entry?.content),
        lastModified: entry?.mtimeMs ?? Date.now(),
      };
    },
    write: vi.fn(async (path: string, content: string) => {
      store.set(path, { content, mtimeMs: Date.now() });
    }),
    setTime: (path: string, mtimeMs: number) => {
      const entry = store.get(path);
      if (entry) store.set(path, { ...entry, mtimeMs });
    },
  };
}

function createMockDeno() {
  const store = new Map<string, { content: string; mtime: Date }>();

  return {
    stat: vi.fn(async (path: string) => {
      const entry = store.get(path);
      if (!entry) throw new Error('File not found');
      return { isFile: true, mtime: entry.mtime };
    }),
    readTextFile: vi.fn(async (path: string) => store.get(path)?.content),
    mkdir: vi.fn(async (_path: string, _opts?: unknown) => {}),
    writeTextFile: vi.fn(async (path: string, content: string) => {
      store.set(path, { content, mtime: new Date() });
    }),
  };
}
