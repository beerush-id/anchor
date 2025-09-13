import { anchor, type LinkableSchema, type StateOptions } from '@anchorlib/core';
import { useVariable } from './ref.js';
import type { AnchorState } from './types.js';

/**
 * Creates a reactive ordered list state using Anchor's state management.
 *
 * This hook provides a way to manage an array state where the order of elements
 * is maintained according to a custom comparison function. The list will automatically
 * sort itself when elements are added, removed, or modified.
 *
 * @template T - The type of the array elements
 * @template S - The schema type for linkable state (defaults to LinkableSchema)
 *
 * @param init - The initial array state
 * @param compare - A comparison function that defines the sort order
 *   - Should return a negative value if the first argument is less than the second
 *   - Should return zero if the arguments are equal
 *   - Should return a positive value if the first argument is greater than the second
 * @param options - Optional state configuration options
 *
 * @returns A reactive state object with methods to interact with the ordered list
 */
export function useOrderedList<T extends unknown[], S extends LinkableSchema = LinkableSchema>(
  init: T,
  compare: (a: T[number], b: T[number]) => number,
  options?: StateOptions<S>
): AnchorState<T> {
  const [state, setState] = useVariable(() => {
    return anchor.ordered(init, compare, options);
  }, [init, options]);
  return [state.value, state, setState];
}

/**
 * Creates a reactive flat list state using Anchor's state management.
 *
 * This hook provides a way to manage an array state that only reacts to array mutations while maintain the
 * reactivity recursively.
 *
 * @template T - The type of the array elements
 * @template S - The schema type for linkable state (defaults to LinkableSchema)
 *
 * @param init - The initial array state
 * @param options - Optional state configuration options
 *
 * @returns A reactive state object with methods to interact with the flat list
 */
export function useFlatList<T extends unknown[], S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
): AnchorState<T> {
  const [state, setState] = useVariable(() => {
    return anchor.flat(init, options);
  }, [init, options]);
  return [state.value, state, setState];
}
