import { createRecord, createTable, type InferList, type InferRow } from '@anchorlib/react/storage';

export type Todo = {
  text: string;
  completed: boolean;
};

export const todoTable = createTable<Todo>('todos');

todoTable.seed([
  createRecord({ text: 'Learn React', completed: true }),
  createRecord({ text: 'Learn Anchor', completed: false }),
]);

export type TodoRec = InferRow<typeof todoTable>;
export type TodoRecList = InferList<typeof todoTable>;