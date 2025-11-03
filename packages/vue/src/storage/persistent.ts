import type { LinkableSchema, ObjLike, StateOptions } from '@anchorlib/core';
import { onUnmounted } from 'vue';
import { persistent } from '@anchorlib/storage';
import { type ConstantRef, constantRef } from '../index.js';

/**
 * Creates a reactive reference to a localStorage value with type safety.
 *
 * This function wraps the persistent storage functionality with Vue's reactivity system,
 * allowing you to create a reactive reference that automatically syncs with localStorage.
 *
 * @template T - The type of the object to store
 * @template S - The schema type for linkable data
 *
 * @param name - The name/key to identify the stored data
 * @param init - The initial value for the stored data
 * @param options - Optional anchor configuration options
 *
 * @returns A Vue ref that persists its value across sessions
 */
export function persistentRef<T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
  name: string,
  init: T,
  options?: StateOptions<S>
): ConstantRef<T> {
  const state = persistent(name, init, options);

  onUnmounted(() => {
    persistent.leave(state);
  });

  return constantRef(state);
}
