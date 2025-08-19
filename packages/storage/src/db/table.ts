import { isFunction } from '@beerush/utils';
import { IDBStatus, IndexedStore } from './db.js';
import { create, DEFAULT_FIND_LIMIT, type FilterFn, find, read, type Rec, remove, type Row, update } from './helper.js';

/**
 * IndexedDB Table is a promise-first API for IndexedDB.
 * It provides a simple way to interact with IndexedDB.
 * As it is promise-first, users doesn't need to wait for the database to be ready before using it.
 * It also provides a simple way to subscribe to events.
 *
 * @template T - The base record type that extends Rec
 * @template R - The row type that extends Row<T>, defaults to Row<T>
 */
export class IndexedTable<T extends Rec, R extends Row<T> = Row<T>> extends IndexedStore {
  /**
   * Queue of operations to be executed once the database is ready
   */
  protected queues = new Set<() => void>();

  /**
   * Gets a read-only object store transaction
   */
  get reader(): IDBObjectStore {
    return this.instance?.transaction(this.name).objectStore(this.name) as IDBObjectStore;
  }

  /**
   * Gets a read-write object store transaction
   */
  get writer(): IDBObjectStore {
    return this.instance?.transaction(this.name, 'readwrite').objectStore(this.name) as IDBObjectStore;
  }

  /**
   * Creates a new IndexedTable instance
   * @param name - The name of the object store
   * @param version - The version of the database (default: 1)
   * @param indexes - Array of index names to create (default: undefined)
   * @param remIndexes - Array of index names to remove (default: undefined)
   * @param dbName - The name of the database (default: name)
   */
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

  /**
   * Handles database upgrade events
   * @param event - The IDBVersionChangeEvent
   */
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

  /**
   * Finalizes initialization and executes queued operations
   */
  protected finalize() {
    for (const submit of this.queues) {
      if (isFunction(submit)) {
        submit();
      }
    }

    this.queues.clear();
    this.publish({ type: this.status });
  }

  /**
   * Finds records matching the filter criteria
   * @param filter - The filter criteria (IDBKeyRange or FilterFn)
   * @param limit - Maximum number of records to return (default: DEFAULT_FIND_LIMIT)
   * @param direction - Cursor direction (default: undefined)
   * @returns Promise resolving to array of records
   */
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

  /**
   * Finds records by index matching the filter criteria
   * @param index - The index name to search on
   * @param filter - The filter criteria (IDBKeyRange or FilterFn)
   * @param limit - Maximum number of records to return (default: DEFAULT_FIND_LIMIT)
   * @param direction - Cursor direction (default: undefined)
   * @returns Promise resolving to array of records
   */
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

  /**
   * Reads a single record by ID
   * @param id - The record ID
   * @returns Promise resolving to the record or undefined
   */
  public read(id: string): Promise<R | undefined> {
    return new Promise((resolve, reject) => {
      const submit = () => {
        if (this.status === IDBStatus.Closed) {
          return reject(new Error('Table is closed.'));
        }

        read<R>(this.reader, id)
          .then(resolve as never)
          .catch(reject);
      };

      if (this.status === IDBStatus.Init) {
        return this.queues.add(submit);
      } else {
        submit();
      }
    });
  }

  /**
   * Creates a new record
   * @param payload - The record data to create
   * @returns Promise resolving to the created record
   */
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

  /**
   * Updates an existing record
   * @param id - The record ID to update
   * @param payload - The partial data to update
   * @returns Promise resolving to the updated record
   */
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

  /**
   * Deletes a record by ID
   * @param id - The record ID to delete
   * @returns Promise resolving to true when deletion is complete
   */
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
