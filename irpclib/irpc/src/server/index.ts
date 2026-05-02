import { AsyncLocalStorage } from 'node:async_hooks';
import { setAsyncScope } from '@anchorlib/core';

class ExtendedASL<T> extends AsyncLocalStorage<T> {
  private store: T = new Map() as T;

  public getStore(): T {
    return super.getStore() ?? this.store;
  }
}

setAsyncScope(new ExtendedASL() as AsyncLocalStorage<Map<string, unknown>>);
