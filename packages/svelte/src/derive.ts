import { anchor, subscribe } from '@anchorlib/core';
import type { ConstantRef, StateRef } from './types.js';
import { onDestroy } from 'svelte';
import { REF_REGISTRY } from './ref.js';

/**
 * Creates a derived store from a state or a writable reference with optional transformation.
 *
 * @template T - The type of the input state
 * @template R - The type of the transformed output
 * @param state - The input state or writable reference
 * @param derive - An function that transforms the current state value
 * @returns A readable store containing the state value or transformed value
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
