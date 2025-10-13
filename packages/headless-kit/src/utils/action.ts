import type { Action } from './types.js';
import { createObserver, type StateUnsubscribe } from '@anchorlib/core';

export function createAction(factory: Action): StateUnsubscribe {
  const observer = createObserver(() => {
    if (!instance) return;
    observer.run(() => instance?.update?.());
  });
  const instance = observer.run(() => factory?.());

  return () => {
    observer.destroy();
    instance?.destroy?.();
  };
}

export function actionRef<T>(factory: Action) {
  let current: T | null = null;

  return {
    get current() {
      return current;
    },
    set current(value) {
      if (value === current) return;

      current = value;
      createAction(factory);
    },
    destroy() {
      current = null;
    },
  };
}
