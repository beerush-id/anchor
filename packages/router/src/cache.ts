import { anchor } from '@anchorlib/core';
import { DEFAULT_CONFIG } from './constant.js';
import type { ProviderCache, ProviderContext, ProviderOptions, TRec, UnknownProvider, UnknownRoute } from './types.js';

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
