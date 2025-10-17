import {
  anchor,
  type ImmutableOutput,
  type LinkableSchema,
  type ModelInput,
  type ModelOutput,
  type ObjLike,
  type StateBaseOptions,
  type StateExceptionMap,
} from '@anchorlib/core';

/**
 * Creates a model reference with mutable state.
 *
 * @template S - The linkable schema type
 * @template T - The model input type that extends the schema
 * @param schema - The schema to use for the model
 * @param init - The initial value for the model
 * @param options - Optional state configuration
 * @returns A variable reference containing the model output
 */
export function modelRef<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: StateBaseOptions
): ModelOutput<S>;

/**
 * Creates a model reference with immutable state.
 *
 * @template S - The linkable schema type
 * @template T - The model input type that extends the schema
 * @param schema - The schema to use for the model
 * @param init - The initial value for the model
 * @param options - State configuration with immutable flag set to true
 * @returns A variable reference containing the immutable output
 */
export function modelRef<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options: StateBaseOptions & { immutable: true }
): ImmutableOutput<S>;

export function modelRef<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: StateBaseOptions
) {
  return anchor(init, schema, options);
}

/**
 * Creates a constant reference that maps exceptions for a given state object or array.
 *
 * @template T - The type of the input state, must be an object-like or array type
 * @param state - The input state object or array to create exception mappings for
 * @returns A ConstantRef containing the StateExceptionMap for the provided state
 */
export function exceptionRef<T extends ObjLike | Array<unknown>>(state: T): StateExceptionMap<T> {
  return anchor.catch(state);
}
