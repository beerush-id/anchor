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

/**
 * SessionStorage is a class that extends MemoryStorage to provide session storage functionality.
 * It automatically syncs with the browser's sessionStorage and handles versioning of stored data.
 *
 * @template T - The type of the stored data, must be a Record<string, unknown>
 *
 * @example
 * ```typescript
 * const storage = new SessionStorage('myApp', { user: null, theme: 'light' });
 * storage.set('user', { id: 1, name: 'John' });
 * ```
 */
export class SessionStorage<T extends Record<string, unknown> = Record<string, unknown>> extends MemoryStorage<T> {
  /**
   * Returns the storage key with the current version
   */
  public get key(): string {
    return `${STORAGE_KEY}-session://${this.name}@${this.version}`;
  }

  /**
   * Returns the storage key with the previous version (used for cleanup)
   */
  public get oldKey(): string {
    return `${STORAGE_KEY}-session://${this.name}@${this.previousVersion}`;
  }

  /**
   * Creates a new SessionStorage instance
   *
   * @param name - The name of the storage
   * @param init - Initial data to populate the storage
   * @param version - Version of the storage schema (default: '1.0.0')
   * @param previousVersion - Previous version to clean up
   * @param adapter - Storage adapter (defaults to window.sessionStorage)
   */
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

  /**
   * Sets a value in the storage and persists it to sessionStorage
   *
   * @param key - The key to set
   * @param value - The value to store
   */
  public set(key: keyof T, value: T[keyof T]) {
    super.set(key, value);
    this.write();
  }

  /**
   * Deletes a key from storage and updates sessionStorage
   *
   * @param key - The key to delete
   */
  public delete(key: keyof T) {
    super.delete(key);
    this.write();
  }

  /**
   * Writes the current storage state to the sessionStorage adapter
   */
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
   * Creates a reactive session object that automatically syncs with sessionStorage.
   * The session object will persist data across page reloads within the same browser session.
   *
   * @template T - The type of the initial data object
   * @template S - The schema type for anchor options
   *
   * @param name - Unique identifier for the session storage instance
   * @param init - Initial data to populate the session storage
   * @param options - Optional anchor configuration options
   * @param storageClass - Custom storage class to use (defaults to SessionStorage)
   *
   * @returns A reactive proxy object that syncs with sessionStorage
   *
   * @example
   * ```typescript
   * const userSession = session('user', { id: null, name: '' });
   * userSession.id = 123;
   * userSession.name = 'John';
   * // Data is automatically persisted to sessionStorage
   * ```
   */
  <T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
    name: string,
    init: T,
    options?: AnchorOptions<S>,
    storageClass?: typeof SessionStorage
  ): T;

  /**
   * Disconnects a reactive session object from sessionStorage synchronization.
   *
   * @template T - The type of the session object
   * @param state - The reactive session object to disconnect
   *
   * @example
   * ```typescript
   * const userSession = session('user', { id: 1, name: 'John' });
   * session.leave(userSession);
   * // userSession is no longer synced with sessionStorage
   * ```
   */
  leave<T extends ObjLike>(state: T): void;
}

export const STORAGE_SYNC_DELAY = 100;

let storageChangeListened = false;

/**
 * Creates a reactive session object that automatically syncs with sessionStorage.
 * The session object will persist data across page reloads within the same browser session.
 *
 * @template T - The type of the initial data object
 * @template S - The schema type for anchor options
 *
 * @param name - Unique identifier for the session storage instance
 * @param init - Initial data to populate the session storage
 * @param options - Optional anchor configuration options
 * @param storageClass - Custom storage class to use (defaults to SessionStorage)
 *
 * @returns A reactive proxy object that syncs with sessionStorage
 *
 * @example
 * ```typescript
 * const userSession = session('user', { id: null, name: '' });
 * userSession.id = 123;
 * userSession.name = 'John';
 * // Data is automatically persisted to sessionStorage
 * ```
 */
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

/**
 * Disconnects a reactive session object from sessionStorage synchronization.
 *
 * @template T - The type of the session object
 * @param state - The reactive session object to disconnect
 *
 * @example
 * ```typescript
 * const userSession = session('user', { id: 1, name: 'John' });
 * session.leave(userSession);
 * // userSession is no longer synced with sessionStorage
 * ```
 */
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
