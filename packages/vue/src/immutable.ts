import { anchor, type AnchorOptions, type Immutable, type Linkable, type LinkableSchema } from '@anchor/core';
import type { Ref } from 'vue';
import { useDerived } from './derive.js';

export function useImmutable<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: AnchorOptions<S>
): Ref<Immutable<T>> {
  const state = anchor.immutable(init, options);
  return useDerived(state) as Ref<Immutable<T>>;
}
