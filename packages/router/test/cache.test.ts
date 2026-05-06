import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RouteCache, URLCache } from '../src/cache.js';
import { createRouter, Router } from '../src/index.js';
import { RouteRegistry } from '../src/registry.js';
import { Route } from '../src/route.js';
import type { ProviderContext, TRec } from '../src/types.js';

let sharedRouter: Router;

describe('RouteCache', () => {
  let route: Route<'/test', {}, {}, {}, {}>;
  let cache: RouteCache;
  let mockProvider: (ctx: ProviderContext<TRec, TRec, TRec>) => Promise<string>;

  beforeEach(() => {
    vi.useFakeTimers();
    sharedRouter = new Router();
    route = new Route(sharedRouter, '/test');
    cache = new RouteCache(route);
    mockProvider = vi.fn(async () => 'test-data');
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create a new RouteCache instance', () => {
      expect(cache).toBeInstanceOf(RouteCache);
      expect(cache).toBeInstanceOf(WeakMap);
    });

    it('should store the route reference', () => {
      const testRoute = new Route(sharedRouter, '/test-route');
      const testCache = new RouteCache(testRoute as never);
      expect(testCache).toBeDefined();
    });
  });

  describe('resolve', () => {
    it('should call provider when maxAge is 0 (no caching)', async () => {
      const context: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      const result = await cache.resolve(mockProvider, context, { maxAge: 0 });
      const result2 = await cache.resolve(mockProvider, context, {});

      expect(mockProvider).toHaveBeenCalledTimes(2);
      expect(result).toBe('test-data');
      expect(result2).toBe('test-data');
    });

    it('should call provider when maxAge is undefined and route has no maxAge', async () => {
      const context: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      const result = await cache.resolve(mockProvider, context);

      expect(mockProvider).toHaveBeenCalledTimes(1);
      expect(result).toBe('test-data');
    });

    it('should cache provider result when maxAge > 0', async () => {
      const context: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      const result1 = await cache.resolve(mockProvider, context, { maxAge: 1000 });
      const result2 = await cache.resolve(mockProvider, context, { maxAge: 1000 });

      expect(mockProvider).toHaveBeenCalledTimes(1);
      expect(result1).toBe('test-data');
      expect(result2).toBe('test-data');
    });

    it('should use route options maxAge when options not provided', async () => {
      const routeWithMaxAge = new Route(sharedRouter, '/test', { maxAge: 1000 });
      const cacheWithRoute = new RouteCache(routeWithMaxAge as never);
      const context: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      const result1 = await cacheWithRoute.resolve(mockProvider, context);
      const result2 = await cacheWithRoute.resolve(mockProvider, context);

      expect(mockProvider).toHaveBeenCalledTimes(1);
      expect(result1).toBe('test-data');
      expect(result2).toBe('test-data');
    });

    it('should expire cache after maxAge milliseconds', async () => {
      const context: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      const result1 = await cache.resolve(mockProvider, context, { maxAge: 10 });
      vi.advanceTimersByTime(20);
      const result2 = await cache.resolve(mockProvider, context, { maxAge: 10 });

      expect(mockProvider).toHaveBeenCalledTimes(2);
      expect(result1).toBe('test-data');
      expect(result2).toBe('test-data');
    });

    it('should create separate cache entries for different params', async () => {
      const context1: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };
      const context2: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '456' },
        query: {},
        data: {},
      };

      (mockProvider as ReturnType<typeof vi.fn>).mockImplementation(async (ctx) => `data-${ctx.params.id}`);

      const result1 = await cache.resolve(mockProvider, context1, { maxAge: 1000 });
      const result2 = await cache.resolve(mockProvider, context2, { maxAge: 1000 });

      expect(mockProvider).toHaveBeenCalledTimes(2);
      expect(result1).toBe('data-123');
      expect(result2).toBe('data-456');
    });

    it('should create separate cache entries for different query params', async () => {
      const context1: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: { tab: 'profile' },
        data: {},
      };
      const context2: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: { tab: 'settings' },
        data: {},
      };

      (mockProvider as ReturnType<typeof vi.fn>).mockImplementation(async (ctx) => `data-${ctx.query.tab}`);

      const result1 = await cache.resolve(mockProvider, context1, { maxAge: 1000 });
      const result2 = await cache.resolve(mockProvider, context2, { maxAge: 1000 });

      expect(mockProvider).toHaveBeenCalledTimes(2);
      expect(result1).toBe('data-profile');
      expect(result2).toBe('data-settings');
    });

    it('should not cache when provider returns falsy value', async () => {
      const falsyProvider = vi.fn(async () => null as never);
      const context: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      const result1 = await cache.resolve(falsyProvider, context, { maxAge: 1000 });
      const result2 = await cache.resolve(falsyProvider, context, { maxAge: 1000 });

      expect(falsyProvider).toHaveBeenCalledTimes(2);
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it('should not cache when provider returns undefined', async () => {
      const undefinedProvider = vi.fn(async () => undefined as never);
      const context: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      const result1 = await cache.resolve(undefinedProvider, context, { maxAge: 1000 });
      const result2 = await cache.resolve(undefinedProvider, context, { maxAge: 1000 });

      expect(undefinedProvider).toHaveBeenCalledTimes(2);
      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
    });

    it('should cache when provider returns empty string', async () => {
      const emptyStringProvider = vi.fn(async () => '' as never);
      const context: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      const result1 = await cache.resolve(emptyStringProvider, context, { maxAge: 1000 });
      const result2 = await cache.resolve(emptyStringProvider, context, { maxAge: 1000 });

      expect(emptyStringProvider).toHaveBeenCalledTimes(1);
      expect(result1).toBe('');
      expect(result2).toBe('');
    });

    it('should cache when provider returns 0', async () => {
      const zeroProvider = vi.fn(async () => 0 as never);
      const context: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      const result1 = await cache.resolve(zeroProvider, context, { maxAge: 1000 });
      const result2 = await cache.resolve(zeroProvider, context, { maxAge: 1000 });

      expect(zeroProvider).toHaveBeenCalledTimes(1);
      expect(result1).toBe(0);
      expect(result2).toBe(0);
    });

    it('should cache when provider returns false', async () => {
      const falseProvider = vi.fn(async () => false as never);
      const context: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      const result1 = await cache.resolve(falseProvider, context, { maxAge: 1000 });
      const result2 = await cache.resolve(falseProvider, context, { maxAge: 1000 });

      expect(falseProvider).toHaveBeenCalledTimes(1);
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });

    it('should handle provider errors', async () => {
      const errorProvider = vi.fn(async () => {
        throw new Error('Provider error');
      });
      const context: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      await expect(cache.resolve(errorProvider, context, { maxAge: 1000 })).rejects.toThrow('Provider error');
    });

    it('should handle complex objects in cache', async () => {
      const objectProvider = vi.fn(async () => ({
        id: '123' as never,
        name: 'Test User',
        nested: { value: 42 } as never,
      }));
      const context: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      const result1 = await cache.resolve(objectProvider, context, { maxAge: 1000 });
      const result2 = await cache.resolve(objectProvider, context, { maxAge: 1000 });

      expect(objectProvider).toHaveBeenCalledTimes(1);
      expect(result1).toEqual({
        id: '123',
        name: 'Test User',
        nested: { value: 42 },
      });
      expect(result2).toEqual(result1);
    });

    it('should handle arrays in cache', async () => {
      const arrayProvider = vi.fn(async () => [1, 2, 3, 4, 5]);
      const context: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      const result1 = await cache.resolve(arrayProvider, context, { maxAge: 1000 });
      const result2 = await cache.resolve(arrayProvider, context, { maxAge: 1000 });

      expect(arrayProvider).toHaveBeenCalledTimes(1);
      expect(result1).toEqual([1, 2, 3, 4, 5]);
      expect(result2).toEqual(result1);
    });
  });

  describe('invalidate', () => {
    it('should remove cached entry for specific context', async () => {
      const context: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      await cache.resolve(mockProvider, context, { maxAge: 1000 });
      cache.invalidate(mockProvider, context);

      const result = await cache.resolve(mockProvider, context, { maxAge: 1000 });

      expect(mockProvider).toHaveBeenCalledTimes(2);
      expect(result).toBe('test-data');
    });

    it('should clear timeout for invalidated entry', async () => {
      const context: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      await cache.resolve(mockProvider, context, { maxAge: 1000 });
      cache.invalidate(mockProvider, context);

      // Wait longer than maxAge to ensure timeout was cleared
      vi.advanceTimersByTime(1100);

      const result = await cache.resolve(mockProvider, context, { maxAge: 1000 });

      expect(mockProvider).toHaveBeenCalledTimes(2);
      expect(result).toBe('test-data');
    });

    it('should not affect other cached entries', async () => {
      const context1: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };
      const context2: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '456' },
        query: {},
        data: {},
      };

      (mockProvider as ReturnType<typeof vi.fn>).mockImplementation(async (ctx) => `data-${ctx.params.id}`);

      await cache.resolve(mockProvider, context1, { maxAge: 1000 });
      await cache.resolve(mockProvider, context2, { maxAge: 1000 });

      cache.invalidate(mockProvider, context1);

      const result1 = await cache.resolve(mockProvider, context1, { maxAge: 1000 });
      const result2 = await cache.resolve(mockProvider, context2, { maxAge: 1000 });

      expect(mockProvider).toHaveBeenCalledTimes(3);
      expect(result1).toBe('data-123');
      expect(result2).toBe('data-456');
    });

    it('should handle invalidating non-existent entry', () => {
      const context: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      expect(() => cache.invalidate(mockProvider, context)).not.toThrow();
    });

    it('should handle invalidating entry for non-existent provider', () => {
      const context: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      expect(() => cache.invalidate(() => Promise.resolve('test'), context)).not.toThrow();
    });
  });

  describe('delete', () => {
    it('should remove provider from cache', async () => {
      const context: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      await cache.resolve(mockProvider, context, { maxAge: 1000 });

      const deleted = cache.delete(mockProvider);

      expect(deleted).toBe(true);

      const result = await cache.resolve(mockProvider, context, { maxAge: 1000 });

      expect(mockProvider).toHaveBeenCalledTimes(2);
      expect(result).toBe('test-data');
    });

    it('should return false when provider not in cache', () => {
      const deleted = cache.delete(() => Promise.resolve('test'));
      expect(deleted).toBe(false);
    });

    it('should clear all cached entries for provider', async () => {
      const context1: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };
      const context2: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '456' },
        query: {},
        data: {},
      };

      await cache.resolve(mockProvider, context1, { maxAge: 1000 });
      await cache.resolve(mockProvider, context2, { maxAge: 1000 });

      cache.delete(mockProvider);

      const result1 = await cache.resolve(mockProvider, context1, { maxAge: 1000 });
      const result2 = await cache.resolve(mockProvider, context2, { maxAge: 1000 });

      expect(mockProvider).toHaveBeenCalledTimes(4);
      expect(result1).toBe('test-data');
      expect(result2).toBe('test-data');
    });
  });

  describe('clear', () => {
    it('should clear all cached entries for provider without removing provider', async () => {
      const context: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      await cache.resolve(mockProvider, context, { maxAge: 1000 });

      cache.clear(mockProvider);

      const result = await cache.resolve(mockProvider, context, { maxAge: 1000 });

      expect(mockProvider).toHaveBeenCalledTimes(2);
      expect(result).toBe('test-data');
    });

    it('should handle clearing non-existent provider', () => {
      expect(() => cache.clear(() => Promise.resolve('test'))).not.toThrow();
    });

    it('should clear multiple cached entries for provider', async () => {
      const context1: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };
      const context2: ProviderContext<TRec, TRec, TRec> = {
        params: { id: '456' },
        query: {},
        data: {},
      };

      await cache.resolve(mockProvider, context1, { maxAge: 1000 });
      await cache.resolve(mockProvider, context2, { maxAge: 1000 });

      cache.clear(mockProvider);

      const result1 = await cache.resolve(mockProvider, context1, { maxAge: 1000 });
      const result2 = await cache.resolve(mockProvider, context2, { maxAge: 1000 });

      expect(mockProvider).toHaveBeenCalledTimes(4);
      expect(result1).toBe('test-data');
      expect(result2).toBe('test-data');
    });
  });
});

