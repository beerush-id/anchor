import type { Linkable } from './types.js';
import type { Linkables } from './enum.js';
import { LINKABLE } from './constant.js';
import { typeOf } from '@beerush/utils';

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
