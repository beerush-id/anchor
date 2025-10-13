import type { BindingRef } from '@anchorlib/core';

let REF_CHECKER: ((value: unknown) => boolean) | undefined = undefined;

export function isRef<T>(value: unknown): value is BindingRef<T> {
  return REF_CHECKER?.(value) ?? false;
}

export function setRefChecker(checker: (value: unknown) => boolean) {
  REF_CHECKER = checker;
}
