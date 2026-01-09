import { createRecord, createTable } from '@anchorlib/solid/storage';

export type Todo = {
  text: string;
  completed: boolean;
};

export const todoTable = createTable<Todo>('todos');

todoTable.seed([
  createRecord({ text: 'Learn Solid', completed: true }),
  createRecord({ text: 'Learn Anchor', completed: false }),
]);

export type TodoRec = InferRow<typeof todoTable>;
export type TodoRecList = InferList<typeof todoTable>;

type InferRow<T> = T extends { get(id: string): { data: infer R } } ? R : never;
type InferList<T> = T extends { list(): { data: infer R } } ? R : never;
