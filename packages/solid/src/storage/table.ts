import {
  createTable,
  type FilterFn,
  type InferRec,
  type ReactiveTable,
  type Rec,
  type Row,
  type RowListState,
  type RowState,
} from '@anchorlib/storage/db';
import { onCleanup } from 'solid-js';

export interface TableRef<T extends Rec, R extends Row<T> = Row<T>> {
  /**
   * Get a row by its id.
   * @param id - The id of the row to get.
   * @returns The state of the requested row.
   */
  get(id: string): RowState<R>;

  /**
   * Add a new row to the table.
   * @param payload - The data to add as a new row.
   * @returns The state of the newly added row.
   */
  add(payload: T): RowState<R>;

  /**
   * Remove a row by its id.
   * @param id - The id of the row to remove.
   * @returns The state of the removed row.
   */
  remove(id: string): RowState<R>;

  /**
   * List rows in the table with optional filtering, limiting, and ordering.
   * @param filter - A filter function or IDBKeyRange to filter rows.
   * @param limit - Maximum number of rows to return.
   * @param direction - Direction to iterate through the rows.
   * @returns The state of the row list.
   */
  list(filter?: IDBKeyRange | FilterFn<R>, limit?: number, direction?: IDBCursorDirection): RowListState<R>;

  /**
   * List rows by a specific index with optional filtering, limiting, and ordering.
   * @param name - The index name to use for listing.
   * @param filter - A filter function or IDBKeyRange to filter rows.
   * @param limit - Maximum number of rows to return.
   * @param direction - Direction to iterate through the rows.
   * @returns The state of the row list.
   */
  listByIndex(
    name: keyof R,
    filter?: IDBKeyRange | FilterFn<R>,
    limit?: number,
    direction?: IDBCursorDirection
  ): RowListState<R>;

  /**
   * Seed the table with initial data.
   * @param seeds - Array of initial row data.
   * @returns The table reference instance for chaining.
   */
  seed<T extends R[]>(seeds: T): this;

  /**
   * Get the underlying reactive table instance.
   * @returns The reactive table instance.
   */
  table(): ReactiveTable<T>;
}

export type InferRef<T> = T extends TableRef<Rec, infer R> ? R : never;
export type InferListRef<T> = T extends TableRef<Rec, infer R> ? R[] : never;

/**
 * @deprecated Use `createTable()` instead.
 * Creates a TableRef from an existing ReactiveTable instance.
 * @param table - The existing ReactiveTable instance to wrap.
 * @returns A TableRef wrapping the provided table.
 */
export function createTableRef<T extends ReactiveTable<Rec>>(table: T): TableRef<InferRec<T>>;

/**
 * @deprecated Use `createTable()` instead.
 * Creates a TableRef by creating a new ReactiveTable with the specified parameters.
 * @param name - The name of the table to create.
 * @param version - The version of the table schema (default: 1).
 * @param indexes - Array of property names to create indexes for.
 * @param remIndexes - Array of property names to remove indexes for.
 * @param dbName - The name of the database to use (defaults to tableName).
 * @returns A TableRef wrapping the newly created table.
 */
export function createTableRef<T extends Rec, R extends Row<T> = Row<T>>(
  name: string,
  version?: number,
  indexes?: (keyof R)[],
  remIndexes?: (keyof R)[],
  dbName?: string
): TableRef<T, R>;

/**
 * @deprecated Use `createTable()` instead.
 * Implementation of createTableRef that handles both overloads.
 * @param tableName - Either the name of the table to create or an existing ReactiveTable instance.
 * @param version - The version of the table schema (default: 1).
 * @param indexes - Array of property names to create indexes for.
 * @param remIndexes - Array of property names to remove indexes for.
 * @param dbName - The name of the database to use (defaults to tableName).
 * @returns A TableRef wrapping either the existing or newly created table.
 */
export function createTableRef<T extends Rec, R extends Row<T> = Row<T>>(
  tableName: string | ReactiveTable<T>,
  version = 1,
  indexes?: (keyof R)[],
  remIndexes?: (keyof R)[],
  dbName = tableName as string
): TableRef<T, R> {
  if (typeof tableName === 'string') {
    tableName = createTable<T, R>(tableName, version, indexes, remIndexes, dbName);
  }

  const tableRef = tableName as ReactiveTable<T, R>;

  return {
    get(id: string) {
      const state = tableRef.get(id);

      onCleanup(() => {
        tableRef.leave(id);
      });

      return state;
    },
    add(payload: T) {
      const state = tableRef.add(payload);

      onCleanup(() => {
        tableRef.leave(state.data.id);
      });

      return state;
    },
    list(filter?: IDBKeyRange | FilterFn<R>, limit?: number, direction?: IDBCursorDirection) {
      return tableRef.list(filter, limit, direction);
    },
    listByIndex(name: keyof R, filter?: IDBKeyRange | FilterFn<R>, limit?: number, direction?: IDBCursorDirection) {
      return tableRef.listByIndex(name, filter, limit, direction);
    },
    remove(id: string) {
      return tableRef.remove(id);
    },
    seed(seeds: R[]) {
      tableRef.seed(seeds);
      return this;
    },
    table() {
      return tableRef;
    },
  };
}
