import type { BatchMutation, Broadcaster, KeyLike, Linkable, StateMetadata, StateSubscriber } from './types.js';
import { BATCH_MUTATION_KEYS, LINKABLE } from './constant.js';
import { typeOf } from '@beerush/utils';
import { Linkables, OBSERVER_KEYS } from './enum.js';

/**
 * Creates a broadcaster object for managing state change notifications.
 *
 * This function initializes a broadcaster with methods to emit events to observers
 * and broadcast state changes to subscribers. The broadcaster handles different
 * types of state changes based on the type of the initial value (array, set, map, or object).
 *
 * @param init - The initial linkable state value.
 * @param meta - Metadata containing subscribers and observers for the state.
 * @returns A broadcaster object with emit and broadcast methods.
 */
export function createBroadcaster<T extends Linkable = Linkable>(init: Linkable, meta: StateMetadata<T>): Broadcaster {
  const { subscribers, observers } = meta;

  return {
    /**
     * Emits a state change event to registered observers.
     *
     * This method checks the type of the initial value and notifies observers
     * based on the specific keys they are interested in. Array and collection
     * mutations are handled specially, while other changes are notified based
     * on the event's key path.
     *
     * @param event - The state change event to emit.
     * @param prop - Optional property key that was changed.
     */
    emit(event, prop) {
      if (observers.size) {
        for (const observer of observers) {
          const keys = observer.states.get(init) as Set<KeyLike>;

          if (Array.isArray(init)) {
            if (keys.has(OBSERVER_KEYS.ARRAY_MUTATIONS)) {
              observer.onChange(event);
            }
          } else if (init instanceof Set || init instanceof Map) {
            if (keys.has(OBSERVER_KEYS.COLLECTION_MUTATIONS)) {
              observer.onChange(event);
            }
          } else if (keys.has(prop ?? event.keys.join('.'))) {
            observer.onChange(event);
          } else if (BATCH_MUTATION_KEYS.has(event.type as BatchMutation)) {
            observer.onChange(event);
          }
        }
      }
    },
    /**
     * Broadcasts a state snapshot and change event to all subscribers.
     *
     * This method delegates to the broadcast function, passing the subscribers
     * set, current snapshot, event, and optional emitter ID to prevent
     * self-notification.
     *
     * @param snapshot - The current state snapshot.
     * @param event - The state change event.
     * @param emitter - Optional identifier of the emitting instance.
     */
    broadcast(snapshot, event, emitter) {
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
    },
  } as Broadcaster;
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
  return LINKABLE.has(typeOf(value) as Linkables);
}
