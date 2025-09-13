import type { LinkableSchema, ObjLike, StateOptions } from '@anchorlib/core';
import type { ConstantRef } from '@base/index.js';
import { constantRef } from '@base/index.js';
import { persistent } from '@anchorlib/storage';

/**
 * Creates a persistent reactive reference using the provided name, initial value, and options.
 * The persistentRef is tied to the browser's local storage, meaning its value will persist
 * across page reloads and browser sessions until explicitly cleared.
 *
 * @template T - The type of the initial value, must extend object-like structure.
 * @template S - The schema type for linkable validation, defaults to LinkableSchema.
 * @param name - A unique string identifier for the local storage key.
 * @param init - The initial value to be stored in local storage.
 * @param options - Optional configuration for state behavior and validation schema.
 * @returns A WritableRef<T> that provides reactive access and modification capabilities.
 */
export function persistentRef<T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
  name: string,
  init: T,
  options?: StateOptions<S>
): ConstantRef<T> {
  const state = persistent(name, init, options);
  return constantRef<T>(state);
}
