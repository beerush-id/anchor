import {
  createTable,
  type FilterFn,
  type ReactiveTable,
  type Rec,
  type Row,
  type RowListState,
  type RowState,
} from '@anchorlib/storage/db';
import type { ConstantState } from '../index.js';
import { CLEANUP_DEBOUNCE_TIME, useConstant, useMicrotask } from '../index.js';
import { useEffect } from 'react';
import type { TableRef } from './types.js';

/**
 * Creates a table reference from an existing reactive table instance.
 *
 * @template P - The type of the record extending Rec
 * @template R - The type of the row extending Row<P>
 * @param table - The reactive table instance to wrap
 * @returns A TableRef object with methods to interact with the table
 */
export function createTableRef<P extends Rec, R extends Row<P> = Row<P>>(table: ReactiveTable<P, R>): TableRef<P, R>;

/**
 * Creates a new table reference with the specified configuration.
 *
 * @template P - The type of the record extending Rec
 * @template R - The type of the row extending Row<P>
 * @param name - The name of the table to create
 * @param version - The version number for the table (default: 1)
 * @param indexes - Optional array of keys to create indexes on
 * @param remIndexes - Optional array of keys to remove indexes from
 * @param dbName - Optional database name (defaults to the table name if not provided)
 * @returns A TableRef object with methods to interact with the table
 */
export function createTableRef<P extends Rec, R extends Row<P> = Row<P>>(
  name: string,
  version?: number,
  indexes?: (keyof R)[],
  remIndexes?: (keyof R)[],
  dbName?: string
): TableRef<P, R>;

/**
 * Creates a table reference object that provides a set of methods to interact with a reactive table.
 *
 * This function creates or wraps a reactive table and returns a TableRef object with methods
 * for common table operations like getting, adding, removing rows, and listing data.
 * It supports both direct table instances and table creation by name.
 *
 * @template P - The type of the record extending Rec
 * @template R - The type of the row extending Row<P>
 *
 * @param table - Either a ReactiveTable instance or a string name to create a new table
 * @param version - The version number for the table (default: 1)
 * @param indexes - Optional array of keys to create indexes on
 * @param remIndexes - Optional array of keys to remove indexes from
 * @param dbName - Optional database name (defaults to the table name if not provided)
 *
 * @returns A TableRef object with methods to interact with the table
 */
export function createTableRef<P extends Rec, R extends Row<P> = Row<P>>(
  table: ReactiveTable<P, R> | string,
  version = 1,
  indexes?: (keyof R)[],
  remIndexes?: (keyof R)[],
  dbName = table as string
): TableRef<P, R> {
  if (typeof table === 'string') {
    table = createTable(table, version, indexes, remIndexes, dbName);
  }
  const tableRef = table as ReactiveTable<P, R>;

  return {
    /**
     * Gets a specific row from the table by its ID.
     *
     * @param id - The ID of the row to retrieve
     * @returns A constant state containing the current row state and the state object
     */
    get(id: string): ConstantState<RowState<R>> {
      return useTableGet(table, id);
    },

    /**
     * Adds a new row to the table.
     *
     * @param payload - The data to add as a new row
     * @returns The row state of the newly added row
     */
    add(payload: P): RowState<R> {
      return tableRef.add(payload);
    },

    /**
     * Removes a row from the table by its ID.
     *
     * @param id - The ID of the row to remove
     * @returns The row state of the removed row
     */
    remove(id: string): RowState<R> {
      return tableRef.remove(id);
    },

    /**
     * Gets a list of rows from the table based on filter criteria.
     *
     * @param filter - Optional filter criteria (IDBKeyRange or custom filter function)
     * @param limit - Optional limit on the number of rows to retrieve
     * @param direction - Optional cursor direction for sorting (e.g., 'next', 'prev')
     * @returns A tuple containing the current list of rows and the state object
     */
    list(
      filter?: IDBKeyRange | FilterFn<P>,
      limit?: number,
      direction?: IDBCursorDirection
    ): ConstantState<RowListState<R>> {
      return useTableList(table, filter, limit, direction);
    },

    /**
     * Gets a list of rows from the table based on an index and filter criteria.
     *
     * @param index - The name of the index to use for querying
     * @param filter - Optional filter criteria (IDBKeyRange or custom filter function)
     * @param limit - Optional limit on the number of rows to retrieve
     * @param direction - Optional cursor direction for sorting (e.g., 'next', 'prev')
     * @returns A tuple containing the current list of rows and the state object
     */
    listByIndex(
      index: keyof R,
      filter?: IDBKeyRange | FilterFn<P>,
      limit?: number,
      direction?: IDBCursorDirection
    ): ConstantState<RowListState<R>> {
      return useTableListByIndex(table, index, filter, limit, direction);
    },

    /**
     * Seeds the table with initial data.
     *
     * @param seeds - Array of rows to seed the table with
     * @returns The TableRef instance for method chaining
     */
    seed(seeds: R[]): TableRef<P, R> {
      tableRef.seed(seeds);
      return this;
    },

    /**
     * Returns the underlying reactive table instance.
     *
     * @returns The ReactiveTable instance
     */
    table() {
      return tableRef;
    },
  };
}

