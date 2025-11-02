import type { LinkableSchema, ObjLike, StateOptions } from '@anchorlib/core';
import type { ConstantState } from '../index.js';
import { useConstant } from '../index.js';
import { session } from '@anchorlib/storage';

/**
 * A React hook that provides session storage functionality with state management.
 *
 * This hook creates a session storage entry with the given name and initial value,
 * and returns a tuple containing the current value, the state object, and a setter function.
 *
 * @template T - The type of the initial value object
 * @template S - The schema type for linkable data structures
 *
 * @param name - The unique identifier for the session storage entry
 * @param init - The initial value to store in session storage
 * @param options - Optional configuration for state management
 * @return {ConstantState<T>} - A constant state object containing the stored value and its associated reference
 */
export function useSession<T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
  name: string,
  init: T,
  options?: StateOptions<S>
): ConstantState<T> {
  const [state] = useConstant(() => {
    return session(name, init, options);
  }, [name, init, options]);
  return [state.value, state];
}
