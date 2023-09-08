import { anchor, Init, State, Unsubscribe } from './anchor.js';
import { logger } from '@beerush/utils';

export type StateMemory = {
  name: string;
  version: string;
  recursive: boolean;
  value: State<unknown, boolean>;
};
export type PersistentStore = Map<string, StateMemory>;
export type SessionStore = Map<string, StateMemory>;
export type AnchorData = {
  version: string;
  data: StateMemory[];
};
export type AnchorStore = {
  version: string;
  persistent: PersistentStore;
  session: SessionStore;
  subscriptions: WeakMap<State<unknown>, Unsubscribe>;
  clear: () => void;
  write: () => void;
  secure: (secret: string) => void;
};

let ANCHOR_SECRET = 'no-secret';

const scope: {
  Anchor?: AnchorStore
  getAnchor: (secret: string) => AnchorStore | void;
} = typeof window === 'undefined' ? {} as never : window as never;

if (!scope.getAnchor) {
  const store: AnchorStore = {
    version: '1.0.0',
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
            value: state.value,
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
    }

    return store;
  };

  try {
    const data = localStorage.getItem('anchor-store');

    if (data) {
      const file = JSON.parse(data) as AnchorData;

      if (file.version === store.version) {
        for (const { name, value, version, recursive } of file.data) {
          const state = anchor(value, recursive);
          store.persistent.set(name, {
            name,
            version,
            recursive,
            value: state as never,
          });

          const unsubscribe = state.subscribe(() => store.write());
          store.subscriptions.set(state as never, unsubscribe);
        }
      }
    }
  } catch (error) {
    logger.warn('localStorage is not accessible, read ignored!');
  }
}

export function session<T extends Init | Init[], R extends boolean = true>(
  name: string,
  init: T,
  recursive = true,
  version = '1.0.0',
): State<T, R> {
  const { session: sessionStore } = scope.getAnchor(ANCHOR_SECRET) as AnchorStore;
  let state = sessionStore.get(name);

  if (!state) {
    state = {
      name,
      version,
      recursive,
      value: anchor(init, recursive) as never,
    };

    sessionStore.set(name, state);
  }

  if (state.version !== version) {
    Object.assign(state.value, init);
    state.version = version;
  }

  return state.value as never;
}

export function persistent<T extends Init | Init[], R extends boolean = true>(
  name: string,
  init: T,
  recursive = true,
  version = '1.0.0',
): State<T, R> {
  const {
    persistent: persistentStore,
    subscriptions: subscriptionStore,
    write,
  } = scope.getAnchor(ANCHOR_SECRET) as AnchorStore;
  let state = persistentStore.get(name);

  if (!state) {
    state = {
      name,
      version,
      recursive,
      value: anchor(init, recursive) as never,
    };

    persistentStore.set(name, state);
    const unsubscribe = state.value.subscribe(() => write());
    subscriptionStore.set(state.value as never, unsubscribe);
  }

  if (state.version !== version) {
    Object.assign(state.value, init);
    state.version = version;
  }

  return state.value as never;
}

export const store = scope.getAnchor(ANCHOR_SECRET) as AnchorStore;
