// @ts-expect-error
import { AsyncLocalStorage } from 'node:async_hooks';
import { GLOBAL_ASYNC_SCOPE, GLOBAL_THIS } from './constant.js';

class ExtendedASL<T> extends AsyncLocalStorage<T> {
  private store?: T = new Map() as T;

  public getStore(): T {
    return super.getStore() ?? this.store;
  }
}

if (GLOBAL_THIS) {
  GLOBAL_THIS[GLOBAL_ASYNC_SCOPE] = new ExtendedASL();
}
