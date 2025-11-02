import type { LinkableSchema, ObjLike, StateOptions } from '@anchorlib/core';
import type { ConstantState } from '../index.js';
import { useConstant } from '../index.js';
import { persistent } from '@anchorlib/storage';

/**
 * A React hook that creates a persistent state variable using the Anchor storage system.
 * This hook provides a way to store and retrieve state that persists across application sessions.
 *
 * @template T - The type of the initial value object
 * @template S - The schema type for the persistent state, defaults to LinkableSchema
 *
 * @param name - A unique identifier for the persistent state variable
 * @param init - The initial value for the persistent state
 * @param options - Optional configuration for the state management
 * @returns {ConstantState<T>} A constant state object containing the current value.
 */
export function usePersistent<T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
  name: string,
  init: T,
  options?: StateOptions<S>
): ConstantState<T> {
  const [state] = useConstant(() => {
    return persistent(name, init, options);
  }, [name, init, options]);
  return [state.value, state];
}
