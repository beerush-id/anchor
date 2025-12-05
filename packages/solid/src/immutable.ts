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
  type State,
  type StateBaseOptions,
  type StateOptions,
} from '@anchorlib/core';

/**
 * @deprecated Use 'immutable()' instead.
 * Creates an immutable state from a linkable object.
 *
 * @param init - The initial linkable value
 * @param options - Optional state options for the linkable schema
 * @returns An immutable state of the input type
 */
export function immutableRef<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
): Immutable<T>;

/**
 * @deprecated Use 'immutable()' instead.
 * Creates an immutable state from a model input with explicit schema.
 *
 * @param init - The initial model input value
 * @param schema - The schema defining the structure of the model
 * @param options - Optional base state options
 * @returns The immutable output type based on the model input
 */
export function immutableRef<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema: S,
  options?: StateBaseOptions
): ImmutableOutput<T>;

/**
 * @deprecated Use 'immutable()' instead.
 * Creates an immutable state from a model input with schema options.
 *
 * @param init - The initial model input value
 * @param schemaOptions - The schema defining the structure or options for the model
 * @param options - Optional base state options
 * @returns The immutable output type based on the model input
 */
export function immutableRef<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schemaOptions: S,
  options?: StateBaseOptions
): ImmutableOutput<T> {
  return anchor.immutable(init, schemaOptions, options) as ImmutableOutput<T>;
}

/**
 * @deprecated Use 'writable()' instead.
 * Creates a mutable reference to a reactive state.
 *
 * @param state - The reactive state to make mutable
 * @returns A mutable version of the input state
 */
export function writableRef<T extends State>(state: T): Mutable<T>;

/**
 * @deprecated Use 'writable()' instead.
 * Creates a mutable reference to a reactive state with specific mutation contracts.
 *
 * @param state - The reactive state to make mutable
 * @param contracts - Array of mutation keys that define which mutations are allowed
 * @returns A mutable part of the input state with only the specified mutations allowed
 */
export function writableRef<T extends State, K extends MutationKey<T>[]>(state: T, contracts: K): MutablePart<T, K>;

/**
 * @deprecated Use 'writable()' instead.
 * Creates a mutable reference to a reactive state, optionally with specific mutation contracts.
 *
 * @param state - The reactive state to make mutable
 * @param contracts - Optional array of mutation keys that define which mutations are allowed
 * @returns A mutable version of the input state, or a mutable part with restricted mutations if contracts are provided
 */
export function writableRef<T extends State, K extends MutationKey<T>[]>(
  state: T,
  contracts?: K
): Mutable<T> | MutablePart<T, K> {
  return anchor.writable(state, contracts) as Mutable<T> | MutablePart<T, K>;
}
