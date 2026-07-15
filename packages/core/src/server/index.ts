import type HOOK from 'node:async_hooks';
import type { AsyncStore } from '../scope/index.js';
import { $ROOT, $symbol } from '../shared/env.js';

if (!$ROOT.AsyncLocalStorage) {
  const { AsyncLocalStorage } = await import('node:async_hooks');
  $ROOT.AsyncLocalStorage = AsyncLocalStorage;
}

const AsyncHook = $ROOT.AsyncLocalStorage as typeof HOOK.AsyncLocalStorage;

class AnchorALS<T> extends AsyncHook<T> {
  private store?: AsyncStore;

  public getStore() {
    return (super.getStore() ?? this.store) as T;
  }
}

export const ALS_KEY = $symbol('als');

if (!$ROOT[ALS_KEY]) {
  $ROOT[ALS_KEY] = new AnchorALS<AsyncStore>();
}

export const ALS_INSTANCE = $ROOT[ALS_KEY];
