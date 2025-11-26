import type { StateBindingRef } from '@anchorlib/core';

let REF_CHECKER: ((value: unknown) => boolean) | undefined;

export function isRef<T>(value: unknown): value is StateBindingRef<T> {
  return REF_CHECKER?.(value) ?? false;
}

export function setRefChecker(checker: (value: unknown) => boolean) {
  REF_CHECKER = checker;
}
