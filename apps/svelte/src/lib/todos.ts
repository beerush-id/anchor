import { createTableRef, type InferListRef, type InferRef } from '@anchor/svelte/storage';
import type { InferList, InferRow } from '@anchor/storage/db';
import { createRecord, createTable } from '@anchor/storage/db';

export type Todo = {
	text: string;
	completed: boolean;
};

export const todoTable = createTable<Todo>('todos');

todoTable.seed([
	createRecord({ text: 'Learn Svelte', completed: true }),
	createRecord({ text: 'Learn Anchor', completed: false })
]);

export const todoTableRef = createTableRef(todoTable);

export type TodoRec = InferRow<typeof todoTable>;
export type TodoRef = InferRef<typeof todoTable>;
export type TodoRecList = InferList<typeof todoTable>;
export type TodoRefList = InferListRef<typeof todoTableRef>;
