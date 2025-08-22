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
import { useDerived } from './derive.js';
import type { Ref } from 'vue';

export function useAnchor<T extends Linkable>(init: T, options?: AnchorOptions): Ref<T>;
export function useAnchor<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema: S,
  options?: AnchorConfig
): Ref<ModelOutput<S>>;
export function useAnchor<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema: S,
  options?: AnchorConfig & { immutable: true }
): Ref<ImmutableOutput<T>>;
export function useAnchor<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schemaOptions?: S | AnchorOptions<S>,
  options?: AnchorConfig
): Ref<T | ModelOutput<T> | ImmutableOutput<T>> {
  const state = anchor<S, T>(init, schemaOptions as S, options);
  return useDerived(state) as Ref<T>;
}
