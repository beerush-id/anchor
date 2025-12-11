import {
  createTable,
  type FilterFn,
  type InferRec,
  type ReactiveTable,
  type Rec,
  type Row,
} from '@anchorlib/storage/db';
import { onDestroy } from 'svelte';
import type { TableRef } from './types.js';

/**
 * @deprecated Use `createTable()` instead.
 */
export function createTableRef<T extends ReactiveTable<Rec>>(table: T): TableRef<InferRec<T>>;
/**
 * @deprecated Use `createTable()` instead.
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

      onDestroy(() => {
        tableRef.leave(id);
      });

      return state;
    },
    add(payload: T) {
      const state = tableRef.add(payload);

      onDestroy(() => {
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