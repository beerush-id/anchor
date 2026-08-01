import { type CacheControlInit, createAssetResolver, getMimeType, resolveCacheControl } from '@anchorlib/ssr';
import { describe, expect, it, vi } from 'vitest';

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
});
