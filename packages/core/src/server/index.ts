// @ts-expect-error
import { AsyncLocalStorage } from 'node:async_hooks';
import { GLOBAL_ASYNC_CONTEXT, GLOBAL_CLOSURE_STORAGE } from './constant.js';

class ClosureAdapter extends AsyncLocalStorage {
  public shared = new Map();
}

class AsyncContext<T> extends AsyncLocalStorage<T> {
  public awaited<T>(fn: () => T) {
    return fn();
  }
}

// biome-ignore lint/suspicious/noExplicitAny: Expected.
if (typeof (globalThis as any) !== 'undefined') {
  // biome-ignore lint/suspicious/noExplicitAny: Expected.
  (globalThis as any)[GLOBAL_CLOSURE_STORAGE] = new ClosureAdapter();
  // biome-ignore lint/suspicious/noExplicitAny: Expected.
  (globalThis as any)[GLOBAL_ASYNC_CONTEXT] = new AsyncContext();
}
