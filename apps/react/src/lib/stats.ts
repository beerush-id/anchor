import { anchor } from '@anchor/core';
import { useEffect } from 'react';

export const classicTodoStats = anchor(
  {
    app: {
      name: 'App',
      value: 0,
    },
    form: {
      name: 'Form',
      value: 0,
    },
    list: {
      name: 'List',
      value: 0,
    },
    item: {
      name: 'Item',
      value: 0,
    },
  },
  { observable: false }
);

export const manualTodoStats = anchor(
  {
    app: {
      name: 'App',
      value: 0,
    },
    form: {
      name: 'Form',
      value: 0,
    },
    list: {
      name: 'List',
      value: 0,
    },
    item: {
      name: 'Item',
      value: 0,
    },
  },
  { observable: false }
);

export const todoStats = anchor(
  {
    app: {
      name: 'App',
      value: 0,
    },
    form: {
      name: 'Form',
      value: 0,
    },
    list: {
      name: 'List',
      value: 0,
    },
    item: {
      name: 'Item',
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
