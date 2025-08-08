import { anchor } from '@anchor/core';
import { useEffect } from 'react';

export const classicTodoStats = anchor({
  app: {
    name: 'Classic Todo App',
    value: 0,
  },
  form: {
    name: 'Classic Todo Form',
    value: 0,
  },
  list: {
    name: 'Classic Todo List',
    value: 0,
  },
  item: {
    name: 'Classic Todo Item',
    value: 0,
  },
});

export const todoStats = anchor({
  app: {
    name: 'Todo App',
    value: 0,
  },
  form: {
    name: 'Todo Form',
    value: 0,
  },
  list: {
    name: 'Todo List',
    value: 0,
  },
  item: {
    name: 'Todo Item',
    value: 0,
  },
});

export function useUpdateStat(fn: () => void, timeout = 50) {
  useEffect(() => {
    setTimeout(() => {
      fn();
    }, timeout);
  });
}
