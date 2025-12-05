import { anchor, type Immutable, subscribe } from '@anchorlib/core';
import { onCleanup } from 'solid-js';
import { REF_REGISTRY } from './reactive.js';
import type { ConstantRef, StateRef } from './types.js';

/**
 * @deprecated Use `derived()` instead.
 * Creates a derived reference that transforms the value of a source state.
 *
 * This function takes a source state and a transformation function, and returns
 * a new constant reference whose value is automatically updated whenever the
 * source state changes. The transformation function is called with the current
 * value of the source state, and its return value becomes the new value of the
 * derived reference.
 *
 * The derived reference is automatically cleaned up when the containing SolidJS
 * component is unmounted.
 *
 * @template T - The type of the source state
 * @template R - The type of the derived value
 * @param state - The source state to derive from
 * @param transform - A function that transforms the source state value into the derived value
 * @returns A constant reference containing the transformed value
 */
export function derivedRef<T, R>(state: T, transform: (current: T) => R): ConstantRef<Immutable<R>> {
  const valueRef = anchor({}, { recursive: false }) as StateRef<R>;
  const stateRef = {
    get value() {
      return valueRef.value;
    },
  };

  const unsubscribe = subscribe(state, (current) => {
    valueRef.value = transform(current);
  });

  REF_REGISTRY.add(stateRef);

  onCleanup(() => {
    anchor.destroy(valueRef);
    unsubscribe();
    REF_REGISTRY.delete(stateRef);
  });

  return stateRef as ConstantRef<Immutable<R>>;
}
