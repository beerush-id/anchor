import type { LinkableSchema, ObjLike, StateOptions } from '@anchorlib/core';
import { persistent } from '@anchorlib/storage';
import { onCleanup } from 'solid-js';

/**
 * Creates a persistent state reference that automatically cleans up when the component unmounts.
 *
 * This function wraps the core `persistent` storage mechanism with Solid.js lifecycle management,
 * ensuring that persistent state is properly cleaned up when the component using it is destroyed.
 *
 * @template T - The type of the state object, must extend ObjLike
 * @template S - The schema type for the state, defaults to LinkableSchema
 * @param name - A unique identifier for the persistent state
 * @param init - The initial value for the state
 * @param options - Optional configuration for state behavior and schema validation
 * @returns A reactive state object that persists across sessions
 */
export function persistentRef<T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
  name: string,
  init: T,
  options?: StateOptions<S>
): T {
  const state = persistent(name, init, options);

  onCleanup(() => {
    persistent.leave(state);
  });

  return state;
}
