import type { IndexedKv } from './kv.js';

export enum IDBStatus {
  Idle = 'idle',
  Init = 'init',
  Open = 'open',
  Closed = 'closed',
}

export type DBEvent = {
  type: IDBStatus;
};

export type DBSubscriber = (event: DBEvent) => void;
export type DBUnsubscribe = () => void;
export type UpgradeList = Set<(event: IDBVersionChangeEvent) => void>;
export type LoaderList = Set<(db: IDBDatabase) => Promise<void> | void>;
export type RejectList = Set<(error: DOMException | null) => void>;
export type CloseList = Set<(error?: Error) => void>;

export type Connection = {
  name: string;
  version: number;
  error?: DOMException | Error | null;
  status: IDBStatus;
  onUpgrade: UpgradeList;
  onLoaded: LoaderList;
  onClosed: CloseList;
  onError: RejectList;
  open: () => Connection;
  close: (error?: Error) => void;
  instance?: IDBDatabase;
};

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
 * Type definition for values that can be stored in the key-value store.
 * Storable types include primitive values, objects, and arrays that can be serialized.
 */
export type Storable =
  | string
  | number
  | boolean
  | null
  | Date
  | {
      [key: string]: Storable;
    }
  | Array<Storable>;

export type KVSeed<T> = [string, T];

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
   */ <T extends Storable>(key: string, init?: T): KVState<T>;

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
  ready(): Promise<true>;

  /**
   * Returns the store instance.
   * @returns {IndexedKv<T>}
   */
  store<T extends Storable>(): IndexedKv<T>;
}

export type Rec = {
  [key: string]: Storable;
};

export type Row<T extends Rec> = T & {
  id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
};

export type FilterFn = <T extends Rec>(record: Row<T>) => boolean;
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

  /**
   * Decrements the reference count for a row and cleans up if no longer used.
   * @param id - The record ID to leave
   */
  leave(id: string): void;
}
