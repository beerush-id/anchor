import { createObserver } from '@anchorlib/core';
import type { Action, ActionRef, ActionRefObj } from './types.js';

export function actionRef<T>(action: Action<T>, init?: T): ActionRefObj<T> {
  let current: T | null = init ?? null;

  const observer = createObserver(() => {
    instance?.update?.(current as T);
  });
  const instance: ActionRef<T> | null = observer.run(() => action(current as T));

  return {
    get current() {
      return current;
    },
    set current(value) {
      if (value === current) return;

      current = value;
      instance?.update?.(current as T);
    },
    destroy() {
      current = null;
      instance?.destroy?.();
      observer.destroy();
    },
  };
}
