import { closure } from '@anchorlib/core';

export const ROUTER_STORE_KEY = Symbol('router-store');

export function getStore() {
  let store = closure.get(ROUTER_STORE_KEY);

  if (!store) {
    store = new WeakMap();
    closure.set(ROUTER_STORE_KEY, store);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Expected.
  return store as WeakMap<any, any>;
}
