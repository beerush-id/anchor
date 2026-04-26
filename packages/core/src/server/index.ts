// @ts-expect-error
import { AsyncLocalStorage } from 'node:async_hooks';
import { GLOBAL_CLOSURE_STORAGE } from './constant.js';

class ClosureAdapter extends AsyncLocalStorage {
  public shared = new Map();
}

// biome-ignore lint/suspicious/noExplicitAny: Expected.
if (typeof (globalThis as any) !== 'undefined') {
  // biome-ignore lint/suspicious/noExplicitAny: Expected.
  (globalThis as any)[GLOBAL_CLOSURE_STORAGE] = new ClosureAdapter();
}
