import {
  anchor,
  type Immutable,
  type ImmutableOutput,
  type Linkable,
  type LinkableSchema,
  type ModelInput,
  type Mutable,
  type MutablePart,
  type MutationKey,
  type StateBaseOptions,
  type StateOptions,
} from '@anchorlib/core';
import type { AnchorState } from './types.js';
import { useStableRef } from './hooks.js';
import { useVariable } from './ref.js';

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
): AnchorState<Immutable<T>>;

/**
 * A React hook that creates an immutable state from a model input with a schema.
 *
 * This hook creates an immutable state by applying a schema to the provided model input,
 * ensuring type safety and immutability of the resulting state.
 *
 * @template S - The schema type
 * @template T - The type of the model input
 * @param init - The initial model input to make immutable
 * @param schema - The schema to apply to the model input
 * @param options - Optional base state configuration options
 * @returns An anchor state containing the immutable version of the input object
 */
export function useImmutable<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema?: S,
  options?: StateBaseOptions
): AnchorState<ImmutableOutput<T>>;

/**
 * A React hook that creates an immutable state from a linkable object or model input.
 *
 * This hook provides a flexible way to create immutable states, handling both direct
 * linkable objects and model inputs with optional schemas.
 *
 * @template T - The type of the linkable object
 * @template S - The schema type for the anchor options
 * @param init - The initial object to make immutable
 * @param schemaOptions - Either a schema or state options
 * @param options - Optional base state configuration options
 * @returns An anchor state containing the immutable version of the input object
 */
export function useImmutable<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  schemaOptions?: S | StateOptions<S>,
  options?: StateBaseOptions
): AnchorState<Immutable<T> | ImmutableOutput<T>> {
  const [state, setState] = useVariable<ModelInput<T>>(
    (replace) => {
      return anchor.immutable(replace ?? (init as ModelInput<S>), schemaOptions as S, options) as ModelInput<T>;
    },
    [init, options]
  );
  return [state.value, state, setState] as AnchorState<Immutable<T> | ImmutableOutput<T>>;
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
