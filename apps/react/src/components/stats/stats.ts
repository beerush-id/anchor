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
    name: 'Anchor Todo App',
    value: 0,
  },
  form: {
    name: 'Anchor Todo Form',
    value: 0,
  },
  list: {
    name: 'Anchor Todo List',
    value: 0,
  },
  item: {
    name: 'Anchor Todo Item',
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

export function flashNode(element: HTMLElement | null = null) {
  if (!element) return;

  element.style.boxShadow = '0 0 0 1px red';

  setTimeout(() => {
    element.style.boxShadow = '';
  }, 300);
}
