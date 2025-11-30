import { isBrowser } from '@anchorlib/core';

export function safeProps<P>(props: P): P {
  if (!isBrowser()) {
    for (const key of Object.keys(props as Record<string, unknown>)) {
      if (key.startsWith('on')) {
        delete props[key as keyof typeof props];
      }
    }
  }

  return props as P;
}

export function callback<T>(fn: T): T {
  if (!isBrowser()) return undefined as never;
  return fn;
}
