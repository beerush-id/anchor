import type { Linkable, StateChange, StateSubscriber } from './types.js';
import { LINKABLE } from './constant.js';
import { typeOf } from '@beerush/utils';

/**
 * Broadcasts a state change event to all subscribers in the provided set.
 *
 * This function iterates through each subscriber and calls it with the provided
 * snapshot and event. If a subscriber has an `__internal_id__` property and
 * an emitter ID is provided, it ensures the subscriber is not the same as the
 * emitter before invoking the subscriber.
 *
 * @param subscribers - A set of subscribers to notify.
 * @param snapshot - The current state snapshot to pass to subscribers.
 * @param event - The state change event to pass to subscribers.
 * @param emitter - Optional identifier of the emitter to prevent self-notification.
 */
export function broadcast(subscribers: Set<unknown>, snapshot: unknown, event: StateChange, emitter?: string) {
  for (const subscriber of subscribers) {
    if (typeof subscriber === 'function') {
      const receiver = (subscriber as never as { __internal_id__: string }).__internal_id__;

      if (receiver) {
        if (receiver !== emitter) {
          (subscriber as StateSubscriber<unknown>)(snapshot, event, emitter);
        }
      } else {
        (subscriber as StateSubscriber<unknown>)(snapshot, event);
      }
    }
  }
}

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
  return LINKABLE.has(typeOf(value));
}
