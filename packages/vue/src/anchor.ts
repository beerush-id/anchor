import {
  anchor,
  type AnchorConfig,
  type AnchorOptions,
  type ImmutableOutput,
  type Linkable,
  type LinkableSchema,
  type ModelInput,
  type ModelOutput,
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
export function anchorRef<T extends Linkable>(init: T, options?: AnchorOptions): Ref<T>;

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
  options?: AnchorConfig
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
  options?: AnchorConfig & { immutable: true }
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
  schemaOptions?: S | AnchorOptions<S>,
  options?: AnchorConfig
): Ref<T | ModelOutput<T> | ImmutableOutput<T>> {
  const state = anchor<S, T>(init, schemaOptions as S, options);
  return derivedRef(state) as Ref<T>;
}
