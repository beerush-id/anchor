import { customRef, onUnmounted } from 'vue';
import type { ConstantRef } from './types.js';
import { createObserver, type StateObserver } from '@anchorlib/core';

/**
 * Creates a custom Vue ref that automatically tracks dependencies and triggers reactivity
 * when the observed value changes. This ref is read-only and will automatically clean up
 * its observer when the component is unmounted.
 *
 * @template R - The type of value being observed
 * @param observe - A function that returns the value to be observed
 * @returns A readonly ref that automatically updates when dependencies change
 */
export function observedRef<R>(observe: () => R): ConstantRef<R> {
  let observer: StateObserver | undefined = undefined;

  onUnmounted(() => {
    observer?.destroy();
  });

  return customRef((track, trigger) => {
    observer = createObserver(trigger);

    return {
      get() {
        track();
        return observer?.run(observe);
      },
      set() {
        // No-op.
      },
    };
  }) as ConstantRef<R>;
}
