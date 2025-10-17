import {
  anchor,
  type Immutable,
  type Linkable,
  type LinkableSchema,
  type ModelArray,
  type ModelInput,
  type ModelOutput,
  type StateOptions,
} from '@anchorlib/core';

/**
 * Creates a reactive state that can be used to manage state with Anchor.
 * This overload is used when no schema is provided, or when using a LinkableSchema with StateOptions.
 *
 * @template T - The type of the initial value
 * @template S - The schema type, extending LinkableSchema
 * @param init - The initial value for the state
 * @param options - Optional state options for the state
 * @returns A reactive state containing the initial value
 */
export function anchorRef<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
): T;

/**
 * Creates a reactive state with a defined schema for validation and type inference.
 *
 * @template S - The schema type, extending LinkableSchema
 * @template T - The type of the initial value, must extend ModelInput of the schema
 * @param init - The initial value for the state
 * @param schema - The schema to validate and type the state
 * @param options - Optional state options for the state
 * @returns A reactive state containing the output model based on the schema
 */
export function anchorRef<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema?: S,
  options?: StateOptions
): ModelOutput<S>;

/**
 * Creates an immutable reactive state with a defined schema.
 *
 * @template S - The schema type, extending LinkableSchema
 * @template T - The type of the initial value, must extend ModelInput of the schema
 * @param init - The initial value for the state
 * @param schema - The schema to validate and type the state
 * @param options - State options with immutable flag set to true
 * @returns A reactive state containing an immutable output model based on the schema
 */
export function anchorRef<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema?: S,
  options?: StateOptions & { immutable: true }
): Immutable<ModelOutput<S>>;

/**
 * Creates a reactive state for state management with optional schema validation.
 *
 * @template T - The type of the initial value
 * @template S - The schema type or options
 * @param init - The initial value for the state
 * @param schemaOptions - Either a schema or state options
 * @param options - Additional state options when schema is provided
 * @returns A reactive state containing the managed state
 */
export function anchorRef<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  schemaOptions?: S | StateOptions,
  options?: StateOptions
): T | ModelOutput<S> | Immutable<ModelOutput<S>> {
  return anchor<S, ModelInput<S>>(init as ModelInput<S>, schemaOptions as S, options);
}

/**
 * Reactive state alias for anchorRef.
 * @type {{<T, S=LinkableSchema extends LinkableSchema>(init: T, options?: StateOptions<S>): T, <S extends LinkableSchema, T extends ModelInput<S>>(init: T, schema?: S, options?: StateOptions): ModelOutput<S>, <S extends LinkableSchema, T extends ModelInput<S>>(init: T, schema?: S, options?: (StateOptions & {immutable: true})): Immutable<ModelOutput<S>>}}
 */
export const reactiveRef = anchorRef;

/**
 * Creates a reactive state that maintains a sorted array state based on a comparison function.
 *
 * @template T - The type of elements in the array
 * @template S - The schema type for array elements, extending ModelArray
 * @param init - The initial array value for the state
 * @param compare - A function that defines the sort order of elements
 * @param options - Optional state options for the state
 * @returns A reactive state containing the sorted array
 */
export function orderedRef<T extends unknown[], S extends ModelArray = ModelArray>(
  init: T,
  compare: (a: T[number], b: T[number]) => number,
  options?: StateOptions<S>
): T {
  return anchor.ordered(init, compare, options);
}

/**
 * Creates a reactive state that maintains a flat array state.
 *
 * @template T - The type of elements in the array
 * @template S - The schema type for array elements, extending ModelArray
 * @param init - The initial array value for the state
 * @param options - Optional state options for the state
 * @returns A reactive state containing the flat array
 */
export function flatRef<T extends unknown[], S extends ModelArray = ModelArray>(init: T, options?: StateOptions<S>): T {
  return anchor.flat(init, options);
}

/**
 * Creates a reactive state that mutates the underlying object.
 *
 * Unless you set the global options to `cloned: true`, you don't want to use this.
 *
 * @template T - The type of the initial value
 * @template S - The schema type, extending LinkableSchema
 * @param init - The initial value for the state
 * @param options - Optional state options for the state
 * @returns A reactive state containing the raw value
 */
export function rawRef<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
): T {
  return anchor.raw(init, options);
}
