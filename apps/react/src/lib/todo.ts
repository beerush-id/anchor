import { createContext } from 'react';

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

export const TodoContext = createContext<ITodoList>([]);

export const BENCHMARK_SIZE = 1000;
export const BENCHMARK_TOGGLE_SIZE = 25;
