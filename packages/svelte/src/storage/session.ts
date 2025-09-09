import type { LinkableSchema, ObjLike, StateOptions } from '@anchor/core';
import type { ConstantRef } from '@base/index.js';
import { variableRef } from '@base/index.js';
import { session } from '@anchor/storage';

/**
 * Creates a session-scoped reactive reference using the provided name, initial value, and options.
 * The sessionRef is tied to the browser's session storage, meaning its value will persist
 * across page reloads but not after the session ends (e.g., tab/window closed).
 *
 * @template T - The type of the initial value, must extend object-like structure.
 * @template S - The schema type for linkable validation, defaults to LinkableSchema.
 * @param name - A unique string identifier for the session storage key.
 * @param init - The initial value to be stored in session storage.
 * @param options - Optional configuration for state behavior and validation schema.
 * @returns A WritableRef<T> that provides reactive access and modification capabilities.
 */
export function sessionRef<T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
  name: string,
  init: T,
  options?: StateOptions<S>
): ConstantRef<T> {
  const state = session(name, init, options);
  return variableRef<T>(state);
}
