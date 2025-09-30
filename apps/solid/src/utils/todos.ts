import { createRecord, createTable } from '@anchorlib/storage/db';
import { createTableRef } from '@anchorlib/solid/storage';

export type Todo = {
  text: string;
  completed: boolean;
};

export const todoTable = createTable<Todo>('todos');

todoTable.seed([
  createRecord({ text: 'Learn Solid', completed: true }),
  createRecord({ text: 'Learn Anchor', completed: false }),
]);

export const todoTableRef = createTableRef(todoTable);

export type TodoRec = InferRow<typeof todoTable>;
export type TodoRef = InferRef<typeof todoTableRef>;
export type TodoRecList = InferList<typeof todoTable>;
export type TodoRefList = InferListRef<typeof todoTableRef>;

type InferRow<T> = T extends { get(id: string): { data: infer R } } ? R : never;
type InferList<T> = T extends { list(): { data: infer R } } ? R : never;
type InferRef<T> = T extends { get(id: string): infer R } ? R : never;
type InferListRef<T> = T extends { list(): infer R } ? R : never;
