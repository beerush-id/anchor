import type { LinkableSchema, ObjLike, StateOptions } from '@anchor/core';
import { onUnmounted, type Ref } from 'vue';
import { persistent } from '@anchor/storage';
import { derivedRef } from '../derive.js';

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
): Ref<T> {
  const state = persistent(name, init, options);

  onUnmounted(() => {
    persistent.leave(state);
  });

  return derivedRef(state);
}
