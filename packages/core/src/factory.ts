import type {
  KeyLike,
  Linkable,
  ObjLike,
  State,
  StateMetadata,
  StateSubscribeFn,
  StateSubscriber,
  StateSubscriptionMap,
  SubscribeFactoryInit,
} from './types.js';
import { broadcast } from './internal.js';
import {
  CONTROLLER_REGISTRY,
  INIT_REGISTRY,
  REFERENCE_REGISTRY,
  STATE_REGISTRY,
  SUBSCRIBER_REGISTRY,
  SUBSCRIPTION_REGISTRY,
} from './registry.js';
import { captureStack } from './exception.js';
import { softEntries } from './utils/index.js';

/**
 * Creates a factory function for linking child states to a parent state.
 *
 * This factory generates a function that establishes a connection between a child state and its parent,
 * allowing state changes in the child to propagate up through the state tree. The linking process
 * involves subscribing to the child state's changes and broadcasting them with an updated path that
 * includes the child's key.
 *
 * @template T - The type of the parent state
 * @param init - The initial value of the parent state
 * @param meta - The metadata associated with the parent state
 * @returns {(childPath: KeyLike, childState: Linkable, receiver?: Linkable) => void}
 *          A function that links a child state to the parent state
 */
export function createLinkFactory<T extends Linkable>(
  init: T,
  meta: StateMetadata<T>
): (childPath: KeyLike, childState: Linkable, receiver?: Linkable) => void {
  return (childPath: KeyLike, childState: Linkable, receiver?: Linkable): void => {
    if (meta.subscriptions.has(childState)) return;

    // Get the controller for the child state
    const ctrl = CONTROLLER_REGISTRY.get(childState);

    // If the child state has a valid controller with subscribe method
    if (typeof ctrl?.subscribe === 'function') {
      const childHandler: StateSubscriber<unknown> = (_, event, emitter) => {
        // Ignore init events to prevent duplicate notifications
        if (event && event.type !== 'init') {
          const keys = event.keys as KeyLike[];
          keys.unshift(childPath);

          // Broadcast the event with modified path to include the key
          broadcast(meta.subscribers, init, { ...event, keys }, emitter);
        }
      };

      Object.defineProperty(childHandler, '__internal_id__', {
        value: meta.id,
      });

      // Subscribe to the child state changes
      const childUnsubscribe = ctrl.subscribe(childHandler, receiver);

      // Store the unsubscribe function for cleanup
      meta.subscriptions.set(childState, childUnsubscribe);
    }
  };
}

/**
 * Creates a factory function for unlinking child states from a parent state.
 *
 * This factory generates a function that removes the connection between a child state and its parent,
 * cleaning up subscriptions and preventing further state change propagation from the child to the parent.
 * The unlinking process involves calling the stored unsubscribe function for the child state and
 * removing the subscription reference from the tracking map.
 *
 * @param {StateSubscriptionMap} subscriptions - Map tracking active subscriptions to child states
 * @returns {(childState: Linkable) => void} A function that unlinks a child state from the parent state
 */
export function createUnlinkFactory(subscriptions: StateSubscriptionMap): (childState: Linkable) => void {
  return (childState: Linkable) => {
    const unsubscribe = subscriptions.get(childState);

    if (typeof unsubscribe === 'function') {
      unsubscribe();
      subscriptions.delete(childState);
    }
  };
}

/**
 * Creates a factory function for subscribing to state changes.
 *
 * This factory generates a function that allows observers to subscribe to state changes,
 * immediately notifying them with the current state. It manages subscriber registration,
 * handles duplicate subscriptions, links child states for nested reactivity, and provides
 * an unsubscribe mechanism. When the last subscriber is removed, it automatically cleans
 * up all child state subscriptions.
 *
 * @template T - The type of the state being subscribed to
 * @param init - The initial state value
 * @param state - The state associated with the init
 * @param meta - The metadata associated with the init
 * @param helper - Utilities to handle the subscriptions
 * @returns {StateSubscribeFn<T>} A function that subscribes a handler to state changes
 */
export function createSubscribeFactory<T extends Linkable>(
  init: T,
  state: State<T>,
  meta: StateMetadata<T>,
  helper: SubscribeFactoryInit
): StateSubscribeFn<T> {
  const { subscribers, subscriptions } = meta;

  const subscribeFn = (handler: StateSubscriber<T>, receiver?: Linkable) => {
    // Immediately notify the handler with the current state.
    try {
      handler(init, { type: 'init', keys: [] });
    } catch (error) {
      captureStack.error.external('Unable to execute the subscription handler function', error as Error);
      return () => {};
    }

    const unsubscribeFn = () => {
      // Remove the handler from active subscribers
      subscribers.delete(handler);

      // If no more subscribers, clean up resources
      if (subscribers.size <= 0) {
        // Unlink all child references if any exist
        if (subscriptions.size) {
          // Iterate over a copy of the subscriptions map to safely unlink
          subscriptions.forEach((_, val) => {
            helper.unlink(val as Linkable);
          });
        }
      }
    };

    // Check if the handler is already subscribed.
    // If it is, return an empty unsubscribe function to prevent duplicate notifications.
    if (subscribers.has(handler)) {
      captureStack.warning.external(
        'Duplicate subscription',
        'Attempted to subscribe to a state using the same handler multiple times.',
        'Subscription handler already registered',
        subscribeFn
      );
      return unsubscribeFn;
    }

    // Add the handler to the list of active subscribers
    subscribers.add(handler);

    if (!(Array.isArray(init) && meta.configs.recursive === 'flat')) {
      for (const [key, value] of softEntries(init as ObjLike)) {
        const childState = INIT_REGISTRY.get(value as Linkable) as Linkable;

        if (childState && !subscriptions.has(childState) && childState !== receiver) {
          helper.link(key, childState, (receiver ?? state) as Linkable);
        }
      }
    }

    // Return the unsubscribe function
    return unsubscribeFn;
  };

  return subscribeFn;
}

/**
 * Creates a factory function for destroying a state and cleaning up all associated resources.
 *
 * This factory generates a function that completely destroys a state by:
 * 1. Unsubscribing all active subscriptions to child states
 * 2. Clearing all subscribers and subscriptions
 * 3. Removing the state from all internal registries (INIT, REFERENCE, STATE, CONTROLLER, SUBSCRIBER, SUBSCRIPTION)
 *
 * This cleanup process ensures no memory leaks and properly disconnects the state from the reactive system.
 *
 * @template T - The type of the state being destroyed
 * @param init - Initial state value
 * @param state - The state object to be destroyed and removed from registries
 * @param subscribers - Set of subscriber functions to be cleared
 * @param subscriptions - Map of active subscriptions to be unsubscribed
 * @returns {() => void} A function that destroys the state and cleans up all resources
 */
export function createDestroyFactory<T extends Linkable>(
  init: T,
  state: State<T>,
  { subscribers, subscriptions }: StateMetadata<T>
): () => void {
  return () => {
    for (const unsubscribe of subscriptions.values()) {
      unsubscribe?.();
    }

    // Cleaning up the observers and subscriptions.
    subscribers.clear();
    subscriptions.clear();

    // Remove the state from STATE_REGISTRY and STATE_LINK.
    INIT_REGISTRY.delete(init);
    REFERENCE_REGISTRY.delete(init);

    STATE_REGISTRY.delete(state);
    CONTROLLER_REGISTRY.delete(state);
    SUBSCRIBER_REGISTRY.delete(state);
    SUBSCRIPTION_REGISTRY.delete(state);
  };
}
