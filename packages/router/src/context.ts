import type { RouteError } from './error.js';
import { createState } from './store.js';
import type { RouteContext, TRec } from './types.js';

export class RouterContext<TParams, TQueryParams, TData> {
  private sources: RouteContext<TRec, TRec, TRec>[] = [];
  private urlState = createState<string | undefined>(undefined);
  private exceptionState = createState<RouteError | undefined>(undefined);

  public get exception() {
    return this.exceptionState.value;
  }
  public set exception(value: RouteError | undefined) {
    this.exceptionState.value = value;
  }

  public get url() {
    return this.urlState.value;
  }
  public set url(value: string | undefined) {
    this.urlState.value = value;
  }

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

  public attach(context: RouteContext<TRec, TRec, TRec>) {
    if (!this.sources.includes(context)) {
      this.sources.unshift(context);
    }
  }

  public detach(context: RouteContext<TRec, TRec, TRec>) {
    if (this.sources.includes(context)) {
      this.sources.splice(this.sources.indexOf(context), 1);
    }
  }

  public clear() {
    this.sources = [];
  }
}
