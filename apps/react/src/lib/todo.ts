import { createContext } from 'react';

export type ITodoItem = {
  id: number;
  text: string;
  completed: boolean;
};

export type ITodoList = ITodoItem[];

export const TodoContext = createContext<ITodoList>([]);
