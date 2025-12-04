import '@tailwindcss/browser';
import { createRecord, createTable, type InferList, type InferRow, kv } from '@anchorlib/storage/db';
import { setDebugRenderer } from '@anchorlib/react';

setDebugRenderer(true, 300);

export type Todo = {
  text: string;
  completed: boolean;
};

// Create a table for todos.
export const todoTable = createTable<Todo>('todos');

// Seed the table with initial data.
todoTable.seed([
  createRecord({ text: 'Learn React', completed: true }),
  createRecord({ text: 'Learn Anchor', completed: false }),
]);

// Type aliases for convenience.
export type TodoRec = InferRow<typeof todoTable>;
export type TodoRecList = InferList<typeof todoTable>;

// Create a key-value store for todo stats.
export const todoStats = kv('todo-stats', {
  total: 2,
  pending: 1,
  completed: 1,
});
