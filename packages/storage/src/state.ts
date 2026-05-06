import { globalRun, mutable } from '@anchorlib/core';

export function createState<T, O>(init: T, options?: O): T {
  return globalRun(() => mutable(init as never, options as never) as T);
}
