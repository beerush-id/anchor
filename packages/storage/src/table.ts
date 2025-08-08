import type { PlainObject } from '@anchor/core';
import { logger, shortId } from '@anchor/core';
import { isFunction } from '@beerush/utils';

const hasIndexedDb = () => typeof indexedDB !== 'undefined';

export const DB_NAME = 'anchor';

export type IndexedRecord<T extends PlainObject> = T & {
  id: string;
  created_at: string;
  updated_at: string;
};

export class IndexedTable<T extends PlainObject> {
  #db?: IDBDatabase;
  #table?: IDBObjectStore;
  #queues = new Set<() => void>();

  public error?: Error;
  public status: 'init' | 'open' | 'closed' = 'init';

  constructor(
    protected table: string,
    protected version = 1,
    protected indexes?: string[]
  ) {
    if (hasIndexedDb()) {
      const request = indexedDB.open(`${DB_NAME}://${this.table}`, version);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest)?.result;

        if (!db) {
          this.error = new Error('Failed to upgrade database.');
          this.status = 'closed';
          this.#finalize();
          return;
        }

        const transaction = db.transaction(this.table, 'readwrite');

        if (!transaction) {
          this.error = new Error('Failed to upgrade database.');
          this.status = 'closed';
          this.#finalize();
          return;
        }

        if (!db.objectStoreNames.contains(this.table)) {
          const store = db.createObjectStore(table, { keyPath: 'id' });

          if (indexes) {
            for (const name of indexes) {
              if (!name.startsWith('-')) {
                store.createIndex(name, name);
              }
            }
          }

          this.#table = store;
        } else if (indexes) {
          const store = transaction.objectStore(this.table);

          for (const name of indexes) {
            try {
              if (name.startsWith('-')) {
                if (!store.indexNames.contains(name)) {
                  store.createIndex(name, name);
                }
              } else {
                if (store.indexNames.contains(name)) {
                  store.deleteIndex(name);
                }
              }
            } catch (error) {
              logger.warn(error);
            }
          }

          this.#table = store;
        }
      };

      request.onsuccess = () => {
        this.#db = request.result;

        if (!this.#db) {
          this.error = new Error('Failed to open database.');
          this.status = 'closed';
          return;
        }

        if (!this.#table) {
          this.#table = this.#db.transaction(this.table, 'readwrite').objectStore(this.table);
        }

        this.status = 'open';
        this.#finalize();
      };

      request.onerror = () => {
        this.error = request.error as Error;
        this.status = 'closed';
        this.#finalize();
      };
    } else {
      this.error = new Error('IndexedDB is not supported.');
      this.status = 'closed';
      this.#finalize();
    }
  }

  #finalize() {
    for (const submit of this.#queues) {
      if (isFunction(submit)) {
        submit();
      }
    }

    this.#queues.clear();
  }

  public read(id: string): Promise<IndexedRecord<T> | undefined> {
    return new Promise((resolve, reject) => {
      const submit = () => {
        if (this.status === 'closed') {
          return reject(new Error('Table is closed.'));
        }

        if (!this.#table) {
          return reject(new Error('Table not initialized.'));
        }

        read<T>(this.#table, id).then(resolve).catch(reject);
      };

      if (this.status === 'init') {
        return this.#queues.add(submit);
      } else {
        submit();
      }
    });
  }

  public create(payload: T): Promise<IndexedRecord<T> | undefined> {
    return new Promise((resolve, reject) => {
      const submit = () => {
        if (this.status === 'closed') {
          return reject(new Error('Table is closed.'));
        }

        if (!this.#table) {
          return reject(new Error('Cannot create item on non-initialized table.'));
        }

        create<T>(this.#table, payload).then(resolve).catch(reject);
      };

      if (this.status === 'init') {
        return this.#queues.add(submit);
      } else {
        submit();
      }
    });
  }

  public update(id: string, payload: Partial<T>): Promise<IndexedRecord<T>> {
    return new Promise((resolve, reject) => {
      const submit = () => {
        if (this.status === 'closed') {
          return reject(new Error('Table is closed.'));
        }

        if (!this.#table) {
          return reject(new Error('Table not initialized.'));
        }

        update<T>(this.#table, id, payload).then(resolve).catch(reject);
      };

      if (this.status === 'init') {
        return this.#queues.add(submit);
      } else {
        submit();
      }
    });
  }

  public delete(id: string): Promise<true> {
    return new Promise((resolve, reject) => {
      const submit = () => {
        if (this.status === 'closed') {
          return reject(new Error('Table is closed.'));
        }

        if (!this.#table) {
          return reject(new Error('Table not initialized.'));
        }

        remove(this.#table, id).then(resolve).catch(reject);
      };

      if (this.status === 'init') {
        return this.#queues.add(submit);
      } else {
        submit();
      }
    });
  }
}

const read = <T extends PlainObject>(table: IDBObjectStore, id: string): Promise<IndexedRecord<T> | undefined> => {
  return new Promise<IndexedRecord<T>>((resolve, reject) => {
    const request = table.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const create = <T extends PlainObject>(table: IDBObjectStore, payload: T): Promise<IndexedRecord<T>> => {
  return new Promise<IndexedRecord<T>>((resolve, reject) => {
    const record = {
      id: shortId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...payload,
    };

    const request = table.add(record);
    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });
};

const update = async <T extends PlainObject>(
  table: IDBObjectStore,
  id: string,
  payload: Partial<T>
): Promise<IndexedRecord<T>> => {
  const current = await read<T>(table, id);

  if (!current) {
    throw new Error(`Record with id ${id} not found.`);
  }

  return await new Promise<IndexedRecord<T>>((resolve, reject) => {
    const record = {
      ...current,
      ...payload,
      updated_at: new Date().toISOString(),
    };

    const request = table.put(record, id);
    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });
};

const remove = (table: IDBObjectStore, id: string): Promise<true> => {
  return new Promise((resolve, reject) => {
    const request = table.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};
