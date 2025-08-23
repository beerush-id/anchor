import { isFunction } from '@beerush/utils';
import { DB_SYNC_DELAY, IDBStatus, IndexedStore } from './db.js';
import {
  create,
  createRecord,
  DEFAULT_FIND_LIMIT,
  type FilterFn,
  find,
  read,
  type Rec,
  remove,
  type Row,
  update,
} from './helper.js';
import { anchor, derive, microtask, type StateUnsubscribe } from '@anchor/core';

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

export type RowStatus = 'init' | 'pending' | 'ready' | 'error' | 'removed';
export type RowRequest = {
  status: RowStatus;
  error?: Error;
};
export type RowState<R extends Row<Rec>> = RowRequest & {
  data: R;
};
export type RowListState<R extends Row<Rec>> = RowRequest & {
  data: R[];
};

/**
 * ReactiveTable interface provides a reactive wrapper around IndexedTable operations.
 * It manages state synchronization and provides reactive data access patterns.
 *
 * @template T - The base record type that extends Rec
 * @template R - The row type that extends Row<T>, defaults to Row<T>
 */
export interface ReactiveTable<T extends Rec, R extends Row<T> = Row<T>> {
  /**
   * Gets a reactive row state by ID.
   * If the row doesn't exist in the local cache, it will be fetched from the database.
   *
   * @param id - The record ID to fetch
   * @returns RowState containing the reactive data and status
   */
  get(id: string): RowState<R>;

  /**
   * Adds a new record to the table.
   * Creates a reactive row state and persists the data to the database.
   *
   * @param payload - The record data to create
   * @returns RowState containing the reactive data and status
   */
  add(payload: T): RowState<R>;

  /**
   * Lists records matching the filter criteria.
   * Returns a reactive list state that updates when the underlying data changes.
   *
   * @param filter - The filter criteria (IDBKeyRange or FilterFn) (optional)
   * @param limit - Maximum number of records to return (default: DEFAULT_FIND_LIMIT)
   * @param direction - Cursor direction for sorting (optional)
   * @returns RowListState containing the reactive data array and status
   */
  list(filter?: IDBKeyRange | FilterFn, limit?: number, direction?: IDBCursorDirection): RowListState<R>;

  /**
   * Lists records by index matching the filter criteria.
   * Returns a reactive list state that updates when the underlying data changes.
   *
   * @param name - The index name to search on
   * @param filter - The filter criteria (IDBKeyRange or FilterFn) (optional)
   * @param limit - Maximum number of records to return (default: DEFAULT_FIND_LIMIT)
   * @param direction - Cursor direction for sorting (optional)
   * @returns RowListState containing the reactive data array and status
   */
  listIndex(
    name: keyof R,
    filter?: IDBKeyRange | FilterFn,
    limit?: number,
    direction?: IDBCursorDirection
  ): RowListState<R>;

  /**
   * Removes a record by ID.
   * Marks the record as deleted in the database and updates the reactive state.
   *
   * @param id - The record ID to delete
   * @returns RowState containing the reactive data and status
   */
  remove(id: string): RowState<R>;
}

export function createTable<T extends Rec, R extends Row<T> = Row<T>>(name: string): ReactiveTable<T, R> {
  const table = new IndexedTable<T, R>(name);

  const rowList = new Map<string, RowState<R>>();
  const rowUsage = new Map<string, number>();
  const rowSubscriptions = new WeakMap<RowState<R>, StateUnsubscribe>();

  // Make sure each record has one manager that in charge of synchronization.
  const ensureRow = (id: string, data = {}, status = 'init') => {
    if (rowList.has(id)) {
      const usage = rowUsage.get(id) ?? 0;
      rowUsage.set(id, usage + 1);
      return rowList.get(id) as RowState<R>;
    }

    const state = anchor.raw({ data, status }) as RowState<R>;
    const [schedule] = microtask(DB_SYNC_DELAY);

    rowList.set(id, state);
    rowUsage.set(id, 1);

    const stateUnsubscribe = derive(state, (snapshot, event) => {
      if (event.type !== 'init' && event.keys.includes('data')) {
        schedule(() => {
          state.status = 'pending';

          table
            .update(id, snapshot.data)
            .then(() => {
              state.status = 'ready';
            })
            .catch((error) => {
              anchor.assign(state, { status: 'error', error });
            });
        });
      }
    });

    const unsubscribe = () => {
      let usage = rowUsage.get(id) ?? 1;

      usage -= 1;

      if (usage <= 0) {
        stateUnsubscribe();

        rowList.delete(id);
        rowUsage.delete(id);
        rowSubscriptions.delete(state);
      } else {
        rowUsage.set(id, usage);
      }
    };

    rowSubscriptions.set(state, unsubscribe);

    return state;
  };

  return {
    get(id: string): RowState<R> {
      const state = ensureRow(id);

      if (state.status === 'init') {
        state.status = 'pending';

        table
          .read(id)
          .then((data) => {
            if (data) {
              anchor.assign(state, { data, status: 'ready' });
            } else {
              anchor.assign(state, { status: 'error', error: new Error('Not found.') });
            }
          })
          .catch((error) => {
            anchor.assign(state, { status: 'error', error });
          });
      }

      return state;
    },
    add(payload: T): RowState<R> {
      const row = createRecord<T>(payload);
      const state = ensureRow(row.id, row);

      if (state.status === 'init') {
        state.status = 'pending';

        table
          .create(payload)
          .then(() => {
            anchor.assign(state, { status: 'ready' });
          })
          .catch((error) => {
            anchor.assign(state, { status: 'error', error });
          });
      }

      return state;
    },
    list(filter?: IDBKeyRange | FilterFn, limit = DEFAULT_FIND_LIMIT, direction?: IDBCursorDirection) {
      const state = anchor.raw<RowListState<R>>({
        data: [],
        status: 'pending',
      });

      table
        .find(filter, limit, direction)
        .then((res) => {
          res = res.map((rec) => ensureRow(rec.id, rec, 'ready').data);

          anchor.assign(state, {
            data: res,
            status: 'ready',
          });
        })
        .catch((error) => {
          anchor.assign(state, {
            status: 'error',
            error,
          });
        });

      return state;
    },
    listIndex(
      name: keyof R,
      filter?: IDBKeyRange | FilterFn,
      limit?: number,
      direction?: IDBCursorDirection
    ): RowListState<R> {
      const state = anchor.raw<RowListState<R>>({
        data: [],
        status: 'init',
      });

      table
        .findByIndex(name, filter, limit, direction)
        .then((res) => {
          res = res.map((rec) => ensureRow(rec.id, rec, 'ready').data);

          anchor.assign(state, {
            data: res,
            status: 'ready',
          });
        })
        .catch((error) => {
          anchor.assign(state, { status: 'error', error });
        });

      return state;
    },
    remove(id: string): RowState<R> {
      const state = ensureRow(id);

      if (state.status === 'init') {
        state.status = 'pending';
        state.data.deleted_at = new Date();

        table
          .delete(id)
          .then(() => {
            anchor.assign(state, { status: 'removed' });

            rowList.delete(id);
            rowUsage.delete(id);
            rowSubscriptions.get(state)?.();
          })
          .catch((error) => {
            delete state.data.deleted_at;
            anchor.assign(state, { status: 'error', error });
          });
      }

      return state;
    },
    leave(id: string) {
      const state = rowList.get(id);

      if (state) {
        rowSubscriptions.get(state)?.();
      }
    },
  } as ReactiveTable<T, R>;
}
