import type { InferList, InferRow } from '@anchorlib/storage/db';
import { createRecord, createTable } from '@anchorlib/storage/db';
import { anchor } from '@anchorlib/core';

export type Todo = {
  text: string;
  completed: boolean;
};

export const todoTable = createTable<Todo>('todos');

todoTable.seed([
  createRecord({ text: 'Learn Svelte', completed: true }),
  createRecord({ text: 'Learn Anchor', completed: false }),
]);

export type TodoRec = InferRow<typeof todoTable>;
export type TodoRecList = InferList<typeof todoTable>;

export const counter = anchor({ count: 0 });
