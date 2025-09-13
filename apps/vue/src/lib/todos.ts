import { createTableRef, type InferListRef, type InferRef } from '@anchorlib/vue/storage';
import type { InferList, InferRow } from '@anchorlib/storage/db';
import { createRecord, createTable } from '@anchorlib/storage/db';

export type Todo = {
  text: string;
  completed: boolean;
};

export const todoTable = createTable<Todo>('todos');

todoTable.seed([
  createRecord({ text: 'Learn Vue', completed: true }),
  createRecord({ text: 'Learn Anchor', completed: false }),
]);

export const todoTableRef = createTableRef(todoTable);

export type TodoRec = InferRow<typeof todoTable>;
export type TodoRef = InferRef<typeof todoTable>;
export type TodoRecList = InferList<typeof todoTable>;
export type TodoRefList = InferListRef<typeof todoTableRef>;
