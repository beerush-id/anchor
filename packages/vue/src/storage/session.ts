import type { LinkableSchema, ObjLike, StateOptions } from '@anchor/core';
import { onUnmounted } from 'vue';
import { session } from '@anchor/storage';
import { type ConstantRef, constantRef } from '@base/index.js';

/**
 * Creates a reactive reference to a session storage value with type safety.
 *
 * This function wraps the session storage functionality with Vue's reactivity system,
 * allowing you to create a reactive reference that automatically syncs with session storage.
 *
 * @template T - The type of the stored value, must extend ObjLike
 * @template S - The schema type for validation, defaults to LinkableSchema
 *
 * @param name - The key name for the session storage item
 * @param init - The initial value to use if no existing value is found in session storage
 * @param options - Optional configuration for anchor storage behavior and validation schema
 *
 * @returns A Vue Ref that provides reactive access to the session storage value
 */
export function sessionRef<T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
  name: string,
  init: T,
  options?: StateOptions<S>
): ConstantRef<T> {
  const state = session(name, init, options);

  onUnmounted(() => {
    session.leave(state);
  });

  return constantRef(state);
}
