import { AsyncLocalStorage } from 'node:async_hooks';
import { setAsyncScope } from '@anchorlib/core';

class AnchorASL<T> extends AsyncLocalStorage<T> {
  private store: T = new Map() as T;

  public getStore(): T {
    return super.getStore() ?? this.store;
  }
}

setAsyncScope(new AnchorASL() as AsyncLocalStorage<Map<string, unknown>>);
