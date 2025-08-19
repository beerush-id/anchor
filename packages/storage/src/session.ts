import { MemoryStorage } from './memory.js';
import {
  anchor,
  type AnchorOptions,
  captureStack,
  derive,
  type LinkableSchema,
  microtask,
  type ObjLike,
  type StateUnsubscribe,
} from '@anchor/core';
import { isBrowser } from '@beerush/utils';

export const STORAGE_KEY = 'anchor';
export const STORAGE_SYNC = new Map<string, ObjLike>();

const hasSessionStorage = () => typeof sessionStorage !== 'undefined';

export class SessionStorage<T extends Record<string, unknown> = Record<string, unknown>> extends MemoryStorage<T> {
  public get key(): string {
    return `${STORAGE_KEY}-session://${this.name}@${this.version}`;
  }

  public get oldKey(): string {
    return `${STORAGE_KEY}-session://${this.name}@${this.previousVersion}`;
  }

  constructor(
    protected name: string,
    protected init?: T,
    protected version = '1.0.0',
    protected previousVersion?: string,
    protected adapter?: Storage
  ) {
    super(init);

    if (!adapter && hasSessionStorage()) {
      this.adapter = sessionStorage;
    }

    if (this.adapter) {
      if (this.previousVersion) {
        this.adapter.removeItem(this.oldKey);
      }

      const stored = this.adapter.getItem(this.key);

      if (stored) {
        try {
          const storedData = JSON.parse(stored) as Record<string, unknown>;
          this.assign(storedData);
        } catch (error) {
          captureStack.error.external(
            ['Unable to parse storage object from the persistent storage:', stored].join('\n\n'),
            error as Error,
            this.constructor
          );
        }
      } else if (this.length) {
        this.adapter.setItem(this.key, this.json());
      }
    }
  }

  public set(key: keyof T, value: T[keyof T]) {
    super.set(key, value);
    this.write();
  }

  public delete(key: keyof T) {
    super.delete(key);
    this.write();
  }

  public write() {
    if (typeof this.adapter === 'undefined') return;

    try {
      if (this.length > 0) {
        this.adapter?.setItem(this.key, this.json());
      } else {
        this.adapter?.removeItem(this.key);
      }
    } catch (error) {
      captureStack.error.external(
        `Unable to write storage: "${this.key}".`,
        error as Error,
        this.write,
        this.delete,
        this.set
      );
    }
  }
}

const STORAGE_REGISTRY = new WeakMap<ObjLike, SessionStorage>();
const STORAGE_SUBSCRIPTION_REGISTRY = new WeakMap<ObjLike, StateUnsubscribe>();

export interface SessionFn {
  /**
   * Create a reactive session object.
   * Session object will sync with session storage.
   * @param {string} name
   * @param {T} init
   * @param {AnchorOptions<S>} options
   * @param {typeof SessionStorage} storageClass
   * @returns {T}
   */
  <T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
    name: string,
    init: T,
    options?: AnchorOptions<S>,
    storageClass?: typeof SessionStorage
  ): T;

  /**
   * Leave a reactive session object.
   * Leaving a reactive session object will stop syncing with session storage.
   * @param {T} state
   */
  leave<T extends ObjLike>(state: T): void;
}

export const STORAGE_SYNC_DELAY = 100;

let storageChangeListened = false;

export const session = (<T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
  name: string,
  init: T,
  options?: AnchorOptions<S>,
  storageClass = SessionStorage
): T => {
  const state = anchor(init, options);

  if (isBrowser() && !STORAGE_REGISTRY.has(state)) {
    const storage = new storageClass(name, state) as SessionStorage;
    STORAGE_REGISTRY.set(state, storage);

    const controller = derive.resolve(state);

    if (typeof controller?.subscribe === 'function') {
      const [schedule] = microtask(STORAGE_SYNC_DELAY);
      STORAGE_SYNC.set(storage.key, state);

      const stateUnsubscribe = controller.subscribe(() => {
        schedule(() => {
          storage?.write();
        });
      });
      const unsubscribe = () => {
        stateUnsubscribe?.();
        STORAGE_SYNC.delete(storage.key);
      };

      STORAGE_SUBSCRIPTION_REGISTRY.set(state, unsubscribe);
    }

    // Lazily subscribe to storage changes.
    // This make sure that storage subscription is only created once, when needed.
    if (!storageChangeListened) {
      storageChangeListened = true;
      listenStorageChange();
    }
  }

  return state;
}) as SessionFn;

session.leave = <T extends ObjLike>(state: T) => {
  const unsubscribe = STORAGE_SUBSCRIPTION_REGISTRY.get(state);

  if (typeof unsubscribe === 'function') {
    unsubscribe();
  }

  STORAGE_REGISTRY.delete(state);
  STORAGE_SUBSCRIPTION_REGISTRY.delete(state);
};

/**
 * This function add handler to storage change event.
 * This function must be called only once and lazily.
 */
function listenStorageChange() {
  const storageHandler = (event: StorageEvent) => {
    if (!event.key) return;

    if (STORAGE_SYNC.has(event.key)) {
      const state = STORAGE_SYNC.get(event.key) as ObjLike;

      try {
        const data = JSON.parse(event.newValue ?? '');
        anchor.assign(state, data as ObjLike);
      } catch (error) {
        captureStack.error.external(
          [`Unable to parse new value of "${event.key}":`, event.newValue].join('\n\n'),
          error as Error,
          storageHandler
        );
      }
    }
  };

  window.addEventListener('storage', storageHandler);
}
