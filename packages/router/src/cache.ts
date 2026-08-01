import { anchor, isBrowser } from '@anchorlib/core';
import { UnknownError } from './error.js';
import type { RouteRegistry } from './registry.js';
import type {
  CachedRouteData,
  MatchResult,
  ProviderCache,
  ProviderOptions,
  RouteContext,
  TRec,
  UnknownProvider,
  UnknownRoute,
} from './types.js';

export type RouteCacheEntry = {
  key: string;
  value: CachedRouteData;
};

export type RouteCacheSnapshot = {
  name: string;
  cache: Array<RouteCacheEntry>;
};

/**
 * A cache for route provider data with time-based expiration.
 *
 * Extends WeakMap to store provider results keyed by provider instances.
 * Each provider has its own Map of cached entries keyed by params and query.
 *
 * @template T - The type of data returned by providers
 */
export class RouteCache extends Map<string, ProviderCache> {
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
   * @param name - The name of the provider
   * @param provider - The provider function to resolve
   * @param context - The provider context containing params, query, and data
   * @param options - Optional provider options including maxAge for caching
   * @param hydration - Whether to use caching for hydration purposes
   * @returns A promise that resolves to the provider's data
   */
  public async resolve<T>(
    name: string,
    provider: UnknownProvider,
    context: RouteContext<TRec, TRec, TRec>,
    options?: ProviderOptions,
    hydration?: boolean
  ): Promise<T> {
    const maxAge = (options?.maxAge ?? this.route.options?.maxAge)!;
    if (!maxAge && !hydration) return (await provider(context)) as T;

    if (!this.has(name)) {
      this.set(name, new Map());
    }

    const { params, query } = (anchor.get as (ctx: typeof context, silent: boolean) => typeof context)(context, true);

    const key = JSON.stringify({ params, query });
    const cache = this.get(name)!;
    const cached = cache.get(key);

    if (cached?.temporary) {
      cache.delete(key);
      return cached.data as T;
    }

    if (cached?.maxAge && Date.now() - cached.timestamp <= cached.maxAge) {
      return cached.data as T;
    }

    const data = await provider(context);

    if (data !== null && typeof data !== 'undefined') {
      let scheduler = 0;

      if (isBrowser() && maxAge) {
        scheduler = setTimeout(() => cache.delete(key), maxAge) as never as number;
      }

      if (!isBrowser() || maxAge) {
        cache.set(key, { data, timestamp: Date.now(), maxAge, scheduler });
      }
    }

    return data as T;
  }

  /**
   * Invalidates a cached entry for a specific provider and context.
   *
   * Removes the cached data and clears any pending expiration timeout.
   *
   * @param name - The name of the provider
   * @param context - The context identifying which cache entry to invalidate
   */
  public invalidate(name: string, context: RouteContext<TRec, TRec, TRec>): void {
    const { params, query } = (anchor.get as (ctx: typeof context, silent: boolean) => typeof context)(context, true);
    const key = JSON.stringify({ params, query });
    const cache = this.get(name);
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
   * @param name - The provider whose cache should be deleted
   * @returns true if the provider was in the cache, false otherwise
   */
  public delete(name: string): boolean {
    this.cleanup(name);
    return super.delete(name);
  }

  /**
   * Clears all cached entries for a provider without removing the provider itself.
   *
   * @param name - The provider whose cache should be cleared
   */
  public cleanup(name: string): void {
    this.get(name)?.clear();
  }

  public snapshot() {
    const snapshot: RouteCacheSnapshot[] = [];

    for (const [name, cache] of this.entries()) {
      const snapshotCache = [];

      for (const [key, value] of cache.entries()) {
        snapshotCache.push({ key, value });
      }

      snapshot.push({ name, cache: snapshotCache });
    }

    return snapshot;
  }

  public hydrate(snapshot: RouteCacheSnapshot[]) {
    try {
      for (const { name, cache } of snapshot) {
        if (!this.has(name)) {
          this.set(name, new Map());
        }

        const cacheMap = this.get(name)!;

        for (const { key, value } of cache) {
          if (value.maxAge) {
            value.timestamp = Date.now();
            value.scheduler = setTimeout(() => {
              cacheMap.delete(key);
            }, value.maxAge) as never as number;
          } else {
            value.temporary = true;
          }

          cacheMap.set(key, value);
        }
      }
    } catch (error) {
      console.error(new UnknownError('Error hydrating route cache.', error as Error));
    }
  }
}

/**
 * A cache for URL matching results with LRU (Least Recently Used) eviction.
 *
 * Caches parsed and matched route results to avoid repeated parsing and matching.
 * Uses a Map with LRU behavior - accessed entries are moved to the end,
 * and the oldest entry is evicted when the cache reaches maxSize.
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

      for (const segment of match.segments) {
        assignQuery(segment.route, segment.store, match.query);
      }

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

function assignQuery(route: UnknownRoute, store: RouteContext<any, any, any>, query: any) {
  for (const [key, value] of Object.entries(query)) {
    if (route.queryKeys.has(key)) {
      store.query[key] = value;
    }
  }
}
