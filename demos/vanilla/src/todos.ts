import { createRecord, createTable, type InferList, type InferRow } from '@anchorlib/storage/db';

export type Todo = {
  text: string;
  completed: boolean;
};

export const todoTable = createTable<Todo>('todos');

todoTable.seed([
  createRecord({ text: 'Learn Anchor', completed: true }),
  createRecord({ text: 'Build a Todo App', completed: false }),
]);

export type TodoRec = InferRow<typeof todoTable>;
export type TodoRecList = InferList<typeof todoTable>;