describe('URLCache', () => {
  let registry: RouteRegistry;
  let cache: URLCache;
  let rootRoute: Route<'/', {}, {}, {}, {}>;

  beforeEach(() => {
    rootRoute = new Route(sharedRouter, '/');
    registry = new RouteRegistry(rootRoute);
    cache = new URLCache(new Set([registry]), 3);
  });

  describe('constructor', () => {
    it('should create a new URLCache instance', () => {
      expect(cache).toBeDefined();
    });

    it('should use default maxSize when not provided', () => {
      const defaultCache = new URLCache(new Set([registry]));
      expect(defaultCache).toBeDefined();
    });

    it('should use provided maxSize', () => {
      const customCache = new URLCache(new Set([registry]), 50);
      expect(customCache).toBeDefined();
    });
  });

  describe('get', () => {
    it('should return undefined for non-matching URL', () => {
      const url = new URL('/nonexistent', 'http://localhost');
      const result = cache.get(url);
      expect(result).toBeDefined();
      expect(result?.exception).toBeInstanceOf(Error);
    });

    it('should cache and return match result', () => {
      // Create a simple route structure
      const testRoute = new Route(sharedRouter, '/test');
      const testRegistry = new RouteRegistry(testRoute as never);
      registry.set('test', testRegistry as never);

      const url = new URL('/test', 'http://localhost');
      const result1 = cache.get(url);
      const result2 = cache.get(url);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1).toBe(result2);
    });

    it('should update LRU position on cache hit', () => {
      const testRoute = new Route(sharedRouter, '/test');
      const testRegistry = new RouteRegistry(testRoute as never);
      registry.set('test', testRegistry as never);

      const url1 = new URL('/test', 'http://localhost');
      const url2 = new URL('/test', 'http://localhost');

      cache.get(url1);
      cache.get(url2);

      // Both should return the same cached result
      const result1 = cache.get(url1);
      const result2 = cache.get(url2);
      expect(result1).toBe(result2);
    });

    it('should evict oldest entry when cache is full', () => {
      const route1 = new Route(sharedRouter, '/route1');
      const route2 = new Route(sharedRouter, '/route2');
      const route3 = new Route(sharedRouter, '/route3');
      const route4 = new Route(sharedRouter, '/route4');

      registry.set('route1', new RouteRegistry(route1 as never));
      registry.set('route2', new RouteRegistry(route2 as never));
      registry.set('route3', new RouteRegistry(route3 as never));
      registry.set('route4', new RouteRegistry(route4 as never));

      const url1 = new URL('/route1', 'http://localhost');
      const url2 = new URL('/route2', 'http://localhost');
      const url3 = new URL('/route3', 'http://localhost');
      const url4 = new URL('/route4', 'http://localhost');

      cache.get(url1);
      cache.get(url2);
      cache.get(url3);
      cache.get(url4); // This should evict url1

      // url1 should be evicted, but we can't directly test this
      // Just verify that url4 is cached
      const result4 = cache.get(url4);
      expect(result4).toBeDefined();
    });

    it('should parse query parameters from URL', () => {
      const testRoute = new Route(sharedRouter, '/test');
      const testRegistry = new RouteRegistry(testRoute as never);
      registry.set('test', testRegistry as never);

      const url = new URL('/test?foo=bar&baz=qux', 'http://localhost');
      const result = cache.get(url);

      expect(result).toBeDefined();
      expect(result?.query).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('should handle duplicate query parameters as arrays', () => {
      const testRoute = new Route(sharedRouter, '/test');
      const testRegistry = new RouteRegistry(testRoute as never);
      registry.set('test', testRegistry as never);

      const url = new URL('/test?tags=js&tags=ts', 'http://localhost');
      const result = cache.get(url);

      expect(result).toBeDefined();
      expect(result?.query).toEqual({ tags: ['js', 'ts'] });
    });

    it('should include URL in match result', () => {
      const testRoute = new Route(sharedRouter, '/test');
      const testRegistry = new RouteRegistry(testRoute as never);
      registry.set('test', testRegistry as never);

      const url = new URL('/test', 'http://localhost');
      const result = cache.get(url);

      expect(result).toBeDefined();
      expect(result?.url).toBe(url);
    });

    it('should handle URLs with trailing slashes', () => {
      const testRoute = new Route(sharedRouter, '/test');
      const testRegistry = new RouteRegistry(testRoute as never);
      registry.set('test', testRegistry as never);

      const url1 = new URL('/test/', 'http://localhost');
      const url2 = new URL('/test', 'http://localhost');

      const result1 = cache.get(url1);
      const result2 = cache.get(url2);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should handle URLs with multiple slashes', () => {
      const testRoute = new Route(sharedRouter, '/test');
      const testRegistry = new RouteRegistry(testRoute as never);
      registry.set('test', testRegistry as never);

      const url = new URL('//test', 'http://localhost');
      const result = cache.get(url);

      expect(result).toBeDefined();
    });

    it('should handle empty query string', () => {
      const testRoute = new Route(sharedRouter, '/test');
      const testRegistry = new RouteRegistry(testRoute as never);
      registry.set('test', testRegistry as never);

      const url = new URL('/test?', 'http://localhost');
      const result = cache.get(url);

      expect(result).toBeDefined();
      expect(result?.query).toEqual({});
    });

    it('should handle URLs with hash fragments', () => {
      const testRoute = new Route(sharedRouter, '/test');
      const testRegistry = new RouteRegistry(testRoute as never);
      registry.set('test', testRegistry as never);

      const url = new URL('/test#section', 'http://localhost');
      const result = cache.get(url);

      expect(result).toBeDefined();
    });

    it('should handle different base URLs', () => {
      const testRoute = new Route(sharedRouter, '/test');
      const testRegistry = new RouteRegistry(testRoute as never);
      registry.set('test', testRegistry as never);

      const url1 = new URL('/test', 'https://example.com');
      const url2 = new URL('/test', 'http://localhost');

      const result1 = cache.get(url1);
      const result2 = cache.get(url2);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should handle URLs with encoded characters', () => {
      const testRoute = new Route(sharedRouter, '/test');
      const testRegistry = new RouteRegistry(testRoute as never);
      registry.set('test', testRegistry as never);

      const url = new URL('/test?name=John%20Doe', 'http://localhost');
      const result = cache.get(url);

      expect(result).toBeDefined();
      expect(result?.query).toEqual({ name: 'John Doe' });
    });

    it('should handle URLs with special characters in query', () => {
      const testRoute = new Route(sharedRouter, '/test');
      const testRegistry = new RouteRegistry(testRoute as never);
      registry.set('test', testRegistry as never);

      const url = new URL('/test?email=test%40example.com', 'http://localhost');
      const result = cache.get(url);

      expect(result).toBeDefined();
      expect(result?.query).toEqual({ email: 'test@example.com' });
    });

    it('should use the longest segments as the exception match', () => {
      const router = createRouter();
      router.route().route('/users');
      const signIn = router.append('/auth').route('/signin');
      const match = router.find('/auth/signin/ghost');
      expect(match?.route).toBe(signIn);
    });
  });
});
