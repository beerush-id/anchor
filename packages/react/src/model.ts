import type { ImmutableOutput, LinkableSchema, ModelInput, ModelOutput, StateBaseOptions } from '@anchor/core';
import type { AnchorState } from './types.js';
import { useAnchor } from './anchor.js';

export function useModel<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: StateBaseOptions
): AnchorState<ModelOutput<S>>;
export function useModel<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: StateBaseOptions & { immutable: true }
): AnchorState<ImmutableOutput<S>>;
/**
 * A React hook that provides a mutable model based on a given schema and initial data.
 * This hook leverages the `useAnchor` hook internally to manage the model's state.
 *
 * Overloaded signatures:
 * 1. `useModel<S, T>(schema: S, init: T, options?: StateBaseOptions): AnchorState<ModelOutput<S>>`
 *    - Returns a mutable `AnchorState` for the model.
 * 2. `useModel<S, T>(schema: S, init: T, options?: StateBaseOptions & { immutable: true }): AnchorState<ImmutableOutput<S>>`
 *    - Returns an immutable `AnchorState` for the model if `immutable: true` is provided in options.
 *
 * @template S The type of the LinkableSchema.
 * @template T The type of the initial model input, which must conform to ModelInput<S>.
 * @param schema The schema defining the structure and types of the model.
 * @param init The initial data for the model.
 * @param options Optional configuration for the Anchor instance, including an `immutable` flag.
 * @returns An `AnchorState` object containing either a mutable `ModelOutput<S>` or an immutable `ImmutableOutput<S>` based on the `options`.
 */
export function useModel<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: StateBaseOptions
): AnchorState<ModelOutput<S>> {
  return useAnchor<ModelOutput<S>>(init as ModelOutput<S>, { ...options, schema });
}

/**
 * A React hook that provides an immutable model based on a given schema and initial data.
 * This hook leverages the `useAnchor` hook internally to manage the model's state.
 *
 * @template S The type of the LinkableSchema.
 * @template T The type of the initial model input, which must conform to ModelInput<S>.
 * @param schema The schema defining the structure and types of the model.
 * @param init The initial data for the model.
 * @param options Optional configuration for the Anchor instance.
 * @returns An `AnchorState` object containing the immutable output of the model.
 */
export function useImmutableModel<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: StateBaseOptions
): AnchorState<ImmutableOutput<S>> {
  return useAnchor<ImmutableOutput<S>>(init as ImmutableOutput<S>, { ...options, schema, immutable: true });
}
