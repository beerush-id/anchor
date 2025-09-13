import type { FilterFn, ReactiveTable, Rec, Row, RowListState, RowState } from '@anchorlib/storage/db';
import type { ConstantRef, ConstantState } from '@base/index.js';

export type TableRef<T extends Rec, R extends Row<T> = Row<T>> = {
  get(id: string): ConstantState<RowState<R>>;
  add(payload: T): RowState<R>;
  remove(id: string): RowState<R>;
  list(
    filter?: IDBKeyRange | FilterFn<T>,
    limit?: number,
    direction?: IDBCursorDirection
  ): ConstantState<RowListState<R>>;
  listByIndex(
    name: keyof R,
    filter?: IDBKeyRange | FilterFn<T>,
    limit?: number,
    direction?: IDBCursorDirection
  ): ConstantState<RowListState<R>>;
  seed(seeds: T[]): TableRef<T, R>;
  table(): ReactiveTable<T, R>;
};

export type InferRef<T> = T extends TableRef<Rec, infer R> ? ConstantRef<R> : never;
export type InferListRef<T> = T extends TableRef<Rec, infer R> ? ConstantRef<R[]> : never;
