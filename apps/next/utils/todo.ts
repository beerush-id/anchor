import { anchor } from '@anchorlib/core';
import type { TimeMetric } from './benchmark.js';

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

export type TodoRenderStats = {
  duration: number;
  lowest: number;
  average: number;
  highest: number;
};

export const classicReport = anchor({
  stats: { duration: 0, lowest: 0, highest: 0, average: 0 } as TodoRenderStats,
  enabled: false,
  metrics: [] as TimeMetric[],
});
export const anchorReport = anchor({
  stats: { duration: 0, lowest: 0, highest: 0, average: 0 } as TodoRenderStats,
  enabled: false,
  metrics: [] as TimeMetric[],
});

export const BENCHMARK_SIZE = 1000;
export const BENCHMARK_TOGGLE_SIZE = 25;
export const BENCHMARK_DEBOUNCE_TIME = 5;

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
