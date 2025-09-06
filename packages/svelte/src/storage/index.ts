import { persistent, session } from '@anchor/storage';
import type { LinkableSchema, ObjLike, StateOptions } from '@anchor/core';
import { useDerived } from '../index.js';

export function useSession<T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
  name: string,
  init: T,
  options?: StateOptions<S>
): T {
  const state = session(name, init, options);
  return useDerived<T>(state);
}

export function usePersistent<T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
  name: string,
  init: T,
  options?: StateOptions<S>
): T {
  const state = persistent(name, init, options);
  return useDerived<T>(state);
}
