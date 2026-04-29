// @ts-expect-error
import { AsyncLocalStorage } from 'node:async_hooks';
import { GLOBAL_ASYNC_SCOPE } from './constant.js';

class AsyncScope<T> extends AsyncLocalStorage<T> {
  private store?: T = new Map() as T;

  public getStore(): T {
    return super.getStore() ?? this.store;
  }
}

// biome-ignore lint/suspicious/noExplicitAny: Expected.
if (typeof (globalThis as any) !== 'undefined') {
  // biome-ignore lint/suspicious/noExplicitAny: Expected.
  (globalThis as any)[GLOBAL_ASYNC_SCOPE] = new AsyncScope();
}
