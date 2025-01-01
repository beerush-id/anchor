import { cacheState, directState, Initializer, MemoryOptions } from './memory.js';
import { Init, type Sealed, State } from '../core/index.js';
import { loadStates, SessionStore } from './session.js';
import { cookie } from './cookie.js';

export type PersistentOptions<T extends Init, R extends boolean = true> = MemoryOptions<T, R>;

export class PersistentStore extends SessionStore {}

let CURRENT_PERSISTENT_STORE: PersistentStore;

export function persistentState<T extends Sealed, R extends boolean = true>(
  name: string,
  init: Initializer<T> | T,
  options?: PersistentOptions<T, R>
): State<T, R> {
  if (typeof CURRENT_PERSISTENT_STORE === 'undefined') {
    if (typeof window === 'undefined') {
      return directState(init, options) as never;
    }

    cookie({ persistentId: crypto.randomUUID(), path: '/' });

    CURRENT_PERSISTENT_STORE = new PersistentStore();
    loadStates(CURRENT_PERSISTENT_STORE, localStorage);
  }

  return cacheState(CURRENT_PERSISTENT_STORE, name, init, options) as never;
}

// @deprecated
export const persistent = persistentState;

export function persistentContext(store: PersistentStore) {
  if (typeof window === 'undefined') return;

  const current = CURRENT_PERSISTENT_STORE;
  CURRENT_PERSISTENT_STORE = store;

  return () => {
    CURRENT_PERSISTENT_STORE = current;
  };
}
