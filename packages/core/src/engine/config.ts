import { ANCHOR_SETTINGS, LINKABLE } from '../shared/constant.js';
import type { Linkables } from '../shared/enum.js';
import type { Linkable } from '../types.js';
import { typeOf } from '../utils/index.js';
import { restoreSwitch, suspendSwitch } from './switchable.js';

/**
 * Checks if a given value is linkable.
 *
 * This function determines if the provided value's type is present in the
 * LINKABLE set, which defines which types are considered linkable.
 *
 * @param value - The value to check for linkability.
 * @returns True if the value is linkable, false otherwise.
 */
export function linkable(value: unknown): value is Linkable {
  return LINKABLE.has(typeOf(value) as Linkables);
}

export function isReactive() {
  return ANCHOR_SETTINGS.reactive;
}

export function setReactive(reactive: boolean) {
  ANCHOR_SETTINGS.reactive = reactive;

  if (reactive) {
    restoreSwitch();
  } else {
    suspendSwitch();
  }
}
