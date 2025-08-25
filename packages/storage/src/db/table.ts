import { isArray, isDefined, isFunction } from '@beerush/utils';
import { DB_SYNC_DELAY, IndexedStore } from './db.js';
import {
  count as countRecord,
  create,
  createRecord,
  DEFAULT_FIND_LIMIT,
  find,
  read,
  remove,
  update,
} from './helper.js';
import { anchor, captureStack, derive, microtask, type StateUnsubscribe } from '@anchor/core';
import {
  type FilterFn,
  IDBStatus,
  type ReactiveTable,
  type Rec,
  type Row,
  type RowList,
  type RowListState,
  type RowState,
} from './types.js';

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
   * @param seeds - Array of seed data to insert into the table for the first time (default: undefined)
   */
  constructor(
    protected name: string,
    protected version = 1,
    protected indexes?: Array<keyof R>,
    protected remIndexes?: Array<keyof R>,
    dbName = name,
    protected seeds?: R[]
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
   * Sets up the table by seeding initial data if the table is empty.
   * This method is called during initialization to populate the table
   * with seed data if no records exist.
   * @returns {Promise<void>} A promise that resolves when setup is complete
   */
  protected async setup(): Promise<void> {
    if (isDefined(this.seeds) && !isArray(this.seeds)) {
      const error = new Error('Seed Error: Invalid seed data');
      captureStack.error.argument('The given data is not a valid seed data.', error);
    }

    if (isArray(this.seeds)) {
      const total = await countRecord(this.reader);

      if (total <= 0) {
        for (const seed of this.seeds) {
          if (typeof seed !== 'object' || seed === null) {
            const error = new Error(`Seed Error: Invalid seed data`);
            captureStack.error.external('Invalid seed data: Object is not JSON serializable.', error as Error);
            continue;
          }

          let data: string;

          try {
            data = JSON.stringify(seed, null, 2);
          } catch (err) {
            const error = new Error(`Seed Error: ${(err as Error).message}`);
            captureStack.error.external('Invalid seed data: Object is not JSON serializable.', error as Error);
            continue;
          }

          try {
            await create(this.writer, seed);
          } catch (err) {
            const error = new Error(`Seed Error: ${(err as Error).message}`);
            captureStack.error.external(
              `Unable to seed table "${this.name}@${this.version}" with:\n\n${data}`,
              error as Error
            );
          }
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
   * Sets the seed data for the table.
   * This method allows updating the seed data that will be used to populate
   * the table when it's first created and empty.
   *
   * @param seeds - Array of seed data to insert into the table for the first time
   */
  public seed(seeds: R[]): this {
    this.seeds = seeds;
    return this;
  }

  /**
   * Counts the number of records matching the filter criteria
   * @param filter - The filter criteria (IDBKeyRange or FilterFn)
   * @returns Promise resolving to the count of records
   */
  public count(filter?: IDBKeyRange | FilterFn<R>): Promise<number> {
    return new Promise((resolve, reject) => {
      const submit = () => {
        if (this.status === IDBStatus.Closed) {
          return reject(new Error('Table is closed.'));
        }

        countRecord(this.reader, filter).then(resolve).catch(reject);
      };

      if (this.status === IDBStatus.Init) {
        this.queues.add(submit);
      } else {
        submit();
      }
    });
  }

  /**
   * Counts the number of records by index matching the filter criteria
   * @param index - The index name to count on
   * @param filter - The filter criteria (IDBKeyRange or FilterFn)
   * @returns Promise resolving to the count of records
   */
  public countByIndex(index: keyof R, filter?: IDBKeyRange | FilterFn<R>): Promise<number> {
    return new Promise((resolve, reject) => {
      const submit = () => {
        if (this.status === IDBStatus.Closed) {
          return reject(new Error('Table is closed.'));
        }

        countRecord(this.reader.index(index as string), filter)
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
   * Finds records matching the filter criteria
   * @param filter - The filter criteria (IDBKeyRange or FilterFn)
   * @param limit - Maximum number of records to return (default: DEFAULT_FIND_LIMIT)
   * @param direction - Cursor direction (default: undefined)
   * @returns Promise resolving to array of records
   */
  public find(
    filter?: IDBKeyRange | FilterFn<R>,
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
   * Lists records matching the filter criteria with pagination support.
   * Returns both the records and the total count of matching records.
   *
   * @param filter - The filter criteria (IDBKeyRange or FilterFn)
   * @param limit - Maximum number of records to return (default: DEFAULT_FIND_LIMIT)
   * @param direction - Cursor direction for traversal (default: undefined)
   * @returns Promise resolving to RowList containing records and count
   */
  public list(
    filter?: IDBKeyRange | FilterFn<R>,
    limit = DEFAULT_FIND_LIMIT,
    direction?: IDBCursorDirection
  ): Promise<RowList<T>> {
    return new Promise((resolve, reject) => {
      const submit = () => {
        if (this.status === IDBStatus.Closed) {
          return reject(new Error('Table is closed.'));
        }

        Promise.all([find(this.reader, filter, limit, direction), countRecord(this.reader, filter)])
          .then(([rows, count]) => {
            resolve({ rows, count });
          })
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
   * Lists records by index matching the filter criteria with pagination support.
   * Returns both the records and the total count of matching records.
   *
   * @param index - The index name to search on
   * @param filter - The filter criteria (IDBKeyRange or FilterFn)
   * @param limit - Maximum number of records to return (default: DEFAULT_FIND_LIMIT)
   * @param direction - Cursor direction for traversal (default: undefined)
   * @returns Promise resolving to RowList containing records and count
   */
  public listByIndex(
    index: keyof R,
    filter?: IDBKeyRange | FilterFn<R>,
    limit = DEFAULT_FIND_LIMIT,
    direction?: IDBCursorDirection
  ): Promise<RowList<T>> {
    return new Promise((resolve, reject) => {
      const submit = () => {
        if (this.status === IDBStatus.Closed) {
          return reject(new Error('Table is closed.'));
        }

        Promise.all([
          find(this.reader.index(index as string), filter, limit, direction),
          countRecord(this.reader.index(index as string), filter),
        ])
          .then(([rows, count]) => {
            resolve({ rows, count });
          })
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
   * Finds records by index matching the filter criteria
   * @param index - The index name to search on
   * @param filter - The filter criteria (IDBKeyRange or FilterFn)
   * @param limit - Maximum number of records to return (default: DEFAULT_FIND_LIMIT)
   * @param direction - Cursor direction (default: undefined)
   * @returns Promise resolving to array of records
   */
  public findByIndex(
    index: keyof R,
    filter?: IDBKeyRange | FilterFn<R>,
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

const TABLE_STORES = new Map<string, ReactiveTable<Rec>>();

/**
 * Creates a reactive table instance that provides state management for IndexedDB records.
 * This function wraps an IndexedTable with reactive state management capabilities,
 * allowing for automatic synchronization between memory and database states.
 *
 * @template T - The base record type that extends Rec
 * @template R - The row type that extends Row<T>, defaults to Row<T>
 * @param name - The name of the IndexedDB object store
 * @param version - The version of the database schema
 * @param indexes - An array of index names to create in the object store
 * @param remIndexes - An array of index names to remove from the object store
 * @param dbName - The name of the database
 * @param seeds - An array of seed data to populate the object store
 * @returns A reactive table interface with methods for managing records
 */
export function createTable<T extends Rec, R extends Row<T> = Row<T>>(
  name: string,
  version = 1,
  indexes?: (keyof R)[],
  remIndexes?: (keyof R)[],
  dbName = name,
  seeds?: R[]
): ReactiveTable<T, R> {
  const key = `${dbName}://${name}@${version}`;

  if (TABLE_STORES.has(key)) {
    return TABLE_STORES.get(key) as ReactiveTable<T, R>;
  }

  const table = new IndexedTable<T, R>(name, version, indexes, remIndexes, dbName, seeds);

  /**
   * Map storing row states by record ID
   */
  const rowMaps = new Map<string, RowState<R>>();

  /**
   * Map tracking usage count of each row for reference counting
   */
  const rowUsages = new Map<string, number>();

  /**
   * WeakMap storing unsubscribe functions for row state subscriptions
   */
  const rowSubscriptions = new WeakMap<RowState<R>, StateUnsubscribe>();

  /**
   * Ensures a row state exists for the given ID, creating it if necessary.
   * Implements reference counting to manage row lifecycle.
   *
   * @param id - The record ID
   * @param data - Initial data for the row (default: empty object)
   * @param status - Initial status for the row (default: 'init')
   * @returns The row state for the given ID
   */
  const ensureRow = (id: string, data = {}, status = 'init') => {
    if (rowMaps.has(id)) {
      const usage = rowUsages.get(id) as number;
      rowUsages.set(id, usage + 1);
      return rowMaps.get(id) as RowState<R>;
    }

    const state = anchor.raw({ data, status }) as RowState<R>;
    const [schedule] = microtask(DB_SYNC_DELAY);

    rowMaps.set(id, state);
    rowUsages.set(id, 1);

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
      let usage = rowUsages.get(id) as number;

      usage -= 1;

      if (usage <= 0) {
        stateUnsubscribe();

        rowMaps.delete(id);
        rowUsages.delete(id);
        rowSubscriptions.delete(state);
      } else {
        rowUsages.set(id, usage);
      }
    };

    rowSubscriptions.set(state, unsubscribe);

    return state;
  };

  const tableRef = {
    /**
     * Gets a row state by ID, initializing it with data from the database if needed.
     * @param id - The record ID
     * @returns The row state
     */
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

    /**
     * Adds a new record to the table.
     * @param payload - The record data to add
     * @returns The row state for the new record
     */
    add(payload: T): RowState<R> {
      const row = createRecord<T>(payload);
      const state = ensureRow(row.id, row);

      if (state.status === 'init') {
        state.status = 'pending';

        table
          .create(row)
          .then(() => {
            anchor.assign(state, { status: 'ready' });
          })
          .catch((error) => {
            anchor.assign(state, { status: 'error', error });
          });
      }

      return state;
    },

    /**
     * Lists records matching filter criteria.
     * @param filter - The filter criteria (IDBKeyRange or FilterFn)
     * @param limit - Maximum number of records to return (default: DEFAULT_FIND_LIMIT)
     * @param direction - Cursor direction (default: undefined)
     * @returns A state object containing the list of records
     */
    list(filter?: IDBKeyRange | FilterFn<R>, limit = DEFAULT_FIND_LIMIT, direction?: IDBCursorDirection) {
      const state = anchor.raw<RowListState<R>>({
        data: [],
        count: 0,
        status: 'pending',
      });

      table
        .list(filter, limit, direction)
        .then((res) => {
          const data = res.rows.map((rec) => ensureRow(rec.id, rec, 'ready').data);

          anchor.assign(state, {
            data,
            count: res.count,
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

    /**
     * Lists records by index matching filter criteria.
     * @param name - The index name to search on
     * @param filter - The filter criteria (IDBKeyRange or FilterFn)
     * @param limit - Maximum number of records to return
     * @param direction - Cursor direction
     * @returns A state object containing the list of records
     */
    listByIndex(
      name: keyof R,
      filter?: IDBKeyRange | FilterFn<R>,
      limit?: number,
      direction?: IDBCursorDirection
    ): RowListState<R> {
      const state = anchor.raw<RowListState<R>>({
        data: [],
        count: 0,
        status: 'pending',
      });

      table
        .listByIndex(name, filter, limit, direction)
        .then((res) => {
          const data = res.rows.map((rec) => ensureRow(rec.id, rec, 'ready').data);

          anchor.assign(state, {
            data,
            count: res.count,
            status: 'ready',
          });
        })
        .catch((error) => {
          anchor.assign(state, { status: 'error', error });
        });

      return state;
    },

    /**
     * Removes a record by ID.
     * @param id - The record ID to remove
     * @returns The row state for the removed record
     */
    remove(id: string): RowState<R> {
      const state = ensureRow(id);

      state.status = 'pending';
      state.data.deleted_at = new Date();

      table
        .delete(id)
        .then(() => {
          anchor.assign(state, { status: 'removed' });

          rowMaps.delete(id);
          rowUsages.set(id, 1);
          rowSubscriptions.get(state)?.();
        })
        .catch((error) => {
          delete state.data.deleted_at;
          anchor.assign(state, { status: 'error', error });
        });

      return state;
    },

    /**
     * Decrements the reference count for a row and cleans up if no longer used.
     * @param id - The record ID to leave
     */
    leave(id: string) {
      const state = rowMaps.get(id);

      if (state) {
        rowSubscriptions.get(state)?.();
      }
    },

    /**
     * Convert the state into a promise that resolves when the state is ready.
     * @param {T} state
     * @returns {Promise<T>}
     */
    async promise<T extends RowState<R> | RowListState<R>>(state: T): Promise<T> {
      if (state.status === 'pending') {
        return await new Promise<T>((resolve, reject) => {
          const unsubscribe = derive(state, (snapshot, event) => {
            if (event.type !== 'init' && !event.keys.includes('data')) {
              if (state.error) {
                reject(state.error);
              } else {
                resolve(state);
              }

              unsubscribe();
            }
          });
        });
      }

      return state;
    },

    /**
     * Gets the underlying table store.
     * @returns {IndexedTable<T, R>}
     */
    store() {
      return table;
    },
  } as ReactiveTable<T, R>;

  TABLE_STORES.set(key, tableRef);

  return tableRef;
}
