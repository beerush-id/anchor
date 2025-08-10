import { isFunction } from '@beerush/utils';
import { IDBStatus, IndexedStore } from './db.js';
import { create, DEFAULT_FIND_LIMIT, type FilterFn, find, read, type Rec, remove, type Row, update } from './helper.js';

/**
 * IndexedDB Table is a promise-first API for IndexedDB.
 * It provides a simple way to interact with IndexedDB.
 * As it is promise-first, users doesn't need to wait for the database to be ready before using it.
 * It also provides a simple way to subscribe to events.
 */
export class IndexedTable<T extends Rec, R extends Row<T> = Row<T>> extends IndexedStore {
  protected queues = new Set<() => void>();

  get reader(): IDBObjectStore {
    return this.instance?.transaction(this.name).objectStore(this.name) as IDBObjectStore;
  }

  get writer(): IDBObjectStore {
    return this.instance?.transaction(this.name, 'readwrite').objectStore(this.name) as IDBObjectStore;
  }

  constructor(
    protected name: string,
    protected version = 1,
    protected indexes?: Array<keyof R>,
    protected remIndexes?: Array<keyof R>,
    dbName = name
  ) {
    super(dbName, version);
    this.init();

    if (dbName === name) {
      this.open();
    }
  }

  protected upgrade(event: IDBVersionChangeEvent): void {
    const indexes = [...(this.indexes || [])];

    if (!indexes.includes('created_at')) {
      indexes.push('created_at');
    }

    if (!indexes.includes('updated_at')) {
      indexes.push('updated_at');
    }

    const db = (event.target as IDBOpenDBRequest)?.result as IDBDatabase;
    const transaction = (event.target as IDBOpenDBRequest).transaction as IDBTransaction;
    const store = db.objectStoreNames.contains(this.name)
      ? transaction.objectStore(this.name)
      : db.createObjectStore(this.name, { keyPath: 'id' });

    if (indexes.length) {
      for (const name of indexes as string[]) {
        if (!store.indexNames.contains(name)) {
          store.createIndex(name, name);
        }
      }
    }

    if (this.remIndexes?.length) {
      for (const name of this.remIndexes as string[]) {
        if (store.indexNames.contains(name)) {
          store.deleteIndex(name);
        }
      }
    }
  }

  protected finalize() {
    for (const submit of this.queues) {
      if (isFunction(submit)) {
        submit();
      }
    }

    this.queues.clear();
    this.publish({ type: this.status });
  }

  public find(
    filter?: IDBKeyRange | FilterFn,
    limit = DEFAULT_FIND_LIMIT,
    direction?: IDBCursorDirection
  ): Promise<R[]> {
    return new Promise((resolve, reject) => {
      const submit = () => {
        if (this.status === IDBStatus.Closed) {
          return reject(new Error('Table is closed.'));
        }

        find<R>(this.reader, filter, limit, direction).then(resolve).catch(reject);
      };

      if (this.status === IDBStatus.Init) {
        this.queues.add(submit);
      } else {
        submit();
      }
    });
  }

  public findByIndex(
    index: keyof R,
    filter?: IDBKeyRange | FilterFn,
    limit = DEFAULT_FIND_LIMIT,
    direction?: IDBCursorDirection
  ): Promise<R[]> {
    return new Promise((resolve, reject) => {
      const submit = () => {
        if (this.status === IDBStatus.Closed) {
          return reject('Table is closed.');
        }

        find<R>(this.reader.index(index as string), filter, limit, direction)
          .then(resolve)
          .catch(reject);
      };

      if (this.status === IDBStatus.Init) {
        this.queues.add(submit);
      } else {
        submit();
      }
    });
  }

  public read(id: string): Promise<R | undefined> {
    return new Promise((resolve, reject) => {
      const submit = () => {
        if (this.status === IDBStatus.Closed) {
          return reject(new Error('Table is closed.'));
        }

        read<R>(this.reader, id).then(resolve).catch(reject);
      };

      if (this.status === IDBStatus.Init) {
        return this.queues.add(submit);
      } else {
        submit();
      }
    });
  }

  public create(payload: T): Promise<R> {
    return new Promise((resolve, reject) => {
      const submit = () => {
        if (this.status === IDBStatus.Closed) {
          return reject(new Error('Table is closed.'));
        }

        create<T, R>(this.writer, payload).then(resolve).catch(reject);
      };

      if (this.status === IDBStatus.Init) {
        return this.queues.add(submit);
      } else {
        submit();
      }
    });
  }

  public update(id: string, payload: Partial<T>): Promise<R> {
    return new Promise((resolve, reject) => {
      const submit = () => {
        if (this.status === IDBStatus.Closed) {
          return reject(new Error('Table is closed.'));
        }

        update<T, R>(this.writer, id, payload).then(resolve).catch(reject);
      };

      if (this.status === IDBStatus.Init) {
        return this.queues.add(submit);
      } else {
        submit();
      }
    });
  }

  public delete(id: string): Promise<true> {
    return new Promise((resolve, reject) => {
      const submit = () => {
        if (this.status === IDBStatus.Closed) {
          return reject(new Error('Table is closed.'));
        }

        remove(this.writer, id).then(resolve).catch(reject);
      };

      if (this.status === IDBStatus.Init) {
        return this.queues.add(submit);
      } else {
        submit();
      }
    });
  }
}
