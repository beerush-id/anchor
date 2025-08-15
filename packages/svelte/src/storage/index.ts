import { persistent, session } from '@anchor/storage';
import type { AnchorOptions, ObjLike } from '@anchor/core';
import { useDerived } from '../index.js';
import type { ZodType } from 'zod/v4';

export function useSession<T extends ObjLike, S extends ZodType = ZodType>(
  name: string,
  init: T,
  options?: AnchorOptions<S>
): T {
  const state = session(name, init, options);
  return useDerived<T>(state);
}

export function usePersistent<T extends ObjLike, S extends ZodType = ZodType>(
  name: string,
  init: T,
  options?: AnchorOptions<S>
): T {
  const state = persistent(name, init, options);
  return useDerived<T>(state);
}
