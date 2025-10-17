import type { LinkableSchema, ObjLike, StateOptions } from '@anchorlib/core';
import { session } from '@anchorlib/storage';
import { onDestroy } from 'svelte';

/**
 * Creates a session-scoped reactive state using the provided name, initial value, and options.
 * The sessionRef is tied to the browser's session storage, meaning its value will persist
 * across page reloads but not after the session ends (e.g., tab/window closed).
 *
 * @template T - The type of the initial value, must extend object-like structure.
 * @template S - The schema type for linkable validation, defaults to LinkableSchema.
 * @param name - A unique string identifier for the session storage key.
 * @param init - The initial value to be stored in session storage.
 * @param options - Optional configuration for state behavior and validation schema.
 * @returns A reactive state that provides reactive access and modification capabilities.
 */
export function sessionRef<T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
  name: string,
  init: T,
  options?: StateOptions<S>
): T {
  const state = session(name, init, options);

  onDestroy(() => {
    session.leave(state);
  });

  return state;
}
