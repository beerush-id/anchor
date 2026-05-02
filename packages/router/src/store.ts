import { anchor, getScope, isBrowser, mutable, setScope, untrack } from '@anchorlib/core';

export const ROUTER_STORE_KEY = Symbol('router-store');

export function getStore() {
  let store = getScope(ROUTER_STORE_KEY);

  if (!store) {
    store = new WeakMap();
    setScope(ROUTER_STORE_KEY, store);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Expected.
  return store as WeakMap<any, any>;
}

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
export const createState = ((init: any) => {
  if (!isBrowser()) {
    if (typeof init !== 'object' || init === null) return { value: init };
    return init;
  }
  return mutable(init);
}) as typeof mutable;

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
export const safeRead = ((fn: () => any) => {
  if (!isBrowser()) return fn();
  return untrack(fn);
}) as typeof untrack;

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
export const safeAssign = ((left: any, right: any) => {
  if (!isBrowser()) return Object.assign(left, right);
  return anchor.assign(left, right);
}) as typeof anchor.assign;
