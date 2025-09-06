import { type LinkableSchema, type StateOptions } from '@anchor/core';
import { useAnchor } from './anchor.js';

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
) {
  return useAnchor(init, { ...options, ordered: true, compare });
}
