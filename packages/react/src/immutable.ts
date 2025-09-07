import {
  anchor,
  type Immutable,
  type Linkable,
  type LinkableSchema,
  type Mutable,
  type MutablePart,
  type MutationKey,
  type StateOptions,
} from '@anchor/core';
import type { AnchorState } from './types.js';
import { useAnchor } from './anchor.js';
import { useStableRef } from './hooks.js';

/**
 * A React hook that creates an immutable state from a linkable object.
 *
 * This hook wraps the provided linkable object in an immutable container,
 * ensuring that the state cannot be directly mutated and must be updated
 * through proper state update mechanisms.
 *
 * @template T - The type of the linkable object
 * @template S - The schema type for the anchor options
 * @param init - The initial linkable object to make immutable
 * @param options - Optional anchor configuration options
 * @returns An anchor state containing the immutable version of the input object
 */
export function useImmutable<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
): AnchorState<Immutable<T>> {
  return useAnchor<Immutable<T>>(init as Immutable<T>, { ...options, immutable: true });
}

/**
 * A React hook that creates a mutable version of an immutable state.
 *
 * This hook provides a way to work with immutable state in a mutable manner,
 * allowing controlled mutations through the returned mutable reference.
 *
 * @template T - The type of the linkable object
 * @param state - The immutable state to make mutable
 * @returns A mutable version of the input state
 */
export function useWriter<T extends Linkable>(state: T): Mutable<T>;

/**
 * A React hook that creates a mutable version of an immutable state with specific mutation contracts.
 *
 * This hook provides a way to work with immutable state in a mutable manner,
 * allowing controlled mutations through the returned mutable reference based on the provided contracts.
 *
 * @template T - The type of the linkable object
 * @template K - The mutation key contract array type
 * @param state - The immutable state to make mutable
 * @param contracts - Mutation key contracts that define allowed mutations
 * @returns A mutable version of the input state with only the specified mutations allowed
 */
export function useWriter<T extends Linkable, K extends MutationKey<T>[]>(state: T, contracts: K): MutablePart<T, K>;

/**
 * A React hook that creates a mutable version of an immutable state.
 *
 * This hook provides a way to work with immutable state in a mutable manner,
 * allowing controlled mutations through the returned mutable reference.
 *
 * @template T - The type of the linkable object
 * @template K - The mutation key contract array type
 * @param state - The immutable state to make mutable
 * @param contracts - Optional mutation key contracts that define allowed mutations
 * @returns A mutable version of the input state
 */
export function useWriter<T extends Linkable, K extends MutationKey<T>[]>(state: T, contracts?: K): MutablePart<T, K> {
  return useStableRef(() => anchor.writable(state, contracts), [state, ...(contracts ?? [])]).value;
}
