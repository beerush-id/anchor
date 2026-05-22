import { AsyncLocalStorage } from 'node:async_hooks';
import { isBrowser, setAsyncScope, setReactive } from '@anchorlib/core';

class AnchorASL<T> extends AsyncLocalStorage<T> {
  private store: T = new Map() as T;

  public getStore(): T {
    return super.getStore() ?? this.store;
  }
}

setAsyncScope(new AnchorASL() as AsyncLocalStorage<Map<string, unknown>>);

/* v8 ignore next */
if (!isBrowser()) {
  setReactive(false);
}
