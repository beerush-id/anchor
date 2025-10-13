import type { StateUnsubscribe } from '@anchorlib/core';
import { type RefObject, useEffect, useRef } from 'react';
import { CLEANUP_DEBOUNCE_TIME, useMicrotask } from '@anchorlib/react';

export type ElementAction<E> = {
  value: E | null;
  destroy?: StateUnsubscribe;
};

export function useElementAction<E>(action: (value: E) => StateUnsubscribe): RefObject<E | null> {
  const ref = useRef<ElementAction<E>>({ value: null }).current;
  const [cleanup, cancelCleanup] = useMicrotask(CLEANUP_DEBOUNCE_TIME);

  useEffect(() => {
    cancelCleanup();

    return () => {
      cleanup(() => {
        ref.destroy?.();
      });
    };
  }, []);

  return {
    get current() {
      return ref.value as E;
    },
    set current(value: E) {
      if (ref.value === value) return;

      ref.destroy?.();
      ref.value = value;

      if (value instanceof HTMLElement) {
        ref.destroy = action(ref.value);
      }
    },
  };
}
