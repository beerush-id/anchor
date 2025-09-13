import { anchor } from '@anchorlib/core';

export type ITodoItem = {
  id: string;
  text: string;
  completed: boolean;
};

export type ITodoList = ITodoItem[];

export type ITodoStats = {
  total: number;
  active: number;
  completed: number;
};

export const BENCHMARK_SIZE = 1000;
export const BENCHMARK_TOGGLE_SIZE = 25;
export const BENCHMARK_DEBOUNCE_TIME = 0;

export const todoApp = anchor.immutable({
  todos: [
    { id: '1', text: 'Learn React state', completed: true },
    { id: '2', text: 'Learn Anchor states', completed: false },
    { id: '3', text: 'Master Anchor state', completed: false },
  ],
  stats: {
    total: 3,
    active: 2,
    completed: 1,
  },
});

export const itemsWriter = anchor.writable(todoApp.todos, ['push', 'splice']);
export const statsWriter = anchor.writable(todoApp.stats);
