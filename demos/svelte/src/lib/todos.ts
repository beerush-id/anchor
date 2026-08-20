import { mutable } from '@airlib/svelte';
import type { InferList, InferRow } from '@airlib/svelte/storage';
import { createRecord, createTable } from '@airlib/svelte/storage';

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
