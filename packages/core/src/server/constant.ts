export const GLOBAL_ASYNC_SCOPE = Symbol('anchor-async-context');

// biome-ignore lint/suspicious/noExplicitAny: Expect Any.
export const GLOBAL_THIS: undefined | any = globalThis;

export function hasASL() {
  return !!GLOBAL_THIS?.[GLOBAL_ASYNC_SCOPE];
}
