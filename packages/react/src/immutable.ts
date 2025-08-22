import {
  anchor,
  type Immutable,
  type Linkable,
  type LinkableSchema,
  type Mutable,
  type MutablePart,
  type MutationKey,
} from '@anchor/core';
import type { Dependencies, Derived, InitFn, InitOptions } from './types.js';
import { useAnchor } from './anchor.js';
import { useMemo } from 'react';

export function useImmutable<T extends Linkable>(init: T | InitFn<T>, deps?: Dependencies<T>): Derived<Immutable<T>>;
export function useImmutable<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T | InitFn<T>,
  options?: InitOptions<T, S>
): Derived<Immutable<T>>;
export function useImmutable<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T | InitFn<T>,
  optionDeps?: InitOptions<T, S> | Dependencies<T>
): Derived<Immutable<T>> {
  if (Array.isArray(optionDeps)) {
    return useAnchor(init, { deps: optionDeps, immutable: true }) as Derived<Immutable<T>>;
  }

  return useAnchor(init, { ...optionDeps, immutable: true }) as Derived<Immutable<T>>;
}

export function useWritable<T extends Linkable>(state: T): Mutable<T>;
export function useWritable<T extends Linkable, K extends MutationKey<T>[]>(state: T, contract: K): MutablePart<T, K>;
export function useWritable<T extends Linkable, K extends MutationKey<T>[]>(
  state: T,
  contracts?: K
): [MutablePart<T, K>] {
  return useMemo(() => {
    return [anchor.writable(state, contracts)];
  }, [state, contracts]);
}