/**
 * Custom hook to manage a specific row from a reactive table.
 *
 * This hook takes a row state and ensures that the row is properly managed
 * within the reactive table. It handles cleanup by leaving the table when
 * the component unmounts or the row changes.
 *
 * @template P - The type of the record extending Rec
 * @template T - The type of the reactive table extending ReactiveTable<P>
 * @template R - The type of the row, defaults to Row<P>
 *
 * @param table - The reactive table instance that contains the row
 * @param row - The row state to manage
 *
 * @returns The same row state passed as argument, but with proper cleanup handling
 */
export function useTableRow<P extends Rec, T extends ReactiveTable<P>, R extends Row<P> = Row<P>>(
  table: T,
  row: RowState<R>
) {
  const [cleanup, cancelCleanup] = useMicrotask(CLEANUP_DEBOUNCE_TIME);

  useEffect(() => {
    cancelCleanup();

    return () => {
      cleanup(() => {
        table.leave(row.data.id);
      });
    };
  }, [row]);

  return row;
}

/**
 * Custom hook to get a specific row from a reactive table by its ID.
 *
 * This hook caches a specific row in the table and returns its current state.
 * It also handles cleanup by leaving the table when the component unmounts or the dependency changes.
 *
 * @template P - The type of the record extending Rec
 * @template T - The type of the reactive table extending ReactiveTable<P>
 * @template R - The type of the row, defaults to Row<P>
 *
 * @param table - The reactive table instance to get the row from
 * @param id - The ID of the row to retrieve
 *
 * @returns A constant state containing the current row state and the state object
 */
export function useTableGet<P extends Rec, T extends ReactiveTable<P>, R extends Row<P> = Row<P>>(
  table: T,
  id: string
): ConstantState<RowState<R>> {
  const [cleanup, cancelCleanup] = useMicrotask(CLEANUP_DEBOUNCE_TIME);
  const [state] = useConstant(() => table.get(id), [table, id]);

  useEffect(() => {
    cancelCleanup();

    return () => {
      cleanup(() => {
        table.leave(id);
      });
    };
  }, [state]);

  return [state.value, state] as ConstantState<RowState<R>>;
}

/**
 * Custom hook to get a list of rows from a reactive table based on filter criteria.
 *
 * This hook caches the list of rows in the table and returns its current state.
 * It supports filtering, limiting, and sorting of the results.
 *
 * @template P - The type of the record extending Rec
 * @template T - The type of the reactive table extending ReactiveTable<P>
 * @template R - The type of the row extending Row<P>
 *
 * @param table - The reactive table instance to get the list from
 * @param filter - Optional filter criteria (IDBKeyRange or custom filter function)
 * @param limit - Optional limit on the number of rows to retrieve
 * @param direction - Optional cursor direction for sorting (e.g., 'next', 'prev')
 *
 * @returns A tuple containing the current list of rows and the state object
 */
export function useTableList<P extends Rec, T extends ReactiveTable<P>, R extends Row<P> = Row<P>>(
  table: T,
  filter?: IDBKeyRange | FilterFn<P>,
  limit?: number,
  direction?: IDBCursorDirection
): ConstantState<RowListState<R>> {
  const [state] = useConstant(() => table.list(filter, limit, direction), [table, filter, limit, direction]);
  return [state.value, state] as ConstantState<RowListState<R>>;
}

/**
 * Custom hook to get a list of rows from a reactive table based on an index and filter criteria.
 *
 * This hook caches the list of rows in the table and returns its current state.
 * It supports filtering, limiting, and sorting of the results based on a specific index.
 *
 * @template P - The type of the record extending Rec
 * @template T - The type of the reactive table extending ReactiveTable<P>
 * @template R - The type of the row extending Row<P>
 *
 * @param table - The reactive table instance to get the list from
 * @param name - The name of the index to use for querying
 * @param filter - Optional filter criteria (IDBKeyRange or custom filter function)
 * @param limit - Optional limit on the number of rows to retrieve
 * @param direction - Optional cursor direction for sorting (e.g., 'next', 'prev')
 *
 * @returns A tuple containing the current list of rows and the state object
 */
export function useTableListByIndex<P extends Rec, T extends ReactiveTable<P>, R extends Row<P> = Row<P>>(
  table: T,
  name: keyof P,
  filter?: IDBKeyRange | FilterFn<P>,
  limit?: number,
  direction?: IDBCursorDirection
): ConstantState<RowListState<R>> {
  const [state] = useConstant(
    () => table.listByIndex(name, filter, limit, direction),
    [table, name, filter, limit, direction]
  );
  return [state.value, state] as ConstantState<RowListState<R>>;
}
