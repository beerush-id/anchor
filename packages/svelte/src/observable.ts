import { anchor, createObserver } from '@anchorlib/core';
import type { ConstantRef, StateRef } from './types.js';
import { onDestroy } from 'svelte';
import { REF_REGISTRY } from './ref.js';

/**
 * Creates a Svelte readable store that observes a reactive function and updates its subscribers
 * when the observed value changes. The function automatically handles observer lifecycle
 * and cleanup using Svelte's onDestroy hook.
 *
 * @template R - The type of the observed value
 * @param observe - A function that returns the value to be observed
 * @returns A Svelte readable store containing the observed value
 */
export function observedRef<R>(observe: () => R): ConstantRef<R> {
  const observer = createObserver(() => {
    update();
  });

  const valueRef = anchor({ value: observer.run(observe) }, { recursive: false }) as StateRef<R>;
  const stateRef = {
    get value() {
      return valueRef.value;
    },
  } as ConstantRef<R>;

  REF_REGISTRY.set(stateRef, valueRef);

  const update = () => {
    valueRef.value = observer.run(observe);
  };

  onDestroy(() => {
    observer.destroy();
    REF_REGISTRY.delete(stateRef);
  });

  return stateRef;
}
