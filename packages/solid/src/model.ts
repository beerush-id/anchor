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
 * Creates a reactive model reference based on a schema and initial data.
 *
 * @param schema - The schema defining the structure and validation rules for the model
 * @param init - The initial data for the model
 * @param options - Configuration options for the model state
 * @returns A reactive model output that conforms to the provided schema
 */
export function modelRef<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: StateBaseOptions
): ModelOutput<S>;

/**
 * Creates an immutable reactive model reference based on a schema and initial data.
 *
 * @param schema - The schema defining the structure and validation rules for the model
 * @param init - The initial data for the model
 * @param options - Configuration options with immutable flag set to true
 * @returns An immutable model output that conforms to the provided schema
 */
export function modelRef<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options: StateBaseOptions & { immutable: true }
): ImmutableOutput<S>;

/**
 * Creates a reactive model reference based on a schema and initial data.
 *
 * @param schema - The schema defining the structure and validation rules for the model
 * @param init - The initial data for the model
 * @param options - Configuration options for the model state
 * @returns A reactive model output that conforms to the provided schema
 */
export function modelRef<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: StateBaseOptions
) {
  return anchor.model(schema, init, options);
}

/**
 * Creates an exception map for handling errors associated with a state object.
 *
 * @param state - The state object to create exception handlers for
 * @returns A map of exception handlers for the provided state
 */
export function exceptionRef<T extends ObjLike | Array<unknown>>(state: T): StateExceptionMap<T> {
  return anchor.catch(state);
}
