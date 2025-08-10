import type { ZodType } from 'zod/v4';

import { anchor as createAnchor, type AnchorOptions, derive as createDerive } from '@anchor/core';

export * from '@anchor/core';

export function useAnchor<T, S extends ZodType>(init: T, options?: AnchorOptions<S>): T {
  const value = createAnchor<T, S>(init, options);
  return useDerived(value);
}

export function useDerived<T>(state: T): T;
export function useDerived<T, R>(state: T, transform: (snapshot: T) => R): R;
export function useDerived<T, R>(state: T, transform?: (snapshot: T) => R): T | R {
  const subscribe = (handler: (output: T | R) => void) => {
    return createDerive(state, (snapshot) => {
      const value = typeof transform === 'function' ? transform(snapshot) : state;
      handler(value);
    });
  };
  const set = (() => {}) as (value: T) => void;

  return { subscribe, set } as never as T | R;
}
