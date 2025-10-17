import type { ConstantRef, StateRef, VariableRef } from './types.js';
import { anchor } from '@anchorlib/core';
import { onDestroy } from 'svelte';

export const REF_REGISTRY = new WeakMap<ConstantRef<unknown>, StateRef<unknown>>();

/**
 * Creates a readable reference that can be subscribed to for reactive updates.
 * This function initializes a reactive reference with a given initial value and provides
 * mechanisms for subscribing to changes and publishing updates to subscribers.
 *
 * @template T The type of the value being referenced
 * @param init - The initial value for the reference
 * @returns A readable reference object with subscribe and publish capabilities
 */
export function variableRef<T>(init: T): VariableRef<T>;

/**
 * Creates a constant (read-only) reference that can be subscribed to for reactive updates.
 * This function initializes a reactive reference with a given initial value that cannot be modified
 * after creation.
 *
 * @template T The type of the value being referenced
 * @param init - The initial value for the reference
 * @param constant - If true, the reference will be read-only and cannot be updated.
 * @returns A constant reference object with subscribe capability but no write access
 */
export function variableRef<T>(init: T, constant: true): ConstantRef<T>;

/**
 * Creates a readable reference that can be subscribed to for reactive updates.
 * This function initializes a reactive reference with a given initial value and provides
 * mechanisms for subscribing to changes and publishing updates to subscribers.
 *
 * @template T The type of the value being referenced
 * @param init - The initial value for the reference
 * @param constant - If true, the reference will be read-only and cannot be updated.
 * @returns A readable reference object with subscribe and publish capabilities
 */
export function variableRef<T>(init: T, constant?: boolean) {
  const valueRef = anchor({ value: init }, { recursive: true });

  const set = (value: T) => {
    // Ignore if the value is the same.
    if (constant === true || value === valueRef.value) return;

    valueRef.value = value;
  };

  onDestroy(() => {
    // Remove the ref from the registry.
    REF_REGISTRY.delete(stateRef as ConstantRef<unknown>);

    // Destroy the ref state.
    anchor.destroy(valueRef);
  });

  const stateRef = {
    get value() {
      return valueRef.value;
    },
    set value(value: T) {
      set(value);
    },
  } as never;

  REF_REGISTRY.set(stateRef as ConstantRef<unknown>, valueRef);

  return stateRef as ConstantRef<T>;
}

/**
 * Creates a constant (read-only) reference that can be subscribed to for reactive updates.
 * This function initializes a reactive reference with a given initial value that cannot be modified
 * after creation. It's useful for values that should remain constant throughout the component lifecycle
 * but still need to be reactively tracked.
 *
 * @template T The type of the value being referenced
 * @param init - The initial value for the constant reference
 * @returns A constant reference object with subscribe capability but no write access
 */
export function constantRef<T>(init: T): ConstantRef<T> {
  return variableRef(init, true);
}

/**
 * Checks if a given value is a writable reference.
 * This function uses the REF_REGISTRY to determine if the provided value
 * is a registered writable reference.
 *
 * @template T The type of the value that the reference holds
 * @param ref - The value to check
 * @returns True if the value is a writable reference, false otherwise
 */
export function isRef<T>(ref: unknown): ref is VariableRef<T> {
  return REF_REGISTRY.has(ref as VariableRef<unknown>);
}
