import { AsyncLocalStorage } from 'node:async_hooks';
import { $ROOT, $symbol } from '../module.js';
import type { AsyncStore } from '../scope/index.js';

class AnchorALS<T> extends AsyncLocalStorage<T> {
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
