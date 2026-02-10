import { anchor, mutable } from '@anchorlib/core';
import { DEFAULT_CONFIG } from './constant.js';
import { parseQuery } from './query.js';
import { RouteRegistry } from './registry.js';
import type {
  MatchResult,
  ProviderCache,
  ProviderContext,
  ProviderOptions,
  TRec,
  UnknownProvider,
  UnknownRoute,
} from './types.js';

export class RouteCache extends WeakMap<UnknownProvider, ProviderCache> {
  constructor(private route: UnknownRoute) {
    super();
  }

  public async resolve<T>(
    provider: UnknownProvider,
    context: ProviderContext<TRec, TRec, TRec>,
    options?: ProviderOptions
  ): Promise<T> {
    const maxAge = options?.maxAge ?? this.route.options?.maxAge ?? DEFAULT_CONFIG.maxAge;
    if (!maxAge) return (await provider(context)) as T;

    if (!this.has(provider)) {
      this.set(provider, new Map());
    }

    const { params, query } = (anchor.get as (ctx: typeof context, strict: boolean) => typeof context)(context, false);

    const key = JSON.stringify({ params, query });
    const cache = this.get(provider)!;
    const cached = cache.get(key);

    if (cached && Date.now() - cached.timestamp <= maxAge) {
      return cached.data as T;
    }

    const data = await provider(context);
    if (data) {
      const scheduler = setTimeout(() => cache.delete(key), maxAge) as never as number;
      cache.set(key, { data, timestamp: Date.now(), scheduler });
    }

    return data as T;
  }

  public invalidate(provider: UnknownProvider, context: ProviderContext<TRec, TRec, TRec>): void {
    const { params, query } = (anchor.get as (ctx: typeof context, strict: boolean) => typeof context)(context, false);
    const key = JSON.stringify({ params, query });
    const cache = this.get(provider);
    const cached = cache?.get(key);

    if (cache && cached) {
      cache.delete(key);
      clearTimeout(cached.scheduler);
    }
  }

  public delete(provider: UnknownProvider): boolean {
    this.clear(provider);
    return super.delete(provider);
  }

  public clear(provider: UnknownProvider): void {
    this.get(provider)?.clear();
  }
}

export class URLCache {
  private cache = new Map<string, MatchResult>();

  constructor(
    private registry: RouteRegistry,
    private maxSize = 100
  ) {}

  public get(url: URL): MatchResult | undefined {
    const cacheKey = url.href;

    // Check cache first - return cached match if exists
    const cached = this.cache.get(cacheKey);
    if (cached) {
      // LRU: Move to end by deleting and re-inserting
      this.cache.delete(cacheKey);
      this.cache.set(cacheKey, cached);
      return cached;
    }

    // Not cached - parse, match, and create context
    const query = parseQuery(url.search);
    const pathname = url.pathname;

    const match = this.registry.match(pathname) as MatchResult;

    if (match) {
      match.url = url;
      match.query = query;
      match.context = mutable({ params: match.params, query, data: {} });

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
