import { describe, expect, it, vi } from 'vitest';
import { type CacheControlInit, createAssetResolver, getMimeType, resolveCacheControl } from '../src/index.js';

describe('getMimeType', () => {
  it('returns correct mime type for known extensions', () => {
    expect(getMimeType('/path/to/file.html')).toBe('text/html');
    expect(getMimeType('/path/to/file.css')).toBe('text/css');
    expect(getMimeType('image.png')).toBe('image/png');
  });

  it('returns application/octet-stream for unknown extensions', () => {
    expect(getMimeType('/path/to/file.unknown')).toBe('application/octet-stream');
    expect(getMimeType('/path/to/file')).toBe('application/octet-stream');
  });
});

describe('resolveCacheControl', () => {
  const url = new URL('http://localhost/path');

  it('returns undefined when cacheConfig is false', () => {
    expect(resolveCacheControl(false, url, 'default-cache')).toBeUndefined();
  });

  it('returns defaultCache when cacheConfig is undefined', () => {
    expect(resolveCacheControl(undefined, url, 'default-cache')).toBe('default-cache');
    expect(resolveCacheControl(undefined, url)).toBeUndefined();
  });

  it('returns undefined when cacheConfig is falsy (e.g. empty string)', () => {
    expect(resolveCacheControl('', url, 'default-cache')).toBeUndefined();
  });

  it('returns string when cacheConfig is a string', () => {
    expect(resolveCacheControl('public, max-age=3600', url)).toBe('public, max-age=3600');
  });

  it('resolves CacheControlInit object to a valid header string', () => {
    const config: CacheControlInit = {
      public: true,
      maxAge: 3600,
      sMaxAge: 86400,
      staleWhileRevalidate: 60,
      staleIfError: 30,
      mustRevalidate: true,
      immutable: true,
    };
    const result = resolveCacheControl(config, url);
    expect(result).toBe(
      'public, max-age=3600, s-maxage=86400, stale-while-revalidate=60, stale-if-error=30, must-revalidate, immutable'
    );
  });

  it('returns undefined when object has no truthy flags', () => {
    expect(resolveCacheControl({}, url)).toBeUndefined();
  });

  it('resolves minimal CacheControlInit object', () => {
    const config: CacheControlInit = {
      private: true,
      noStore: true,
    };
    const result = resolveCacheControl(config, url);
    expect(result).toBe('private, no-store');
  });

  it('calls function and resolves returned string', () => {
    const resolver = vi.fn(() => 'public, max-age=123');
    const result = resolveCacheControl(resolver, url);
    expect(resolver).toHaveBeenCalledWith(url);
    expect(result).toBe('public, max-age=123');
  });

  it('calls function and resolves returned object', () => {
    const resolver = vi.fn((): CacheControlInit => ({ noCache: true }));
    const result = resolveCacheControl(resolver, url);
    expect(resolver).toHaveBeenCalledWith(url);
    expect(result).toBe('no-cache');
  });

  it('returns undefined if function returns falsy', () => {
    const resolver = vi.fn(() => null);
    expect(resolveCacheControl(resolver, url)).toBeUndefined();
  });
});

describe('createAssetResolver', () => {
  it('evaluates production default cache when NODE_ENV is production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      createAssetResolver({});
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('uses env.ASSETS if available and ignores cache headers from resolveCacheControl', async () => {
    const mockResponse = new Response('asset content', { status: 200 });
    const mockEnv = {
      ASSETS: {
        fetch: vi.fn().mockResolvedValue(mockResponse),
      },
    };

    const resolver = createAssetResolver({});
    const request = new Request('http://localhost/style.css');
    const url = new URL(request.url);

    const response = await resolver(request, url, mockEnv);
    expect(mockEnv.ASSETS.fetch).toHaveBeenCalledWith(request);
    expect(response).toBe(mockResponse);
  });

  it('falls through if env.ASSETS.fetch throws or returns 404', async () => {
    const mockEnv = {
      ASSETS: {
        fetch: vi.fn().mockRejectedValue(new Error('fetch error')),
      },
    };

    const resolver = createAssetResolver({ cache: { assets: false } });
    const request = new Request('http://localhost/non-existent.css');
    const url = new URL(request.url);

    const response = await resolver(request, url, mockEnv);
    expect(response).toBeUndefined();
  });

  it('handles Bun runtime environment when file exists and when not', async () => {
    const mockFile = {
      exists: vi.fn().mockResolvedValue(true),
    };
    vi.stubGlobal('Bun', {
      file: vi.fn(() => mockFile),
    });

    try {
      const resolver = createAssetResolver({ cache: { assets: 'public, max-age=60' } });
      const request = new Request('http://localhost/app.js');
      const url = new URL(request.url);

      const response = await resolver(request, url);
      expect(response).toBeInstanceOf(Response);
      expect(response?.headers.get('Cache-Control')).toBe('public, max-age=60');

      mockFile.exists.mockResolvedValue(false);
      const notFoundResponse = await resolver(request, url);
      expect(notFoundResponse).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('handles Deno runtime environment when file exists and when not', async () => {
    vi.stubGlobal('Deno', {
      stat: vi.fn().mockResolvedValue({ isFile: true }),
      open: vi.fn().mockResolvedValue({ readable: new ReadableStream() }),
    });

    try {
      const resolver = createAssetResolver({ cache: { assets: 'public, max-age=60' } });
      const request = new Request('http://localhost/app.js');
      const url = new URL(request.url);

      const response = await resolver(request, url);
      expect(response).toBeInstanceOf(Response);

      // Non-file branch
      (globalThis as any).Deno.stat.mockResolvedValue({ isFile: false });
      const notFileResponse = await resolver(request, url);
      expect(notFileResponse).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('handles Bun runtime without Cache-Control header', async () => {
    const mockFile = {
      exists: vi.fn().mockResolvedValue(true),
    };
    vi.stubGlobal('Bun', {
      file: vi.fn(() => mockFile),
    });

    try {
      const resolver = createAssetResolver({ cache: { assets: false } });
      const request = new Request('http://localhost/app.js');
      const url = new URL(request.url);

      const response = await resolver(request, url);
      expect(response).toBeInstanceOf(Response);
      expect(response?.headers.has('Cache-Control')).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('handles Node.js runtime asset resolution', async () => {
    vi.unstubAllGlobals();
    delete (globalThis as any).Bun;
    delete (globalThis as any).Deno;

    const fs = await import('node:fs/promises');
    await fs.mkdir('./dist/client', { recursive: true });
    await fs.writeFile('./dist/client/test.js', 'console.log("test");');

    try {
      const resolver = createAssetResolver({ cache: { assets: 'public, max-age=60' } });
      const request = new Request('http://localhost/test.js');
      const url = new URL(request.url);

      const response = await resolver(request, url);
      expect(response).toBeInstanceOf(Response);
      expect(response?.headers.get('Content-Type')).toBe('application/javascript');

      const notFound = await resolver(new Request('http://localhost/missing.js'), new URL('http://localhost/missing.js'));
      expect(notFound).toBeUndefined();
    } finally {
      await fs.rm('./dist/client', { recursive: true, force: true });
    }
  });
});
