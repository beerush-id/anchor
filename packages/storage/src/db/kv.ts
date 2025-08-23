import { type DBEvent, type DBSubscriber, type DBUnsubscribe, IDBStatus, IndexedStore } from './db.js';
import { put, remove } from './helper.js';
import { anchor, captureStack, derive, microtask, type StateUnsubscribe } from '@anchor/core';
import { STORAGE_SYNC_DELAY } from '../session.js';

export type KVEvent<T> = {
  type: IDBStatus | 'set' | 'delete';
  key?: string;
  value?: T;
};

export type KVSubscriber<T> = DBSubscriber & ((event: KVEvent<T>) => void);
export type Operation = {
  promise: () => Promise<void>;
};

/**
 * IndexedKV is an optimistic KV Storage that uses IndexedDB as its backend.
 * It provides a simple key-value store with optimistic concurrency control.
 *
 * This class extends IndexedStore and provides methods to set, get, and delete
 * key-value pairs. It also supports subscribing to changes in the store.
 *
 * @template T The type of values stored in the key-value store.
 */
export class IndexedKv<T> extends IndexedStore {
  /**
   * In-memory storage for the key-value pairs.
   */
  #storage = new Map<string, T>();

  /**
   * Set of awaiter functions to resolve when operations complete.
   */
  #awaiters = new Set<() => void>();

  /**
   * Counter for ongoing operations.
   */
  #operations = 0;

  /**
   * Gets a readonly object store for reading data.
   * @protected
   */
  protected get reader(): IDBObjectStore {
    return this.instance?.transaction(this.name, 'readonly').objectStore(this.name) as IDBObjectStore;
  }

  /**
   * Gets a readwrite object store for writing data.
   * @protected
   */
  protected get writer(): IDBObjectStore {
    return this.instance?.transaction(this.name, 'readwrite').objectStore(this.name) as IDBObjectStore;
  }

  /**
   * Indicates whether there are ongoing operations.
   * @returns True if there are ongoing operations, false otherwise.
   */
  public get busy(): boolean {
    return this.#operations > 0;
  }

  /**
   * Creates a new IndexedKv instance.
   * @param name - The name of the object store.
   * @param version - The version of the database.
   * @param dbName - The name of the database.
   */
  constructor(
    protected name: string,
    protected version = 1,
    dbName = `${name}.kv`
  ) {
    super(dbName, version);
    this.init().open();
  }

