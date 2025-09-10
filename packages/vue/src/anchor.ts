import {
  anchor,
  type ImmutableOutput,
  linkable,
  type Linkable,
  type LinkableSchema,
  type ModelArray,
  type ModelInput,
  type ModelOutput,
  type StateBaseOptions,
  type StateOptions,
} from '@anchor/core';
import { variableRef } from './ref.js';
import type { VariableRef } from './types.js';

/**
 * Creates a reactive anchor state that can be used in Vue components.
 *
 * @template T - The type of the linkable object
 * @param init - The initial value for the anchor state
 * @param options - Optional configuration for the anchor
 * @returns A Vue ref containing the anchor state
 */
export function anchorRef<T extends Linkable>(init: T, options?: StateOptions): VariableRef<T>;

/**
 * Creates a reactive anchor state with a schema that can be used in Vue components.
 *
 * @template S - The schema type
 * @template T - The model input type
 * @param init - The initial value for the anchor state
 * @param schema - The schema to validate and structure the data
 * @param options - Optional configuration for the anchor
 * @returns A Vue ref containing the validated model output
 */
export function anchorRef<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema: S,
  options?: StateBaseOptions
): VariableRef<ModelOutput<S>>;

/**
 * Creates an immutable reactive anchor state with a schema that can be used in Vue components.
 *
 * @template S - The schema type
 * @template T - The model input type
 * @param init - The initial value for the anchor state
 * @param schema - The schema to validate and structure the data
 * @param options - Configuration for the anchor with immutable flag
 * @returns A Vue ref containing the immutable validated model output
 */
export function anchorRef<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema: S,
  options?: StateBaseOptions & { immutable: true }
): VariableRef<ImmutableOutput<T>>;

/**
 * Creates a reactive anchor state that can be used in Vue components.
 *
 * @template S - The schema type
 * @template T - The model input type
 * @param init - The initial value for the anchor state
 * @param schemaOptions - Either a schema or anchor options
 * @param options - Optional configuration for the anchor
 * @returns A Vue ref containing the anchor state
 */
export function anchorRef<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schemaOptions?: S | StateOptions<S>,
  options?: StateBaseOptions
): VariableRef<T | ModelOutput<T> | ImmutableOutput<T>> {
  const state = linkable(init) ? anchor<S, T>(init, schemaOptions as S, options) : init;
  return variableRef(state) as VariableRef<T>;
}

/**
 * Creates a reactive array that only reacts to changes in the array.
 * This is a Vue wrapper around anchor.flat that returns a Ref.
 *
 * @template T - The type of the initial array
 * @template S - The schema type for validation
 * @param init - Initial array value
 * @param options - Configuration options
 * @returns A Vue Ref containing the flat reactive array
 */
export function flatRef<T extends unknown[], S extends ModelArray = ModelArray>(
  init: T,
  options?: StateOptions<S>
): VariableRef<T> {
  const state = anchor.flat(init, options);
  return variableRef(state) as VariableRef<T>;
}

/**
 * Creates a reactive array that maintains a sorted order based on a comparison function.
 * This is a Vue wrapper around anchor.ordered that returns a Ref.
 *
 * @template T - The type of the initial array
 * @template S - The schema type for validation
 * @param init - Initial array value
 * @param compare - Comparison function to determine the order of elements
 * @param options - Configuration options
 * @returns A Vue Ref containing the ordered reactive array
 */
export function orderedRef<T extends unknown[], S extends ModelArray = ModelArray>(
  init: T,
  compare: (a: T[number], b: T[number]) => number,
  options?: StateOptions<S>
): VariableRef<T> {
  const state = anchor.ordered(init, compare, options);
  return variableRef(state) as VariableRef<T>;
}

/**
 * Creates a reactive object that mutates the original object.
 * This is a Vue wrapper around anchor.raw that returns a Ref.
 *
 * Unless you set the global options to `cloned: true`, you don't want to use this.
 *
 * @template T - The type of the initial object
 * @template S - The schema type for validation
 * @param init - Initial object value
 * @param options - Configuration options
 * @returns A Vue Ref containing the raw reactive object
 */
export function rawRef<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
): VariableRef<T> {
  const state = anchor.raw(init, options);
  return variableRef(state) as VariableRef<T>;
}
