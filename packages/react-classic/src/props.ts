import type { ReactiveProps } from './types.js';
import { isRef } from './ref.js';

/**
 * Resolves reactive props by unwrapping ref values.
 *
 * This function takes an object of reactive props and returns a new object
 * where any ref values have been replaced with their current values.
 * Non-ref values are passed through unchanged.
 *
 * @template T - The type of the props object
 * @param props - An object containing reactive props, where values may be refs or plain values
 * @returns A new object with the same keys but with ref values unwrapped
 */
export function resolveProps<T>(props: ReactiveProps<T>) {
  const resolvedProps: T = {} as never;

  for (const [key, value] of Object.entries(props)) {
    if (isRef(value)) {
      resolvedProps[key as keyof T] = value.value as T[keyof T];
    } else {
      resolvedProps[key as keyof T] = value as T[keyof T];
    }
  }

  return resolvedProps;
}
