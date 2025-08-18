import { type DBEvent, type DBSubscriber, type DBUnsubscribe, IDBStatus, IndexedStore } from './db.js';
import { put, remove } from './helper.js';
import { captureStack } from '@anchor/core';

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
 */
export class IndexedKv<T> extends IndexedStore {
  #storage = new Map<string, T>();
  #awaiters = new Set<() => void>();
  #operations = 0;

  protected get reader(): IDBObjectStore {
    return this.instance?.transaction(this.name, 'readonly').objectStore(this.name) as IDBObjectStore;
  }

  protected get writer(): IDBObjectStore {
    return this.instance?.transaction(this.name, 'readwrite').objectStore(this.name) as IDBObjectStore;
  }

  public get busy(): boolean {
    return this.#operations > 0;
  }

  constructor(
    protected name: string,
    protected version = 1,
    dbName = `${name}.kv`
  ) {
    super(dbName, version);
    this.init().open();
  }

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

  protected upgrade(event: IDBVersionChangeEvent): Promise<void> | void {
    const db = (event.target as IDBOpenDBRequest)?.result as IDBDatabase;
    if (db && !db.objectStoreNames.contains(this.name)) {
      db.createObjectStore(this.name);
    }
  }

  protected publish(event: KVEvent<T>) {
    super.publish(event as DBEvent);
  }

  public get(name: string): T | undefined {
    return this.#storage.get(name);
  }

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

  public subscribe(handler: KVSubscriber<T>): DBUnsubscribe {
    return super.subscribe(handler);
  }

  private setBusy() {
    this.#operations += 1;
  }

  private setFree() {
    this.#operations -= 1;

    if (this.#operations <= 0) {
      this.#operations = 0;
    }

    this.#awaiters.forEach((handler) => handler());
  }
}
