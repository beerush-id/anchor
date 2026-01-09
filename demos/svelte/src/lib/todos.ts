import { mutable } from '@anchorlib/svelte';
import type { InferList, InferRow } from '@anchorlib/svelte/storage';
import { createRecord, createTable } from '@anchorlib/svelte/storage';

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

export const counter = mutable({ count: 0 });
