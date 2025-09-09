import {
  anchor,
  type ImmutableOutput,
  type LinkableSchema,
  type ModelInput,
  type ModelOutput,
  type StateBaseOptions,
} from '@anchor/core';
import type { VariableRef } from './types.js';
import { constantRef } from './ref.js';

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
): VariableRef<ModelOutput<S>>;

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
): VariableRef<ImmutableOutput<S>>;

export function modelRef<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: StateBaseOptions
) {
  const state = anchor(init, schema, options);
  return constantRef(state);
}
