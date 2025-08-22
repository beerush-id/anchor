import {
  anchor,
  type AnchorConfig,
  type ImmutableOutput,
  type LinkableSchema,
  type ModelInput,
  type ModelOutput,
} from '@anchor/core';
import { useDerived } from './derive.js';
import type { Ref } from 'vue';

export function useModel<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: AnchorConfig
): Ref<ModelOutput<S>>;
export function useModel<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options: AnchorConfig & { immutable: true }
): Ref<ImmutableOutput<S>>;
export function useModel<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: AnchorConfig
) {
  const state = anchor(init, schema, options);
  return useDerived(state);
}
