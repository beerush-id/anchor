import { type AnyType, type CookieOptions, cookies, mutable, subscribe } from '@airlib/core';
import { onCleanup, onMount } from './lifecycle.js';

/**
 * Options for {@link cookiePair}. Extends the underlying cookie options with
 * `deferred`, which delays the cookie-store subscription until mount so the
 * pair renders from its initial value during SSR.
 */
export type CookiePairOptions = CookieOptions & {
  deferred?: boolean;
};

/**
 * A reactive key-value state that is persisted to a single document cookie.
 * Reads come from a reactive in-memory state that re-renders consumers, while
 * writes are forwarded to the cookie store, which persists the cookie and
 * syncs the value back into the state. Both the cookie and the state stay in
 * sync for the lifetime of the pair.
 *
 * @template T - The shape of the cookie value
 * @param name - The cookie name to persist under
 * @param init - The initial value, used until the cookie store syncs
 * @param options - Cookie attributes; pass `deferred: true` to subscribe only
 * after mount so server renders always use the initial value
 * @returns A pair of proxy that reads from the reactive state and writes to the cookie and the cookie store
 */
export function cookiePair<T extends Record<string, AnyType>>(
  name: string,
  init: T,
  options?: CookiePairOptions
): [T, T] {
  const store = cookies(name, structuredClone(init), options);
  const state = mutable(structuredClone(init));

  if (options?.deferred) {
    onMount(() => {
      return subscribe(store, (snapshot) => {
        Object.assign(state, snapshot);
      });
    });
  } else {
    onCleanup(
      subscribe(store, (snapshot) => {
        Object.assign(state, snapshot);
      })
    );
  }

  const paired = new Proxy(init, {
    get(_target, prop) {
      return state[prop as keyof T];
    },
    set(_target, prop, value) {
      store[prop as keyof T] = value;
      return true;
    },
  });

  return [paired, store];
}
