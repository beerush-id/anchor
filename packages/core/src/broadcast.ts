import { BATCH_MUTATION_KEYS } from './constant.js';
import { type BatchMutations, OBSERVER_KEYS } from './enum.js';
import { captureStack } from './exception.js';
import type { Broadcaster, KeyLike, Linkable, StateChange, StateMetadata, StateSubscriber } from './types.js';
import { closure } from './utils/index.js';

const INSPECTOR_SYMBOL = Symbol('state-inspector');

/**
 * Sets a global inspector function that will be called once for the next state change event.
 *
 * This function is used internally to capture the next state change event for debugging
 * or inspection purposes. The inspector function is automatically cleared after being
 * called once.
 *
 * @param fn - A function that will be called with the next state change event.
 */
export function setInspector(fn?: (init: Linkable, event: StateChange) => void) {
  closure.set(INSPECTOR_SYMBOL, fn);
}

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
  const { observers, subscribers, exceptionHandlers } = meta;

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
      const currentInspector = closure.get<(init: Linkable, event: StateChange) => void>(INSPECTOR_SYMBOL);

      if (typeof currentInspector === 'function') {
        currentInspector(init, event);
      }

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
          } else if (BATCH_MUTATION_KEYS.has(event.type as BatchMutations)) {
            observer.onChange(event);
          }
        }
      }
    },
    catch(error, event) {
      for (const handler of exceptionHandlers) {
        handler({ ...event, error, issues: error.issues });
      }
      return true;
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
      if (event.error && !exceptionHandlers.size) {
        const handlers = Array.from(subscribers).filter(
          (fn) => (fn as never as { __internal_id__: string }).__internal_id__
        );

        if (!handlers.length) {
          captureStack.error.validation(
            `Unhandled schema validation of a state mutation: "${event.type}"`,
            event.error,
            meta.configs.strict
          );
        }
      }

      for (const subscriber of subscribers) {
        if (typeof subscriber === 'function') {
          const receiver = (subscriber as never as { __internal_id__: string }).__internal_id__;

          if (receiver) {
            if (receiver !== emitter) {
              (subscriber as StateSubscriber<unknown>)(snapshot, event, emitter);
            }
          } else {
            if (!event.error) {
              (subscriber as StateSubscriber<unknown>)(snapshot, event);
            }
          }
        }
      }
    },
  } as Broadcaster;
}
