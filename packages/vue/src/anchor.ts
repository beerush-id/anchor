import {
  anchor,
  type ImmutableOutput,
  type Linkable,
  type LinkableSchema,
  type ModelInput,
  type ModelOutput,
  type StateBaseOptions,
  type StateOptions,
} from '@anchor/core';
import { derivedRef } from './derive.js';
import type { Ref } from 'vue';

/**
 * Creates a reactive anchor state that can be used in Vue components.
 *
 * @template T - The type of the linkable object
 * @param init - The initial value for the anchor state
 * @param options - Optional configuration for the anchor
 * @returns A Vue ref containing the anchor state
 */
export function anchorRef<T extends Linkable>(init: T, options?: StateOptions): Ref<T>;

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
): Ref<ModelOutput<S>>;

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
): Ref<ImmutableOutput<T>>;

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
): Ref<T | ModelOutput<T> | ImmutableOutput<T>> {
  const state = anchor<S, T>(init, schemaOptions as S, options);
  return derivedRef(state) as Ref<T>;
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
export function flatRef<T extends unknown[], S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
): Ref<T> {
  const state = anchor.flat(init, options);
  return derivedRef(state) as Ref<T>;
}

/**
 * Creates a reactive object that mutates the original object.
 * This is a Vue wrapper around anchor.raw that returns a Ref.
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
): Ref<T> {
  const state = anchor.raw(init, options);
  return derivedRef(state) as Ref<T>;
}
