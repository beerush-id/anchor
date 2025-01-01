import {
  cacheState,
  directState,
  Initializer,
  MemoryOptions,
  MemoryState,
  MemoryStatus,
  MemoryStore,
} from './memory.js';
import { Init, Rec, State } from '../core/index.js';
import { logger } from '../utils/index.js';
import { ExternalSubscriptions } from '../core/anchor.js';
import { cookie } from './cookie.js';

const STORE_NAME = 'anchor:store';

export type SessionOptions<T extends Init, R extends boolean = true> = MemoryOptions<T, R>;

export class SessionStore extends MemoryStore {
  public json(): string;
  public json(stringify: false): Rec;
  public json(stringify = true) {
    const data: Rec = {};

    for (const [key, state] of this.entries()) {
      const { name, version, recursive, strict, value } = state;
      data[key] = { name, version, recursive, strict, value };
    }

    return stringify ? JSON.stringify(data) : data;
  }
}

let CURRENT_SESSION_STORE: SessionStore;

export function sessionState<T extends Init, R extends boolean = true>(
  name: string,
  init: Initializer<T> | T,
  options?: SessionOptions<T>
): State<T, R> {
  if (typeof CURRENT_SESSION_STORE === 'undefined') {
    if (typeof window === 'undefined') {
      return directState(init, options) as never;
    }

    cookie({ sessionId: crypto.randomUUID(), path: '/' });

    CURRENT_SESSION_STORE = new SessionStore();
    loadStates(CURRENT_SESSION_STORE, sessionStorage);
  }

  return cacheState(CURRENT_SESSION_STORE, name, init, options) as never;
}

// @deprecated
export const session = sessionState;

export function loadStates(store: SessionStore, storage: Storage) {
  const subscriptions = new Map<string, () => void>();

  store.subscribe((e) => {
    if (e.type === 'set' || e.type === 'update') {
      if (typeof e.value !== 'object' || !('subscribe' in e.value)) return;

      if (subscriptions.has(e.name)) {
        const unsubscribe = subscriptions.get(e.name);
        unsubscribe?.();
      }

      const sync = () => {
        writeTo(store, storage);
      };

      const subscribers = ExternalSubscriptions.get(e.value as never);
      subscribers?.add(sync);

      subscriptions.set(e.name, () => {
        subscribers?.delete(sync);
      });
    }

    if (e.type === 'delete' && subscriptions.has(e.name)) {
      const unsubscribe = subscriptions.get(e.name);
      unsubscribe?.();
    }
  });

  readFrom(store, storage);
}

export function sessionContext(store: SessionStore): (() => void) | undefined {
  if (typeof window === 'undefined') return;

  const current = CURRENT_SESSION_STORE;
  CURRENT_SESSION_STORE = store;

  return () => {
    CURRENT_SESSION_STORE = current;
  };
}

function readFrom(store: SessionStore, storage: Storage) {
  try {
    const raw = storage.getItem(STORE_NAME);

    if (!raw) return;

    const { data, version } = JSON.parse(raw ?? '{"data": {}, "version": "1.0.0"}') as { version: string; data: Rec };

    if (store.version !== version) return;

    for (const [key, state] of Object.entries(data)) {
      const {
        name,
        version,
        value,
        recursive = true,
        strict = true,
        status = MemoryStatus.Loaded,
      } = state as MemoryState<Init>;

      store.set(key, {
        name,
        value,
        status,
        version,
        recursive,
        strict,
      });
    }
  } catch (error) {
    logger.error(`[anchor:session] Read session states failed.`, error);
  }
}

function writeTo(store: SessionStore, storage: Storage) {
  try {
    storage.setItem(
      STORE_NAME,
      JSON.stringify({
        data: store.json(false),
        version: store.version,
      })
    );
    logger.verbose(`[anchor:session] Session states saved.`);
  } catch (error) {
    logger.error(`[anchor:session] Write session states failed.`, error);
  }
}
