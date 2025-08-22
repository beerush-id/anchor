import { anchor } from '@anchor/core';
import { useEffect } from 'react';

export const classicTodoStats = anchor(
  {
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
  },
  { observable: false }
);

export const todoStats = anchor(
  {
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
  },
  { observable: false }
);

export function useUpdateStat(fn: () => void, timeout = 50) {
  useEffect(() => {
    setTimeout(() => {
      fn();
    }, timeout);
  });
}

export function flashNode(element: HTMLElement | null = null) {
  if (!element) return;

  element.style.boxShadow = '0 0 0 3px rgba(255, 50, 50, 0.75)';
  // element.style.filter = 'drop-shadow(0 0 3px rgba(255, 50, 50, 0.75)';

  setTimeout(() => {
    element.style.boxShadow = '';
    // element.style.filter = '';
  }, 300);
}
