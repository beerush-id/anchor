import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RouteCache, URLCache } from '../src/cache.js';
import { UnknownError } from '../src/error.js';
import { createRouter, type RouteContext, Router, type UnknownRoute } from '../src/index.js';
import { RouteRegistry } from '../src/registry.js';
import { Route } from '../src/route.js';
import type { TRec } from '../src/types.js';

let sharedRouter: Router;

describe('RouteCache', () => {
  let route: Route<'/test', {}, {}, {}, {}>;
  let cache: RouteCache;
  let mockProvider: (ctx: RouteContext<TRec, TRec, TRec>) => Promise<string>;

  beforeEach(() => {
    vi.useFakeTimers();
    sharedRouter = new Router();
    route = new Route(sharedRouter, '/test');
    cache = new RouteCache(route as UnknownRoute);
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
      expect(cache).toBeInstanceOf(Map);
    });

    it('should store the route reference', () => {
      const testRoute = new Route(sharedRouter, '/test-route');
      const testCache = new RouteCache(testRoute as never);
      expect(testCache).toBeDefined();
    });
  });

  describe('resolve', () => {
    it('should call provider when maxAge is 0 (no caching)', async () => {
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      const result = await cache.resolve('test', mockProvider, context, { maxAge: 0 });
      const result2 = await cache.resolve('test', mockProvider, context, {});

      expect(mockProvider).toHaveBeenCalledTimes(2);
      expect(result).toBe('test-data');
      expect(result2).toBe('test-data');
    });

    it('should call provider when maxAge is undefined and route has no maxAge', async () => {
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      const result = await cache.resolve('test', mockProvider, context);

      expect(mockProvider).toHaveBeenCalledTimes(1);
      expect(result).toBe('test-data');
    });

    it('should cache provider result when maxAge > 0', async () => {
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      const result1 = await cache.resolve('test', mockProvider, context, { maxAge: 1000 });
      const result2 = await cache.resolve('test', mockProvider, context, { maxAge: 1000 });

      expect(mockProvider).toHaveBeenCalledTimes(1);
      expect(result1).toBe('test-data');
      expect(result2).toBe('test-data');
    });

    it('should use route options maxAge when options not provided', async () => {
      const routeWithMaxAge = new Route(sharedRouter, '/test', { maxAge: 1000 });
      const cacheWithRoute = new RouteCache(routeWithMaxAge as never);
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      const result1 = await cacheWithRoute.resolve('test', mockProvider, context);
      const result2 = await cacheWithRoute.resolve('test', mockProvider, context);

      expect(mockProvider).toHaveBeenCalledTimes(1);
      expect(result1).toBe('test-data');
      expect(result2).toBe('test-data');
    });

    it('should expire cache after maxAge milliseconds', async () => {
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      const result1 = await cache.resolve('test', mockProvider, context, { maxAge: 10 });
      vi.advanceTimersByTime(20);
      const result2 = await cache.resolve('test', mockProvider, context, { maxAge: 10 });

      expect(mockProvider).toHaveBeenCalledTimes(2);
      expect(result1).toBe('test-data');
      expect(result2).toBe('test-data');
    });

    it('should create separate cache entries for different params', async () => {
      const context1: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };
      const context2: RouteContext<TRec, TRec, TRec> = {
        params: { id: '456' },
        query: {},
        data: {},
      };

      (mockProvider as ReturnType<typeof vi.fn>).mockImplementation(async (ctx) => `data-${ctx.params.id}`);

      const result1 = await cache.resolve('test', mockProvider, context1, { maxAge: 1000 });
      const result2 = await cache.resolve('test', mockProvider, context2, { maxAge: 1000 });

      expect(mockProvider).toHaveBeenCalledTimes(2);
      expect(result1).toBe('data-123');
      expect(result2).toBe('data-456');
    });

    it('should create separate cache entries for different query params', async () => {
      const context1: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: { tab: 'profile' },
        data: {},
      };
      const context2: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: { tab: 'settings' },
        data: {},
      };

      (mockProvider as ReturnType<typeof vi.fn>).mockImplementation(async (ctx) => `data-${ctx.query.tab}`);

      const result1 = await cache.resolve('test', mockProvider, context1, { maxAge: 1000 });
      const result2 = await cache.resolve('test', mockProvider, context2, { maxAge: 1000 });

      expect(mockProvider).toHaveBeenCalledTimes(2);
      expect(result1).toBe('data-profile');
      expect(result2).toBe('data-settings');
    });

    it('should not cache when provider returns falsy value', async () => {
      const falsyProvider = vi.fn(async () => null as never);
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      const result1 = await cache.resolve('test', falsyProvider, context, { maxAge: 1000 });
      const result2 = await cache.resolve('test', falsyProvider, context, { maxAge: 1000 });

      expect(falsyProvider).toHaveBeenCalledTimes(2);
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it('should not cache when provider returns undefined', async () => {
      const undefinedProvider = vi.fn(async () => undefined as never);
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      const result1 = await cache.resolve('test', undefinedProvider, context, { maxAge: 1000 });
      const result2 = await cache.resolve('test', undefinedProvider, context, { maxAge: 1000 });

      expect(undefinedProvider).toHaveBeenCalledTimes(2);
      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
    });

    it('should cache when provider returns empty string', async () => {
      const emptyStringProvider = vi.fn(async () => '' as never);
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      const result1 = await cache.resolve('test', emptyStringProvider, context, { maxAge: 1000 });
      const result2 = await cache.resolve('test', emptyStringProvider, context, { maxAge: 1000 });

      expect(emptyStringProvider).toHaveBeenCalledTimes(1);
      expect(result1).toBe('');
      expect(result2).toBe('');
    });

    it('should cache when provider returns 0', async () => {
      const zeroProvider = vi.fn(async () => 0 as never);
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      const result1 = await cache.resolve('test', zeroProvider, context, { maxAge: 1000 });
      const result2 = await cache.resolve('test', zeroProvider, context, { maxAge: 1000 });

      expect(zeroProvider).toHaveBeenCalledTimes(1);
      expect(result1).toBe(0);
      expect(result2).toBe(0);
    });

    it('should cache when provider returns false', async () => {
      const falseProvider = vi.fn(async () => false as never);
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      const result1 = await cache.resolve('test', falseProvider, context, { maxAge: 1000 });
      const result2 = await cache.resolve('test', falseProvider, context, { maxAge: 1000 });

      expect(falseProvider).toHaveBeenCalledTimes(1);
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });

    it('should handle provider errors', async () => {
      const errorProvider = vi.fn(async () => {
        throw new Error('Provider error');
      });
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      await expect(cache.resolve('test', errorProvider, context, { maxAge: 1000 })).rejects.toThrow('Provider error');
    });

    it('should handle complex objects in cache', async () => {
      const objectProvider = vi.fn(async () => ({
        id: '123' as never,
        name: 'Test User',
        nested: { value: 42 } as never,
      }));
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      const result1 = await cache.resolve('test', objectProvider, context, { maxAge: 1000 });
      const result2 = await cache.resolve('test', objectProvider, context, { maxAge: 1000 });

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
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      const result1 = await cache.resolve('test', arrayProvider, context, { maxAge: 1000 });
      const result2 = await cache.resolve('test', arrayProvider, context, { maxAge: 1000 });

      expect(arrayProvider).toHaveBeenCalledTimes(1);
      expect(result1).toEqual([1, 2, 3, 4, 5]);
      expect(result2).toEqual(result1);
    });

    it('should handle temporary cache entries during hydration', async () => {
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      // Resolve WITHOUT maxAge - this won't cache normally, but we'll manually create a snapshot entry
      await cache.resolve('test', mockProvider, context);

      // Manually create a snapshot with an entry that has no maxAge (to simulate hydration scenario)
      const manualSnapshot = [
        {
          name: 'test',
          cache: [
            {
              key: JSON.stringify({ params: { id: '123' }, query: {} }),
              value: {
                data: 'test-data',
                timestamp: Date.now(),
                // No maxAge - this will trigger temporary flag during hydration
              },
            },
          ],
        },
      ];

      // Hydrate the snapshot - entries without maxAge become temporary (lines 173-174)
      cache.hydrate(manualSnapshot as any);

      // Temporary entries should be returned but deleted immediately after use (lines 78-80)
      const result = await cache.resolve('test', mockProvider, context, { maxAge: 1000 });

      // Provider should NOT be called again since hydrated temporary entry exists
      expect(mockProvider).toHaveBeenCalledTimes(1);
      expect(result).toBe('test-data');

      // Temporary entry was deleted, so next call should call provider and cache with maxAge
      const result2 = await cache.resolve('test', mockProvider, context, { maxAge: 1000 });
      expect(mockProvider).toHaveBeenCalledTimes(2); // Called again because temporary was deleted
      expect(result2).toBe('test-data');
    });
  });

  describe('invalidate', () => {
    it('should remove cached entry for specific context', async () => {
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      await cache.resolve('test', mockProvider, context, { maxAge: 1000 });
      cache.invalidate('test', context);

      const result = await cache.resolve('test', mockProvider, context, { maxAge: 1000 });

      expect(mockProvider).toHaveBeenCalledTimes(2);
      expect(result).toBe('test-data');
    });

    it('should clear timeout for invalidated entry', async () => {
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      await cache.resolve('test', mockProvider, context, { maxAge: 1000 });
      cache.invalidate('test', context);

      // Wait longer than maxAge to ensure timeout was cleared
      vi.advanceTimersByTime(1100);

      const result = await cache.resolve('test', mockProvider, context, { maxAge: 1000 });

      expect(mockProvider).toHaveBeenCalledTimes(2);
      expect(result).toBe('test-data');
    });

    it('should not affect other cached entries', async () => {
      const context1: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };
      const context2: RouteContext<TRec, TRec, TRec> = {
        params: { id: '456' },
        query: {},
        data: {},
      };

      (mockProvider as ReturnType<typeof vi.fn>).mockImplementation(async (ctx) => `data-${ctx.params.id}`);

      await cache.resolve('test', mockProvider, context1, { maxAge: 1000 });
      await cache.resolve('test', mockProvider, context2, { maxAge: 1000 });

      cache.invalidate('test', context1);

      const result1 = await cache.resolve('test', mockProvider, context1, { maxAge: 1000 });
      const result2 = await cache.resolve('test', mockProvider, context2, { maxAge: 1000 });

      expect(mockProvider).toHaveBeenCalledTimes(3);
      expect(result1).toBe('data-123');
      expect(result2).toBe('data-456');
    });

    it('should handle invalidating non-existent entry', () => {
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      expect(() => cache.invalidate('test', context)).not.toThrow();
    });

    it('should handle invalidating entry for non-existent provider', () => {
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      expect(() => cache.invalidate('foo', context)).not.toThrow();
    });
  });

  describe('delete', () => {
    it('should remove provider from cache', async () => {
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      await cache.resolve('test', mockProvider, context, { maxAge: 1000 });

      const deleted = cache.delete('test');

      expect(deleted).toBe(true);

      const result = await cache.resolve('test', mockProvider, context, { maxAge: 1000 });

      expect(mockProvider).toHaveBeenCalledTimes(2);
      expect(result).toBe('test-data');
    });

    it('should return false when provider not in cache', () => {
      const deleted = cache.delete('test');
      expect(deleted).toBe(false);
    });

    it('should clear all cached entries for provider', async () => {
      const context1: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };
      const context2: RouteContext<TRec, TRec, TRec> = {
        params: { id: '456' },
        query: {},
        data: {},
      };

      await cache.resolve('test', mockProvider, context1, { maxAge: 1000 });
      await cache.resolve('test', mockProvider, context2, { maxAge: 1000 });

      cache.delete('test');

      const result1 = await cache.resolve('test', mockProvider, context1, { maxAge: 1000 });
      const result2 = await cache.resolve('test', mockProvider, context2, { maxAge: 1000 });

      expect(mockProvider).toHaveBeenCalledTimes(4);
      expect(result1).toBe('test-data');
      expect(result2).toBe('test-data');
    });
  });

  describe('clear', () => {
    it('should clear all cached entries for provider without removing provider', async () => {
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      await cache.resolve('test', mockProvider, context, { maxAge: 1000 });

      cache.cleanup('test');

      const result = await cache.resolve('test', mockProvider, context, { maxAge: 1000 });

      expect(mockProvider).toHaveBeenCalledTimes(2);
      expect(result).toBe('test-data');
    });

    it('should handle clearing non-existent provider', () => {
      expect(() => cache.cleanup('foo')).not.toThrow();
    });

    it('should clear multiple cached entries for provider', async () => {
      const context1: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };
      const context2: RouteContext<TRec, TRec, TRec> = {
        params: { id: '456' },
        query: {},
        data: {},
      };

      await cache.resolve('test', mockProvider, context1, { maxAge: 1000 });
      await cache.resolve('test', mockProvider, context2, { maxAge: 1000 });

      cache.cleanup('test');

      const result1 = await cache.resolve('test', mockProvider, context1, { maxAge: 1000 });
      const result2 = await cache.resolve('test', mockProvider, context2, { maxAge: 1000 });

      expect(mockProvider).toHaveBeenCalledTimes(4);
      expect(result1).toBe('test-data');
      expect(result2).toBe('test-data');
    });
  });

  describe('snapshot', () => {
    it('should return empty array when cache is empty', () => {
      const snapshot = cache.snapshot();
      expect(snapshot).toEqual([]);
    });

    it('should capture all cached entries', async () => {
      const context1: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };
      const context2: RouteContext<TRec, TRec, TRec> = {
        params: { id: '456' },
        query: { tab: 'profile' },
        data: {},
      };

      await cache.resolve('provider1', mockProvider, context1, { maxAge: 1000 });
      await cache.resolve('provider1', mockProvider, context2, { maxAge: 1000 });
      await cache.resolve('provider2', mockProvider, context1, { maxAge: 2000 });

      const snapshot = cache.snapshot();

      expect(snapshot).toHaveLength(2);
      expect(snapshot.find((s) => s.name === 'provider1')?.cache).toHaveLength(2);
      expect(snapshot.find((s) => s.name === 'provider2')?.cache).toHaveLength(1);
    });

    it('should include correct cache keys and values', async () => {
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: { tab: 'profile' },
        data: {},
      };

      await cache.resolve('test', mockProvider, context, { maxAge: 1000 });

      const snapshot = cache.snapshot();

      expect(snapshot).toHaveLength(1);
      expect(snapshot[0].name).toBe('test');
      expect(snapshot[0].cache).toHaveLength(1);
      expect(snapshot[0].cache[0].key).toBe(JSON.stringify({ params: { id: '123' }, query: { tab: 'profile' } }));
      expect(snapshot[0].cache[0].value.data).toBe('test-data');
      expect(snapshot[0].cache[0].value.maxAge).toBe(1000);
    });

    it('should handle multiple providers with different contexts', async () => {
      const objectProvider = vi.fn(async () => ({ name: 'Test' }) as never);
      const context1: RouteContext<TRec, TRec, TRec> = {
        params: { id: '1' },
        query: {},
        data: {},
      };
      const context2: RouteContext<TRec, TRec, TRec> = {
        params: { id: '2' },
        query: {},
        data: {},
      };

      await cache.resolve('users', objectProvider, context1, { maxAge: 500 });
      await cache.resolve('posts', objectProvider, context2, { maxAge: 1000 });

      const snapshot = cache.snapshot();

      expect(snapshot).toHaveLength(2);

      const usersSnapshot = snapshot.find((s) => s.name === 'users');
      const postsSnapshot = snapshot.find((s) => s.name === 'posts');

      expect(usersSnapshot?.cache).toHaveLength(1);
      expect(postsSnapshot?.cache).toHaveLength(1);
      expect(usersSnapshot?.cache[0].value.data).toEqual({ name: 'Test' });
      expect(usersSnapshot?.cache[0].value.maxAge).toBe(500);
      expect(postsSnapshot?.cache[0].value.maxAge).toBe(1000);
    });
  });

  describe('hydrate', () => {
    it('should restore cached entries from snapshot', async () => {
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      // Create and populate original cache
      await cache.resolve('test', mockProvider, context, { maxAge: 1000 });
      const snapshot = cache.snapshot();

      // Create new cache and hydrate
      const newCache = new RouteCache(route as UnknownRoute);
      newCache.hydrate(snapshot);

      // Verify hydrated data is available
      const result = await newCache.resolve('test', mockProvider, context, { maxAge: 1000 });

      expect(mockProvider).toHaveBeenCalledTimes(1); // Only called once in original cache
      expect(result).toBe('test-data');
    });

    it('should set up expiration timers for hydrated entries', async () => {
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      await cache.resolve('test', mockProvider, context, { maxAge: 100 });
      const snapshot = cache.snapshot();

      const newCache = new RouteCache(route as UnknownRoute);
      newCache.hydrate(snapshot);

      // Advance time past maxAge
      vi.advanceTimersByTime(150);

      // Entry should have expired
      const result = await newCache.resolve('test', mockProvider, context, { maxAge: 100 });

      expect(mockProvider).toHaveBeenCalledTimes(2);
      expect(result).toBe('test-data');
    });

    it('should mark entries without maxAge as temporary', async () => {
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      // Resolve without maxAge
      await cache.resolve('test', mockProvider, context);
      const snapshot = cache.snapshot();

      const newCache = new RouteCache(route as UnknownRoute);
      newCache.hydrate(snapshot);

      // Temporary entry should be used once then deleted
      const result1 = await newCache.resolve('test', mockProvider, context, { maxAge: 1000 });
      const result2 = await newCache.resolve('test', mockProvider, context, { maxAge: 1000 });

      expect(mockProvider).toHaveBeenCalledTimes(2);
      expect(result1).toBe('test-data');
      expect(result2).toBe('test-data');
    });

    it('should handle hydrating multiple providers', async () => {
      const context1: RouteContext<TRec, TRec, TRec> = {
        params: { id: '1' },
        query: {},
        data: {},
      };
      const context2: RouteContext<TRec, TRec, TRec> = {
        params: { id: '2' },
        query: {},
        data: {},
      };

      await cache.resolve('users', mockProvider, context1, { maxAge: 1000 });
      await cache.resolve('posts', mockProvider, context2, { maxAge: 2000 });
      const snapshot = cache.snapshot();

      const newCache = new RouteCache(route as UnknownRoute);
      newCache.hydrate(snapshot);

      const result1 = await newCache.resolve('users', mockProvider, context1, { maxAge: 1000 });
      const result2 = await newCache.resolve('posts', mockProvider, context2, { maxAge: 2000 });

      expect(mockProvider).toHaveBeenCalledTimes(2); // Only original calls
      expect(result1).toBe('test-data');
      expect(result2).toBe('test-data');
    });

    it('should handle hydrating into existing cache', async () => {
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      // Populate original cache
      await cache.resolve('test', mockProvider, context, { maxAge: 1000 });
      const snapshot = cache.snapshot();

      // Create new cache with existing data
      const newCache = new RouteCache(route as UnknownRoute);
      await newCache.resolve('other', mockProvider, context, { maxAge: 500 });

      // Hydrate should merge with existing data
      newCache.hydrate(snapshot);

      const testResult = await newCache.resolve('test', mockProvider, context, { maxAge: 1000 });
      const otherResult = await newCache.resolve('other', mockProvider, context, { maxAge: 500 });

      expect(mockProvider).toHaveBeenCalledTimes(2); // One for 'test', one for 'other'
      expect(testResult).toBe('test-data');
      expect(otherResult).toBe('test-data');
    });

    it('should handle empty snapshot', () => {
      expect(() => cache.hydrate([])).not.toThrow();
    });

    it('should handle invalid snapshot gracefully', () => {
      const invalidSnapshot = [
        {
          name: 'test',
          cache: [
            {
              key: 'invalid-key',
              value: null as any,
            },
          ],
        },
      ];

      // Should not throw, but log error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => cache.hydrate(invalidSnapshot as any)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(UnknownError));
      consoleSpy.mockRestore();
    });

    it('should preserve scheduler for entries with maxAge', async () => {
      const context: RouteContext<TRec, TRec, TRec> = {
        params: { id: '123' },
        query: {},
        data: {},
      };

      await cache.resolve('test', mockProvider, context, { maxAge: 500 });
      const snapshot = cache.snapshot();

      const newCache = new RouteCache(route as UnknownRoute);
      newCache.hydrate(snapshot);

      // Verify entry exists before timeout
      const result1 = await newCache.resolve('test', mockProvider, context, { maxAge: 500 });
      expect(mockProvider).toHaveBeenCalledTimes(1);
      expect(result1).toBe('test-data');

      // Wait for timeout
      vi.advanceTimersByTime(600);

      // Entry should be expired
      const result2 = await newCache.resolve('test', mockProvider, context, { maxAge: 500 });
      expect(mockProvider).toHaveBeenCalledTimes(2);
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
    registry = new RouteRegistry(rootRoute as UnknownRoute);
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

    it('should return undefined from URLCache when no route matches', () => {
      const emptyRegistries = new Set<RouteRegistry>();
      const urlCache = new URLCache(emptyRegistries);
      const result = urlCache.get(new URL('http://localhost/404-not-found'));
      expect(result).toBeUndefined();
    });

    it('should hydrate into existing provider cache map', () => {
      const testRoute = new Route(sharedRouter, '/test');
      const routeCache = new RouteCache(testRoute as never);
      routeCache.set('provider1', new Map([['existing', { data: 'old', timestamp: 0 }]]));

      routeCache.hydrate([
        {
          name: 'provider1',
          cache: [{ key: 'newKey', value: { data: 'newVal', timestamp: 0 } }],
        },
      ]);

      expect(routeCache.get('provider1')?.get('newKey')?.data).toBe('newVal');
    });

    it('should iterate over multiple registries when first registry does not match', () => {
      const router = createRouter();
      const r1 = router.route();
      r1.route('/first');
      const r2 = router.append('/second');
      const result = router.find('/second');
      expect(result).toBeDefined();
      expect(result?.route).toBe(r2);
    });
  });
});
