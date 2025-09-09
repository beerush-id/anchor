import { derive } from '@anchor/core';
import type { Readable } from 'svelte/store';
import type { StateRef, VariableRef } from './types.js';
import { isRef, REF_REGISTRY } from './ref.js';

/**
 * Creates a derived store from a state or a writable reference.
 *
 * @template T - The type of the input state
 * @template R - The type of the transformed output
 * @param state - The input state or writable reference
 * @returns A readable store containing the state value
 */
export function derivedRef<T>(state: T | VariableRef<T>): Readable<T>;

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
 * @param transform - An optional function that transforms the current state value
 * @returns A readable store containing the state value or transformed value
 */
export function derivedRef<T, R>(state: T | VariableRef<T>, transform?: (current: T) => R): Readable<T | R> {
  let target = state;

  if (isRef(state)) {
    target = REF_REGISTRY.get(state as VariableRef<unknown>) as T;
  }

  const subscribe = (handler: (output: T | R) => void) => {
    return derive(target, (current) => {
      if (isRef(state)) {
        current = (current as StateRef<T>).value;
      }

      const value = typeof transform === 'function' ? transform(current as T) : current;
      handler(value as T);
    });
  };

  return { subscribe } as Readable<T | R>;
}
