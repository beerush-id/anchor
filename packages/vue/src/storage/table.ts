import {
  createTable,
  type FilterFn,
  type InferRec,
  type ReactiveTable,
  type Rec,
  type Row,
  type RowListState,
  type RowState,
} from '@anchor/storage/db';
import { onUnmounted, type Ref } from 'vue';
import { derivedRef } from '../derive.js';

export interface TableRef<T extends Rec, R extends Row<T> = Row<T>> {
  get(id: string): Ref<RowState<R>>;
  add(payload: T): Ref<RowState<R>>;
  remove(id: string): Ref<RowState<R>>;
  list(filter?: IDBKeyRange | FilterFn<R>, limit?: number, direction?: IDBCursorDirection): Ref<RowListState<R>>;
  listByIndex(
    name: keyof R,
    filter?: IDBKeyRange | FilterFn<R>,
    limit?: number,
    direction?: IDBCursorDirection
  ): Ref<RowListState<R>>;
  seed<T extends R[]>(seeds: T): this;
  table(): ReactiveTable<T>;
}

export type InferRef<T> = T extends TableRef<Rec, infer R> ? Ref<R> : never;
export type InferListRef<T> = T extends TableRef<Rec, infer R> ? Ref<R[]> : never;

export function createTableRef<T extends ReactiveTable<Rec>>(table: T): TableRef<InferRec<T>>;
export function createTableRef<T extends Rec, R extends Row<T> = Row<T>>(
  name: string,
  version?: number,
  indexes?: (keyof R)[],
  remIndexes?: (keyof R)[],
  dbName?: string
): TableRef<T, R>;
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

      onUnmounted(() => {
        tableRef.leave(id);
      });

      return derivedRef(state);
    },
    add(payload: T) {
      const state = tableRef.add(payload);

      onUnmounted(() => {
        tableRef.leave(state.data.id);
      });

      return derivedRef(state);
    },
    list(filter?: IDBKeyRange | FilterFn<R>, limit?: number, direction?: IDBCursorDirection) {
      const state = tableRef.list(filter, limit, direction);
      return derivedRef(state);
    },
    listByIndex(name: keyof R, filter?: IDBKeyRange | FilterFn<R>, limit?: number, direction?: IDBCursorDirection) {
      const state = tableRef.listByIndex(name, filter, limit, direction);
      return derivedRef(state);
    },
    remove(id: string) {
      const state = tableRef.remove(id);
      return derivedRef(state);
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
