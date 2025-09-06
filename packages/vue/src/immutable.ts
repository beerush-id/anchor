import { anchor, type Immutable, type Linkable, type LinkableSchema, type StateOptions } from '@anchor/core';
import type { Ref } from 'vue';
import { derivedRef } from './derive.js';

/**
 * Creates an immutable reactive state from the provided initial value using Anchor's immutable functionality.
 * This hook integrates with Vue's reactivity system to provide a type-safe immutable state management solution.
 *
 * @template T - The type of the initial value which must extend Linkable
 * @template S - The schema type for the anchor options, defaults to LinkableSchema
 * @param init - The initial value to create an immutable state from
 * @param options - Optional anchor options to configure the immutable state behavior
 * @returns A Vue Ref containing the immutable state of type Immutable<T>
 */
export function immutableRef<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
): Ref<Immutable<T>> {
  const state = anchor.immutable(init, options);
  return derivedRef(state) as Ref<Immutable<T>>;
}

/**
 * Creates a writable version of a readonly state.
 * This is a Vue wrapper around anchor.writable that returns a Ref.
 *
 * @template T - The type of the readonly state
 * @param state - The readonly state to make writable
 * @returns A Vue Ref containing the writable state
 */
export function writableRef<T extends Linkable>(state: T): Ref<T> {
  const writableState = anchor.writable(state);
  return derivedRef(writableState) as Ref<T>;
}
