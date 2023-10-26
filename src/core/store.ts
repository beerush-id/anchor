import type { Anchor, Init, Rec, Sail } from './anchor.js';
import { crate, ExternalSubscriptions, Pointer, Registry } from './anchor.js';
import { logger, merge } from '@beerush/utils';

export type StateMemory = {
  name: string;
  version: string;
  recursive: boolean;
  strict?: boolean;
  createdAt?: string;
  updatedAt?: string;
  value: Anchor<Init>;
};
export type PersistentStore = Map<string, StateMemory>;
export type SessionStore = Map<string, StateMemory>;
export type AnchorData = {
  version: string;
  data: StateMemory[];
};
export type Store = {
  version: string;
  registry: Map<Init, Anchor<Init>>;
  persistent: PersistentStore;
  session: SessionStore;
  clear: () => void;
  write: () => void;
  secure: (secret: string) => void;
  channel?: BroadcastChannel;
};

export type Initializer<T> = () => T;

let ANCHOR_SECRET = 'no-secret';
const ANCHOR_STORAGE_KEY = 'anchor-store';

const scope: {
  Anchor?: Store
  getAnchor: (secret: string) => Store | void;
  addEventListener: (type: string, callback: (e: StorageEvent) => void) => void;
  localStorage?: Storage;
  BroadcastChannel?: BroadcastChannel;
} = typeof window === 'undefined' ? {
  addEventListener: () => undefined,
} as never : window as never;

const syncState = (type: 'persistent' | 'session', name: string, state: Sail<unknown>) => {
  const { write } = scope.getAnchor(ANCHOR_SECRET) as Store;

  const subscribers = ExternalSubscriptions.get(state);
  subscribers?.add(() => {
    if (type === 'persistent') {
      write();
    }
  });
};

if (!scope.getAnchor) {
  const store: Store = {
    version: '1.0.0',
    registry: Registry,
    persistent: new Map(),
    session: new Map(),
    clear: () => {
      store.persistent.clear();
      store.session.clear();
      store.write();
    },
    write: () => {
      try {
        const { version, persistent } = store;
        const file: AnchorData = { version, data: [] };

        for (const [ name, state ] of persistent.entries()) {
          file.data.push({
            name,
            createdAt: (state as Rec).createdAt as string || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            value: state.value[Pointer.STATE] as never,
            version: state.version,
            recursive: state.recursive,
            strict: state.strict,
          });
        }

        localStorage.setItem(ANCHOR_STORAGE_KEY, JSON.stringify(file));
      } catch (error) {
        logger.warn('localStorage is not accessible, write ignored!');
      }
    },
    secure: (secret: string) => {
      ANCHOR_SECRET = secret;
      delete scope.Anchor;
    },
  };

  scope.Anchor = store;
  scope.getAnchor = (secret: string) => {
    if (!ANCHOR_SECRET) {
      logger.error('[ERR-ACCESS] Anchor Store is not set for accessible!');
      return;
    }

    if (ANCHOR_SECRET !== secret) {
      logger.error('[ERR-ACCESS] Anchor Store secret is invalid!');
      return;
    }

    return store;
  };

  const importData = () => {
    try {
      const data = localStorage.getItem(ANCHOR_STORAGE_KEY);

      if (data) {
        const file = JSON.parse(data) as AnchorData;

        if (file.version === store.version) {
          for (const { name, createdAt, updatedAt, value, version, strict, recursive } of file.data) {
            const state = crate(value as never, recursive, strict);
            store.persistent.set(name, {
              name,
              version,
              recursive,
              strict,
              createdAt,
              updatedAt,
              value: state as never,
            });

            syncState('persistent', name, state[Pointer.STATE] as never);
          }
        }
      }
    } catch (error) {
      logger.warn('[anchor:store] Persistent data failed to load!', error);
    }
  };

  if ('localStorage' in scope) {
    try {
      importData();
    } catch (error) {
      logger.error(error);
    }
  } else {
    logger.warn('[anchor:store] localStorage is not available, read ignored!');
  }

  if ('BroadcastChannel' in scope) {
    const channel = new BroadcastChannel('anchor');
    channel.onmessage = (e) => {
      console.log(e);

      if (e.data === 'anchor:clear') {
        store.clear();
      } else if (e.data === 'anchor:write') {
        store.write();
      }
    };

    store.channel = channel;
  }
}

