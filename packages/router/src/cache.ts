import { anchor } from '@anchorlib/core';
import type { RouteRegistry } from './registry.js';
import type {
  MatchResult,
  ProviderCache,
  ProviderContext,
  ProviderOptions,
  TRec,
  UnknownProvider,
  UnknownRoute,
} from './types.js';

/**
 * A cache for route provider data with time-based expiration.
 *
 * Extends WeakMap to store provider results keyed by provider instances.
 * Each provider has its own Map of cached entries keyed by params and query.
 *
 * @template T - The type of data returned by providers
 *
 * @example
 * ```ts
 * const cache = new RouteCache(route);
 * const data = await cache.resolve(provider, context, { maxAge: 60000 });
 * ```
 */
export class RouteCache extends WeakMap<UnknownProvider, ProviderCache> {
  /**
   * Creates a new RouteCache instance.
   *
   * @param route - The route this cache is associated with, used for default options
   */
  constructor(private route: UnknownRoute) {
    super();
  }

  /**
   * Resolves a provider with caching support.
   *
   * If caching is enabled (maxAge > 0), checks for cached data first.
   * Returns cached data if it exists and hasn't expired.
   * Otherwise, calls the provider and caches the result.
   *
   * @template T - The type of data returned by the provider
   * @param provider - The provider function to resolve
   * @param context - The provider context containing params, query, and data
   * @param options - Optional provider options including maxAge for caching
   * @returns A promise that resolves to the provider's data
   *
   * @example
   * ```ts
   * const data = await cache.resolve(
   *   async (ctx) => await fetchUser(ctx.params.id),
   *   { params: { id: '123' }, query: {}, data: {} },
   *   { maxAge: 60000 }
   * );
   * ```
   */
  public async resolve<T>(
    provider: UnknownProvider,
    context: ProviderContext<TRec, TRec, TRec>,
    options?: ProviderOptions
  ): Promise<T> {
    const maxAge = options?.maxAge ?? this.route.options?.maxAge;
    if (!maxAge) return (await provider(context)) as T;

    if (!this.has(provider)) {
      this.set(provider, new Map());
    }

    const { params, query } = (anchor.get as (ctx: typeof context, silent: boolean) => typeof context)(context, true);

    const key = JSON.stringify({ params, query });
    const cache = this.get(provider)!;
    const cached = cache.get(key);

    if (cached && Date.now() - cached.timestamp <= maxAge) {
      return cached.data as T;
    }

    const data = await provider(context);
    if (data !== null && typeof data !== 'undefined') {
      const scheduler = setTimeout(() => cache.delete(key), maxAge) as never as number;
      cache.set(key, { data, timestamp: Date.now(), scheduler });
    }

    return data as T;
  }

  /**
   * Invalidates a cached entry for a specific provider and context.
   *
   * Removes the cached data and clears any pending expiration timeout.
   *
   * @param provider - The provider whose cache should be invalidated
   * @param context - The context identifying which cache entry to invalidate
   *
   * @example
   * ```ts
   * cache.invalidate(provider, { params: { id: '123' }, query: {}, data: {} });
   * ```
   */
  public invalidate(provider: UnknownProvider, context: ProviderContext<TRec, TRec, TRec>): void {
    const { params, query } = (anchor.get as (ctx: typeof context, silent: boolean) => typeof context)(context, true);
    const key = JSON.stringify({ params, query });
    const cache = this.get(provider);
    const cached = cache?.get(key);

    if (cache && cached) {
      cache.delete(key);
      clearTimeout(cached.scheduler);
    }
  }

  /**
   * Deletes all cached entries for a provider.
   *
   * Clears all cached data and removes the provider from the cache.
   *
   * @param provider - The provider to delete from the cache
   * @returns true if the provider was in the cache, false otherwise
   *
   * @example
   * ```ts
   * cache.delete(provider);
   * ```
   */
  public delete(provider: UnknownProvider): boolean {
    this.clear(provider);
    return super.delete(provider);
  }

  /**
   * Clears all cached entries for a provider without removing the provider itself.
   *
   * @param provider - The provider whose cache should be cleared
   *
   * @example
   * ```ts
   * cache.clear(provider);
   * ```
   */
  public clear(provider: UnknownProvider): void {
    this.get(provider)?.clear();
  }
}

/**
 * A cache for URL matching results with LRU (Least Recently Used) eviction.
 *
 * Caches parsed and matched route results to avoid repeated parsing and matching.
 * Uses a Map with LRU behavior - accessed entries are moved to the end,
 * and the oldest entry is evicted when the cache reaches maxSize.
 *
 * @example
 * ```ts
 * const cache = new URLCache(registry, 100);
 * const match = cache.get(new URL('/users/123', baseUrl));
 * ```
 */
export class URLCache {
  private cache = new Map<string, MatchResult>();

  /**
   * Creates a new URLCache instance.
   *
   * @param registries - The route registries to use for matching
   * @param maxSize - Maximum number of entries to cache (default: 100)
   */
  constructor(
    private registries: Set<RouteRegistry>,
    private maxSize = 100
  ) {}

  /**
   * Gets a cached match result for a URL, or creates one if not cached.
   *
   * If the URL is cached, returns the cached result and updates its LRU position.
   * Otherwise, parses the URL, matches it against the registry, and caches the result.
   * Evicts the oldest entry if the cache is at capacity.
   *
   * @param url - The URL to match
   * @returns The match result, or undefined if no match is found
   *
   * @example
   * ```ts
   * const match = cache.get(new URL('/users/123', baseUrl));
   * if (match) {
   *   console.log(match.route, match.params);
   * }
   * ```
   */
  public get(url: URL): MatchResult | undefined {
    if (!url) return;
    const cacheKey = url.href;

    // Check cache first - return cached match if exists
    const cached = this.cache.get(cacheKey);
    if (cached) {
      // LRU: Move to end by deleting and re-inserting
      this.cache.delete(cacheKey);
      this.cache.set(cacheKey, cached);
      return cached;
    }

    // Not cached - match and create context
    // const match = this.registry.match(url) as MatchResult;
    let match: MatchResult | undefined;

    for (const registry of this.registries) {
      const nextMatch = registry.match(url) as MatchResult;

      if (nextMatch) {
        if (nextMatch.exception && (!match || nextMatch.segments.length >= match.segments.length)) {
          match = nextMatch;
        }
        if (!nextMatch.exception) {
          match = nextMatch;
          break;
        }
      }
    }

    if (match) {
      match.url = url;

      // Don't cache exceptions.
      if (match.exception) {
        const lastSegment = match.segments[match.segments.length - 1];
        lastSegment.store.exception = match.exception;
        return match;
      }

      // Clear any exceptions from segments.
      match.segments.forEach((s) => (s.store.exception = undefined));

      // Evict oldest entry if at capacity
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey !== undefined) {
          this.cache.delete(firstKey);
        }
      }

      // Cache the complete match result
      this.cache.set(cacheKey, match);
    }

    return match;
  }
}
