import {
  anchor,
  type ImmutableOutput,
  type LinkableSchema,
  type ModelInput,
  type ModelOutput,
  type StateBaseOptions,
} from '@anchor/core';
import type { VariableRef } from './types.js';
import { variableRef } from './ref.js';

/**
 * Creates a reactive reference to a model state that can be used in Vue components.
 *
 * This function wraps the anchor model with Vue's reactivity system, allowing
 * the model state to be used as a reactive reference in Vue templates and composables.
 *
 * @template S - The schema type that extends LinkableSchema
 * @template T - The initial value type that extends ModelInput<S>
 *
 * @param schema - The schema definition for the model
 * @param init - The initial state value for the model
 * @param options - Optional configuration for the anchor model
 *
 * @returns A Vue Ref containing the model state that updates reactively
 */
export function modelRef<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: StateBaseOptions
): VariableRef<ModelOutput<S>>;

/**
 * Creates an immutable reactive reference to a model state that can be used in Vue components.
 *
 * When the **immutable** option is set to true, the returned reference will contain
 * an immutable version of the model state, preventing direct mutations.
 *
 * @template S - The schema type that extends LinkableSchema
 * @template T - The initial value type that extends ModelInput<S>
 *
 * @param schema - The schema definition for the model
 * @param init - The initial state value for the model
 * @param options - Configuration for the anchor model with immutable flag set to true
 *
 * @returns A Vue Ref containing the immutable model state that updates reactively
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
  return variableRef(state) as VariableRef<ModelOutput<S>>;
}
