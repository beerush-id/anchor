import {
  anchor,
  type Immutable,
  linkable,
  type Linkable,
  type LinkableSchema,
  type ModelArray,
  type ModelInput,
  type ModelOutput,
  type StateOptions,
} from '@anchorlib/core';
import type { VariableRef } from './types.js';
import { variableRef } from './ref.js';

/**
 * Creates a writable reference that can be used to manage state with Anchor.
 * This overload is used when no schema is provided, or when using a LinkableSchema with StateOptions.
 *
 * @template T - The type of the initial value
 * @template S - The schema type, extending LinkableSchema
 * @param init - The initial value for the reference
 * @param options - Optional state options for the reference
 * @returns A WritableRef containing the initial value
 */
export function anchorRef<T, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
): VariableRef<T>;

/**
 * Creates a writable reference with a defined schema for validation and type inference.
 *
 * @template S - The schema type, extending LinkableSchema
 * @template T - The type of the initial value, must extend ModelInput of the schema
 * @param init - The initial value for the reference
 * @param schema - The schema to validate and type the reference
 * @param options - Optional state options for the reference
 * @returns A WritableRef containing the output model based on the schema
 */
export function anchorRef<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema?: S,
  options?: StateOptions
): VariableRef<ModelOutput<S>>;

/**
 * Creates an immutable writable reference with a defined schema.
 *
 * @template S - The schema type, extending LinkableSchema
 * @template T - The type of the initial value, must extend ModelInput of the schema
 * @param init - The initial value for the reference
 * @param schema - The schema to validate and type the reference
 * @param options - State options with immutable flag set to true
 * @returns A WritableRef containing an immutable output model based on the schema
 */
export function anchorRef<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema?: S,
  options?: StateOptions & { immutable: true }
): VariableRef<Immutable<ModelOutput<S>>>;

/**
 * Creates a writable reference for state management with optional schema validation.
 *
 * @template T - The type of the initial value
 * @template S - The schema type or options
 * @param init - The initial value for the reference
 * @param schemaOptions - Either a schema or state options
 * @param options - Additional state options when schema is provided
 * @returns A WritableRef containing the managed state
 */
export function anchorRef<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  schemaOptions?: S | StateOptions,
  options?: StateOptions
): VariableRef<T | ModelOutput<S> | Immutable<ModelOutput<S>>> {
  const state = linkable(init) ? anchor<S, ModelInput<S>>(init as ModelInput<S>, schemaOptions as S, options) : init;
  return variableRef(state);
}

/**
 * Creates a writable reference that maintains a sorted array state based on a comparison function.
 *
 * @template T - The type of elements in the array
 * @template S - The schema type for array elements, extending ModelArray
 * @param init - The initial array value for the reference
 * @param compare - A function that defines the sort order of elements
 * @param options - Optional state options for the reference
 * @returns A VariableRef containing the sorted array
 */
export function orderedRef<T extends unknown[], S extends ModelArray = ModelArray>(
  init: T,
  compare: (a: T[number], b: T[number]) => number,
  options?: StateOptions<S>
): VariableRef<T> {
  const state = anchor.ordered(init, compare, options);
  return variableRef(state);
}

/**
 * Creates a writable reference that maintains a flat array state.
 *
 * @template T - The type of elements in the array
 * @template S - The schema type for array elements, extending ModelArray
 * @param init - The initial array value for the reference
 * @param options - Optional state options for the reference
 * @returns A VariableRef containing the flat array
 */
export function flatRef<T extends unknown[], S extends ModelArray = ModelArray>(
  init: T,
  options?: StateOptions<S>
): VariableRef<T> {
  const state = anchor.flat(init, options);
  return variableRef(state);
}

/**
 * Creates a writable reference that mutates the underlying object.
 *
 * Unless you set the global options to `cloned: true`, you don't want to use this.
 *
 * @template T - The type of the initial value
 * @template S - The schema type, extending LinkableSchema
 * @param init - The initial value for the reference
 * @param options - Optional state options for the reference
 * @returns A VariableRef containing the raw value
 */
export function rawRef<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
): VariableRef<T> {
  const state = anchor.raw(init, options);
  return variableRef(state);
}
