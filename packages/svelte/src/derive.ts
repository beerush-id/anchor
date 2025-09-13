import { derive } from '@anchorlib/core';
import type { Readable } from 'svelte/store';
import type { StateRef, VariableRef } from './types.js';
import { isRef, REF_REGISTRY } from './ref.js';

/**
 * Creates a derived store from a state or a writable reference.
 *
 * @template T - The type of the input state
 * @template R - The type of the transformed output
 * @param state - The input state or writable reference
 * @param recursive - A boolean indicating whether to recursively derive the state
 * @returns A readable store containing the state value
 */
export function derivedRef<T>(state: T | VariableRef<T>, recursive?: boolean): Readable<T>;

/**
 * Creates a derived store from a state or a writable reference with transformation.
 *
 * @template T - The type of the input state
 * @template R - The type of the transformed output
 * @param state - The input state or writable reference
 * @param transform - A function that transforms the current state value
 * @returns A readable store containing the transformed value
 */
export function derivedRef<T, R>(state: T | VariableRef<T>, transform: (current: T) => R): Readable<R>;

/**
 * Creates a derived store from a state or a writable reference with optional transformation.
 *
 * @template T - The type of the input state
 * @template R - The type of the transformed output
 * @param state - The input state or writable reference
 * @param transformRecursive - An optional function that transforms the current state value
 * @returns A readable store containing the state value or transformed value
 */
export function derivedRef<T, R>(
  state: T | VariableRef<T>,
  transformRecursive?: ((current: T) => R) | boolean
): Readable<T | R> {
  let target = state;

  if (isRef(state)) {
    target = REF_REGISTRY.get(state as VariableRef<unknown>) as T;
  }

  const subscribe = (handler: (output: T | R) => void) => {
    return derive(
      target,
      (current) => {
        if (isRef(state)) {
          current = (state as StateRef<T>).value;
        } else {
          current = state;
        }

        const value = typeof transformRecursive === 'function' ? transformRecursive(current as T) : current;
        handler(value as T);
      },
      typeof transformRecursive === 'boolean' ? transformRecursive : undefined
    );
  };

  return { subscribe, set: () => {} } as Readable<T | R>;
}
