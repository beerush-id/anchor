import { anchor, createObserver, type Immutable } from '@anchorlib/core';
import { onCleanup } from 'solid-js';
import { REF_REGISTRY } from './reactive.js';
import type { ConstantRef, StateRef } from './types.js';

/**
 * @deprecated use `effect()` instead.
 * Creates a reactive reference that automatically updates when its dependencies change.
 *
 * This function creates an observable reference that tracks dependencies and automatically
 * updates its value when any of the dependencies change. It uses the anchor library's
 * observer system to track reactivity and integrates with Solid's cleanup system.
 *
 * @template R - The type of value being observed
 * @param observe - A function that returns the value to be observed. This function
 *                  will be tracked for dependencies and re-run when they change.
 * @returns A ConstantRef object with a reactive value property that updates automatically
 */
export function observedRef<R>(observe: () => R): ConstantRef<Immutable<R>> {
  const observer = createObserver(() => {
    valueRef.value = observer.run(() => observe());
  });

  const valueRef = anchor(
    {
      value: observer.run(() => observe()),
    },
    { recursive: false }
  ) as StateRef<R>;
  const stateRef = {
    get value() {
      return valueRef.value;
    },
  };

  REF_REGISTRY.add(stateRef);

  onCleanup(() => {
    observer.destroy();
    anchor.destroy(valueRef);
    REF_REGISTRY.delete(stateRef);
  });

  return stateRef as ConstantRef<Immutable<R>>;
}
