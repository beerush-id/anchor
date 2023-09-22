import type { Anchor, Init, Rec, State, Unsubscribe } from './anchor.js';
import { crate, Pointer, Registry } from './anchor.js';
import { logger, merge } from '@beerush/utils';

export type StateMemory = {
  name: string;
  version: string;
  recursive: boolean;
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
  subscriptions: WeakMap<Anchor<Init>, Unsubscribe>;
  clear: () => void;
  write: () => void;
  secure: (secret: string) => void;
};

let ANCHOR_SECRET = 'no-secret';

const scope: {
  Anchor?: Store
  getAnchor: (secret: string) => Store | void;
} = typeof window === 'undefined' ? {} as never : window as never;

if (!scope.getAnchor) {
  const store: Store = {
    version: '1.0.0',
    registry: Registry,
    persistent: new Map(),
    session: new Map(),
    subscriptions: new WeakMap(),
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
          });
        }

        localStorage.setItem('anchor-store', JSON.stringify(file));
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

  try {
    const data = localStorage.getItem('anchor-store');

    if (data) {
      const file = JSON.parse(data) as AnchorData;

      if (file.version === store.version) {
        for (const { name, createdAt, updatedAt, value, version, recursive } of file.data) {
          const state = crate(value as never, recursive as false);
          store.persistent.set(name, {
            name,
            version,
            recursive,
            createdAt,
            updatedAt,
            value: state as never,
          });

          const unsubscribe = state[Pointer.MANAGER].subscribe(() => store.write());
          store.subscriptions.set(state as never, unsubscribe);
        }
      }
    }
  } catch (error) {
    logger.warn('localStorage is not accessible, read ignored!');
  }
}

function getSession<T extends Init>(
  name: string,
  init: T,
  recursive = true,
  version = '1.0.0',
): Anchor<T> {
  const { session: sessionStore } = scope.getAnchor(ANCHOR_SECRET) as Store;
  let state = sessionStore.get(name);

  if (!state) {
    state = {
      name,
      version,
      recursive,
      value: crate(init, recursive as false) as never,
    };

    sessionStore.set(name, state);
  }

  if (state.version !== version) {
    merge(state.value[Pointer.STATE], init);
    state.version = version;
  }

  return state.value as never;
}

function getPersistent<T extends Init>(
  name: string,
  init: T,
  recursive = true,
  version = '1.0.0',
): Anchor<T> {
  const {
    persistent: persistentStore,
    subscriptions: subscriptionStore,
    write,
  } = scope.getAnchor(ANCHOR_SECRET) as Store;
  let state = persistentStore.get(name);

  if (!state) {
    state = {
      name,
      version,
      recursive,
      value: crate(init, recursive as false) as never,
    };

    persistentStore.set(name, state);
    const unsubscribe = (state.value[Pointer.MANAGER]).subscribe(() => write(), false, 'anchor');
    subscriptionStore.set(state.value as never, unsubscribe);
  }

  if (state.version !== version) {
    merge(state.value[Pointer.STATE], init);
    state.version = version;
  }

  return state.value as never;
}

export function session<T extends Init>(name: string, init: T): State<T>;
export function session<T extends Init>(
  name: string,
  init: T,
  recursive: true,
  version?: string,
): State<T>;
export function session<T extends Init>(
  name: string,
  init: T,
  recursive: false,
  version?: string,
): State<T, false>;
export function session<T extends Init>(
  name: string,
  init: T,
  recursive = true,
  version = '1.0.0',
): State<T> {
  return getSession(name, init, recursive, version)[Pointer.STATE];
}

session.crate = <T extends Init>(name: string, init: T, recursive = true, version = '1.0.0'): Anchor<T> => {
  return getSession(name, init, recursive, version);
};

export function persistent<T extends Init>(name: string, init: T): State<T>;
export function persistent<T extends Init>(
  name: string,
  init: T,
  recursive: true,
  version?: string,
): State<T>;
export function persistent<T extends Init>(
  name: string,
  init: T,
  recursive: false,
  version?: string,
): State<T, false>;
export function persistent<T extends Init>(
  name: string,
  init: T,
  recursive = true,
  version = '1.0.0',
) {
  return getPersistent(name, init, recursive, version)[Pointer.STATE];
}

persistent.crate = <T extends Init>(name: string, init: T, recursive = true, version = '1.0.0'): Anchor<T> => {
  return getPersistent(name, init, recursive, version);
};

export const AnchorStore = scope.getAnchor(ANCHOR_SECRET) as Store;
