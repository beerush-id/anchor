import { type DBEvent, type DBSubscriber, type DBUnsubscribe, IDBStatus, IndexedStore } from './db.js';
import { put, remove } from './helper.js';
import { anchor, captureStack, type ObjLike } from '@anchor/core';

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

const anchorKV = new IndexedKv('anchor');

export type Storable = string | number | boolean | null | ObjLike | Array<Storable>;
export type KVState<T extends Storable> = {
  data: T;
  status: 'init' | 'ready' | 'error';
};

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
export function kv<T extends Storable>(key: string, init: T): KVState<T> {
  const state = anchor.raw({ data: init, status: 'init' } as KVState<T>);

  const readKv = () => {
    const value = anchorKV.get(key) as T;

    if (value) {
      state.data = value;
    } else {
      anchorKV.set(key, init);
    }

    state.status = 'ready';
  };

  if (anchorKV.status === IDBStatus.Init) {
    const unsubscribe = anchorKV.subscribe((event) => {
      if (event.type === IDBStatus.Open) {
        readKv();
      }

      unsubscribe();
    });
  } else {
    readKv();
  }

  return state;
}
