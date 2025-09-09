import type { FilterFn, ReactiveTable, Rec, Row, RowListState, RowState } from '@anchor/storage/db';
import type { ConstantRef } from '../types.js';

export interface TableRef<T extends Rec, R extends Row<T> = Row<T>> {
  get(id: string): ConstantRef<RowState<R>>;

  add(payload: T): ConstantRef<RowState<R>>;

  remove(id: string): ConstantRef<RowState<R>>;

  list(
    filter?: IDBKeyRange | FilterFn<R>,
    limit?: number,
    direction?: IDBCursorDirection
  ): ConstantRef<RowListState<R>>;

  listByIndex(
    name: keyof R,
    filter?: IDBKeyRange | FilterFn<R>,
    limit?: number,
    direction?: IDBCursorDirection
  ): ConstantRef<RowListState<R>>;

  seed<T extends R[]>(seeds: T): this;

  table(): ReactiveTable<T>;
}

export type InferRef<T> = T extends TableRef<Rec, infer R> ? ConstantRef<R> : never;
export type InferListRef<T> = T extends TableRef<Rec, infer R> ? ConstantRef<R[]> : never;
