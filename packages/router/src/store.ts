import { closure } from '@anchorlib/core';

export const ROUTER_STORE_KEY = Symbol('router-store');

export function getStore() {
  let store = closure.get(ROUTER_STORE_KEY);

  if (!store) {
    store = new Map();
    closure.set(ROUTER_STORE_KEY, store);
  }

  return store as Map<unknown, unknown>;
}
