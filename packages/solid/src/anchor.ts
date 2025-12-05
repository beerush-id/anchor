import {
  anchor,
  type ImmutableOutput,
  type Linkable,
  type LinkableSchema,
  type ModelArray,
  type ModelInput,
  type ModelOutput,
  type StateBaseOptions,
  type StateOptions,
} from '@anchorlib/core';

/**
 * @deprecated Use 'mutable()' instead.
 * Creates a reactive reference to a linkable object with automatic tracking setup.
 *
 * @typeParam T - The type of the linkable object
 * @typeParam S - The schema type for the linkable object
 * @param init - The initial linkable value
 * @param options - Configuration options for the state
 * @returns A reactive reference to the linkable object
 */
export function anchorRef<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
): T;

/**
 * @deprecated Use 'mutable()' instead.
 * Creates a reactive reference to a model input with a defined schema.
 *
 * @typeParam S - The schema type
 * @typeParam T - The model input type that conforms to the schema
 * @param init - The initial model input value
 * @param schema - The schema defining the structure of the model
 * @param options - Basic configuration options for the state
 * @returns A reactive model output based on the input and schema
 */
export function anchorRef<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema: S,
  options?: StateBaseOptions
): ModelOutput<T>;

/**
 * @deprecated Use 'mutable()' instead.
 * Creates an immutable reactive reference to a model input with a defined schema.
 *
 * @typeParam S - The schema type
 * @typeParam T - The model input type that conforms to the schema
 * @param init - The initial model input value
 * @param schema - The schema defining the structure of the model
 * @param options - Configuration options with immutable flag set to true
 * @returns An immutable reactive model output based on the input and schema
 */
export function anchorRef<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema: S,
  options?: StateBaseOptions & { immutable: true }
): ImmutableOutput<T>;

/**
 * @deprecated Use 'mutable()' instead.
 * Creates a reactive reference with schema and options.
 *
 * @typeParam S - The schema type
 * @typeParam T - The model input type that conforms to the schema
 * @param init - The initial model input value
 * @param schemaOptions - The schema defining the structure of the model
 * @param options - Full configuration options for the state
 * @returns A reactive reference to the model
 */
export function anchorRef<S extends LinkableSchema, T extends ModelInput<S>>(
  init: ModelInput<S>,
  schemaOptions: S,
  options?: StateOptions<S>
): T {
  return anchor(init, schemaOptions, options) as T;
}

/**
 * @deprecated Use 'mutable()' instead.
 * Creates a reactive anchor state that can be used in Vue components.
 * This is an alias for anchorRef.
 * @type {{<T>(init: T, options?: StateOptions): VariableRef<T>, <S extends LinkableSchema, T extends ModelInput<S>>(init: T, schema: S, options?: StateBaseOptions): VariableRef<ModelOutput<S>>, <S extends LinkableSchema, T extends ModelInput<S>>(init: T, schema: S, options?: (StateBaseOptions & {immutable: true})): VariableRef<ImmutableOutput<T>>}}
 */
export const reactive = anchorRef;

/**
 * Creates a reactive array that only reacts to changes in the array.
 *
 * @typeParam T - The type of the array elements
 * @typeParam S - The model array schema type
 * @param init - The initial array value
 * @param options - Configuration options for the state
 * @returns A flattened reactive reference to the array
 */
export function flatRef<T extends unknown[], S extends ModelArray = ModelArray>(init: T, options?: StateOptions<S>): T {
  return anchor.flat<T, S>(init, options);
}

/**
 * @deprecated Use 'ordered()' instead.
 * Creates a reactive array that maintains a sorted order based on a comparison function.
 *
 * @typeParam T - The type of the array elements
 * @typeParam S - The model array schema type
 * @param init - The initial array value
 * @param compare - A function that defines the sort order
 * @param options - Configuration options for the state
 * @returns A sorted reactive reference to the array
 */
export function orderedRef<T extends unknown[], S extends ModelArray = ModelArray>(
  init: T,
  compare: (a: T[number], b: T[number]) => number,
  options?: StateOptions<S>
): T {
  return anchor.ordered<T, S>(init, compare, options);
}
