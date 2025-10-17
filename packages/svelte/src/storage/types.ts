import type { FilterFn, ReactiveTable, Rec, Row, RowListState, RowState } from '@anchorlib/storage/db';

export interface TableRef<T extends Rec, R extends Row<T> = Row<T>> {
  get(id: string): RowState<R>;
  add(payload: T): RowState<R>;
  remove(id: string): RowState<R>;
  list(filter?: IDBKeyRange | FilterFn<R>, limit?: number, direction?: IDBCursorDirection): RowListState<R>;
  listByIndex(
    name: keyof R,
    filter?: IDBKeyRange | FilterFn<R>,
    limit?: number,
    direction?: IDBCursorDirection
  ): RowListState<R>;
  seed<T extends R[]>(seeds: T): this;
  table(): ReactiveTable<T>;
}

export type InferRef<T> = T extends TableRef<Rec, infer R> ? R : never;
export type InferListRef<T> = T extends TableRef<Rec, infer R> ? R[] : never;