  /**
   * Sets up the initial data by reading from the IndexedDB.
   * @protected
   */
  protected async setup() {
    await new Promise((resolve, reject) => {
      const request = this.reader.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest)?.result;

        if (cursor) {
          this.#storage.set(cursor.key, cursor.value);
          cursor.continue();
        } else {
          resolve(true);
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Waits for all ongoing operations to complete.
   * @returns A promise that resolves when all operations are completed.
   */
  public async completed(): Promise<true> {
    if (this.busy) {
      return await new Promise((resolve) => {
        const handler = () => {
          if (!this.busy) {
            resolve(true);
            this.#awaiters.delete(handler);
          }
        };

        this.#awaiters.add(handler);
      });
    }

    return true;
  }

  /**
   * Upgrades the database by creating the object store if it doesn't exist.
   * @param event - The version change event.
   * @protected
   */
  protected upgrade(event: IDBVersionChangeEvent): Promise<void> | void {
    const db = (event.target as IDBOpenDBRequest)?.result as IDBDatabase;
    if (db && !db.objectStoreNames.contains(this.name)) {
      db.createObjectStore(this.name);
    }
  }

  /**
   * Publishes an event to subscribers.
   * @param event - The event to publish.
   * @protected
   */
  protected publish(event: KVEvent<T>) {
    super.publish(event as DBEvent);
  }

  /**
   * Gets the value associated with the specified key.
   * @param name - The key to look up.
   * @returns The value associated with the key, or undefined if not found.
   */
  public get(name: string): T | undefined {
    return this.#storage.get(name);
  }

  /**
   * Sets the value for the specified key.
   * @param key - The key to set.
   * @param value - The value to set.
   * @param onerror - Optional error handler.
   * @returns An operation object with a promise that resolves when the operation completes.
   */
  public set(key: string, value: T, onerror?: (error: Error) => void): Operation {
    if (this.status !== IDBStatus.Open) {
      const error = new Error(`Database is in "${this.status}" state.`);
      captureStack.error.external(`Cannot perform "set" operation during "${this.status}" state.`, error, this.set);
      onerror?.(error);
      return { promise: () => Promise.resolve() };
    }

    const current = this.#storage.get(key);
    let resolved: Error | boolean = false;
    let resolver: () => void;
    let rejector: (error: Error) => void;

    this.setBusy();
    this.#storage.set(key, value);

    put(this.writer, key, value)
      .then(() => {
        this.publish({ type: 'set', key, value });
        resolver?.();
        resolved = true;
      })
      .catch((error) => {
        captureStack.error.external(`Unable to set value of "${key}":`, error, put, this.set);

        if (current) {
          this.#storage.set(key, current);
        } else {
          this.#storage.delete(key);
        }

        onerror?.(error);
        rejector?.(error);
        resolved = error;
      })
      .finally(() => {
        this.setFree();
      });

    return {
      promise: () => {
        if (resolved) {
          return resolved === true ? Promise.resolve() : Promise.reject(resolved);
        }

        return new Promise((resolve, reject) => {
          resolver = resolve as never;
          rejector = reject;
        });
      },
    } as Operation;
  }

  /**
   * Deletes the value associated with the specified key.
   * @param key - The key to delete.
   * @param onerror - Optional error handler.
   * @returns An operation object with a promise that resolves when the operation completes.
   */
  public delete(key: string, onerror?: (error: Error) => void): Operation {
    if (this.status !== IDBStatus.Open) {
      const error = new Error(`Database is in "${this.status}" state.`);
      captureStack.error.external(
        `Cannot perform "delete" operation during "${this.status}" state.`,
        error,
        this.delete
      );
      onerror?.(error);
      return { promise: () => Promise.resolve() };
    }

    const current = this.#storage.get(key);

    if (current) {
      let resolved: Error | boolean = false;
      let resolver: (value: true) => void;
      let rejector: (error: Error) => void;

      this.setBusy();
      this.#storage.delete(key);

      remove(this.writer, key)
        .then(() => {
          this.publish({ type: 'delete', key });
          resolver?.(true);
          resolved = true;
        })
        .catch((error) => {
          captureStack.error.external(`Unable to delete "${key}":`, error, remove, this.delete);
          this.#storage.set(key, current);

          onerror?.(error);
          rejector?.(error);
          resolved = error;
        })
        .finally(() => {
          this.setFree();
        });

      return {
        promise: () => {
          if (resolved) {
            return resolved === true ? Promise.resolve() : Promise.reject(resolved);
          }

          return new Promise((resolve, reject) => {
            resolver = resolve as never;
            rejector = reject as never;
          });
        },
      } as Operation;
    }

    return { promise: () => Promise.resolve() };
  }

  /**
   * Subscribes to changes in the store.
   * @param handler - The handler function to call when changes occur.
   * @returns A function to unsubscribe from changes.
   */
  public subscribe(handler: KVSubscriber<T>): DBUnsubscribe {
    return super.subscribe(handler);
  }

  /**
   * Increments the operation counter.
   * @private
   */
  private setBusy() {
    this.#operations += 1;
  }

  /**
   * Decrements the operation counter and notifies awaiters.
   * @private
   */
  private setFree() {
    this.#operations -= 1;

    if (this.#operations <= 0) {
      this.#operations = 0;
    }

    this.#awaiters.forEach((handler) => handler());
  }
}

/**
 * Type definition for values that can be stored in the key-value store.
 * Storable types include primitive values, objects, and arrays that can be serialized.
 */
export type Storable =
  | string
  | number
  | boolean
  | null
  | {
      [key: string]: Storable;
    }
  | Array<Storable>;

/**
 * Represents the state of a key-value storage item.
 * Contains both the actual data and a status indicator for initialization state.
 *
 * @template T - The type of the stored data that extends Storable
 */
export type KVState<T extends Storable> = {
  /** The actual stored data */
  data: T;
  /** The initialization status of the state */
  status: 'init' | 'ready' | 'error' | 'removed';
  error?: Error;
};

export interface KVFn {
  /**
   * Creates a reactive key-value state that is synchronized with IndexedDB.
   *
   * This function initializes a reactive state object that automatically syncs
   * with the IndexedKv storage. On first access, it reads the value from storage
   * or sets an initial value if none exists. The state includes both the data
   * and a status indicator showing the initialization state.
   *
   * @template T - The type of the stored value, must extend Storable
   * @param key - The unique key to identify the stored value
   * @param init - The initial value to use if no existing value is found
   * @returns A reactive state object containing the data and status
   */
  <T extends Storable>(key: string, init?: T): KVState<T>;

  /**
   * Cleans up the subscription for a reactive key-value state.
   *
   * This method removes the subscription associated with a given state object,
   * preventing further synchronization with the IndexedDB. It should be called
   * when the state is no longer needed to avoid memory leaks.
   *
   * @template T - The type of the stored value, must extend Storable
   * @param state - The state object to unsubscribe
   */
  leave<T extends Storable>(state: KVState<T>): void;

  /**
   * Removes a key-value pair from the storage.
   *
   * This function is used to delete a specific key-value pair from the storage.
   * It takes a key as input and removes the corresponding key-value pair from the storage.
   * If the key does not exist in the storage, the function does nothing.
   * It also publishes a "remove" event to notify subscribers about the removal.
   *
   * @param {string} key
   */
  remove(key: string): void;

  /**
   * A helper to wait for the store operations to complete.
   *
   * @returns {Promise<true>}
   */
  completed(): Promise<true>;
}

/**
 * Creates a key-value store function that provides reactive state management synchronized with IndexedDB.
 *
 * This factory function initializes an IndexedKv storage instance and returns a KVFn function
 * that can be used to create reactive state objects. Each state object automatically syncs
 * with the underlying IndexedDB storage and maintains its own initialization status.
 *
 * The returned function manages state lifecycle including:
 * - Caching states by key to prevent duplicate instances
 * - Tracking usage counts for memory management
 * - Automatically synchronizing reactive changes to IndexedDB with debouncing
 * - Handling database initialization and readiness states
 *
 * @param name - The name of the object store in IndexedDB
 * @param version - The version of the database schema (default: 1)
 * @param dbName - The name of the database (default: `${name}.kv`)
 * @returns A KVFn function that can create and manage reactive key-value states
 */
export function createKVStore(name: string, version = 1, dbName = `${name}.kv`): KVFn {
  const store = new IndexedKv(name, version, dbName);

  const stateMap = new Map<string, KVState<Storable>>();
  const stateUsage = new Map<KVState<Storable>, number>();
  const stateSubscriptions = new WeakMap<KVState<Storable>, StateUnsubscribe>();

  function kvFn<T extends Storable>(key: string, init: T): KVState<T> {
    // Make sure access to the same key is pointing to the same state.
    // One key will have one state that in charge of synchronization.
    if (stateMap.has(key)) {
      const state = stateMap.get(key) as KVState<T>;

      // Track the usage count to prevent unnecessary unsubscribes.
      const usage = stateUsage.get(state) ?? 0;
      stateUsage.set(state, usage + 1);

      return state;
    }

    const state = anchor.raw({ data: init, status: 'init' } as KVState<T>);
    const [schedule] = microtask(STORAGE_SYNC_DELAY);

    const readKv = () => {
      const value = store.get(key) as T;

      if (value) {
        state.data = value;
      } else {
        store.set(key, init, (error) => {
          anchor.assign(state, { error, status: 'error' });
        });
      }

      // Maintain optimistic behavior by setting status to ready while the store is writing.
      state.status = 'ready';

      // Create synchronization if the given state data is a linkable value.
      if (!stateSubscriptions.has(state)) {
        const stateUnsubscribe = derive(state, (snapshot, event) => {
          if (event.type !== 'init' && event.keys.includes('data')) {
            schedule(() => {
              store.set(key, snapshot.data, (error) => {
                anchor.assign(state, { error, status: 'error' });
              });
            });
          }
        });

        const unsubscribe = () => {
          let usage = stateUsage.get(state) ?? 1;

          usage -= 1;

          if (usage <= 0) {
            stateUnsubscribe();
            stateUsage.delete(state);
            stateSubscriptions.delete(state);
          } else {
            stateUsage.set(state, usage);
          }
        };

        stateSubscriptions.set(state, unsubscribe);
      }
    };

    if (store.status === IDBStatus.Init) {
      const unsubscribe = store.subscribe((event) => {
        if (event.type === IDBStatus.Open) {
          readKv();
          unsubscribe();
        } else if (event.type === IDBStatus.Closed) {
          anchor.assign(state, { status: 'error', error: store.error });
          unsubscribe();
        }
      });
    } else {
      readKv();
    }

    if (!stateMap.has(key)) {
      stateMap.set(key, state);
      stateUsage.set(state, 1);
    }

    return state;
  }

  kvFn.leave = <T extends Storable>(state: KVState<T>) => {
    if (stateSubscriptions.has(state)) {
      stateSubscriptions.get(state)?.();
    }
  };

  kvFn.remove = (key: string) => {
    const state = stateMap.get(key);

    store
      .delete(key)
      .promise()
      .then(() => {
        if (state) {
          const unsubscribe = stateSubscriptions.get(state);

          stateUsage.delete(state);
          unsubscribe?.();

          anchor.assign(state, { status: 'removed', data: undefined });
        }
      })
      .catch((error) => {
        if (state) {
          anchor.assign(state, { error, status: 'error' });
        }
      });
  };

  kvFn.completed = () => {
    return store.completed();
  };

  return kvFn as KVFn;
}

// Creates default KV store.
export const kv = createKVStore('anchor');