function getSession<T extends Init, R extends boolean = true>(
  name: string,
  init: T | Initializer<T>,
  recursive: R = true as R,
  strict?: boolean,
  version = '1.0.0',
): Anchor<T, R> {
  const { session: sessionStore } = scope.getAnchor(ANCHOR_SECRET) as Store;
  let state = sessionStore.get(name);

  if (!state) {
    const value = typeof init === 'function' ? (init as Initializer<T>)() : init;
    state = {
      name,
      version,
      recursive,
      strict,
      value: crate(value, recursive, strict) as never,
    };

    sessionStore.set(name, state);
    syncState('session', name, state.value[Pointer.STATE] as never);
  }

  if (state.version !== version) {
    merge(state.value[Pointer.STATE], init);
    state.version = version;
  }

  return state.value as never;
}

function getPersistent<T extends Init, R extends boolean = true>(
  name: string,
  init: T | Initializer<T>,
  recursive: R = true as R,
  strict?: boolean,
  version = '1.0.0',
): Anchor<T, R> {
  const { persistent: persistentStore } = scope.getAnchor(ANCHOR_SECRET) as Store;
  let state = persistentStore.get(name);

  if (!state) {
    const value = typeof init === 'function' ? (init as Initializer<T>)() : init;
    state = {
      name,
      version,
      recursive,
      value: crate(value, recursive, strict) as never,
    };

    persistentStore.set(name, state);
    syncState('persistent', name, state.value[Pointer.STATE] as never);
  }

  if (state.version !== version) {
    merge(state.value[Pointer.STATE], init);
    state.version = version;
  }

  return state.value as never;
}

export function session<T extends Init>(
  name: string,
  init: T | Initializer<T>,
): Sail<T>;
export function session<T extends Init, R extends boolean = true>(
  name: string,
  init: T | Initializer<T>,
  recursive?: R,
  strict?: boolean,
  version?: string,
): Sail<T, R>;
export function session<T extends Init, R extends boolean = true>(
  name: string,
  init: T | Initializer<T>,
  recursive?: R,
  strict?: boolean,
  version = '1.0.0',
): Sail<T, R> {
  return getSession(name, init, recursive, strict, version)[Pointer.STATE];
}

session.crate = <T extends Init, R extends boolean = true>(
  name: string,
  init: T | Initializer<T>,
  recursive?: R,
  strict?: boolean,
  version = '1.0.0',
): Anchor<T, R> => {
  return getSession(name, init, recursive, strict, version);
};

export function persistent<T extends Init>(
  name: string,
  init: T | Initializer<T>,
): Sail<T>;
export function persistent<T extends Init, R extends boolean = true>(
  name: string,
  init: T | Initializer<T>,
  recursive?: R,
  strict?: boolean,
  version?: string,
): Sail<T, R>;
export function persistent<T extends Init, R extends boolean = true>(
  name: string,
  init: T | Initializer<T>,
  recursive?: R,
  strict?: boolean,
  version = '1.0.0',
): Sail<T, R> {
  return getPersistent(name, init, recursive, strict, version)[Pointer.STATE];
}

persistent.crate = <T extends Init, R extends boolean = true>(
  name: string,
  init: T | Initializer<T>,
  recursive?: R,
  strict?: boolean,
  version = '1.0.0',
): Anchor<T, R> => {
  return getPersistent(name, init, recursive, strict, version);
};

export const AnchorStore = scope.getAnchor(ANCHOR_SECRET) as Store;
