import { anchor, subscribe } from '@anchorlib/core';
import type { ConstantRef, StateRef } from './types.js';
import { onDestroy } from 'svelte';
import { REF_REGISTRY } from './ref.js';

/**
 * @deprecated Use `derived()` instead.
 * Creates a derived state from a source state with an optional transformation.
 *
 * @template T - The type of the input state
 * @template R - The type of the transformed output
 * @param state - The source state
 * @param derive - A function that transforms the current state value
 * @returns A read-only reference containing the derived state value
 */
export function derivedRef<T, R>(state: T, derive: (current: T) => R): ConstantRef<R> {
  const valueRef = anchor({}, { recursive: false }) as StateRef<R>;
  const stateRef = {
    get value() {
      return valueRef.value;
    },
  };
  REF_REGISTRY.set(stateRef, valueRef);

  const unsubscribe = subscribe(state, (current) => {
    valueRef.value = derive(current);
  });

  onDestroy(() => {
    anchor.destroy(valueRef);
    unsubscribe();
    REF_REGISTRY.delete(stateRef);
  });

  return stateRef as ConstantRef<R>;
}