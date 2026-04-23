import type { ProviderContext, TRec } from './types.js';

export class RouterContext<TParams, TQueryParams, TData> {
  private sources: ProviderContext<TRec, TRec, TRec>[] = [];

  public params = new Proxy(
    {},
    {
      get: (target, key) => {
        for (const ctx of this.sources) {
          if (ctx.params[key as never]) return ctx.params[key as never];
        }

        return target[key as never];
      },
    }
  ) as TParams;
  public query = new Proxy(
    {},
    {
      get: (target, key) => {
        for (const ctx of this.sources) {
          if (ctx.query[key as never]) return ctx.query[key as never];
        }

        return target[key as never];
      },
    }
  ) as TQueryParams;
  public data = new Proxy(
    {},
    {
      get: (target, key) => {
        for (const ctx of this.sources) {
          if (ctx.data[key as never]) return ctx.data[key as never];
        }

        return target[key as never];
      },
    }
  ) as TData;

  public attach(context: ProviderContext<TRec, TRec, TRec>) {
    if (!this.sources.includes(context)) {
      this.sources.unshift(context);
    }
  }

  public detach(context: ProviderContext<TRec, TRec, TRec>) {
    if (this.sources.includes(context)) {
      this.sources.splice(this.sources.indexOf(context), 1);
    }
  }

  public clear() {
    this.sources = [];
  }
}
