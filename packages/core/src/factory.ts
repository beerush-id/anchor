import type {
  DestroyFactoryInit,
  KeyLike,
  Linkable,
  LinkFactoryInit,
  ObjLike,
  StateSubscribeFn,
  StateSubscriber,
  SubscribeFactoryInit,
  UnlinkFactoryInit,
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
 * @param {Object} options - Configuration object for the link factory
 * @param {string} options.id - Unique identifier for the link factory
 * @param {T} options.init - Initial state value of the parent
 * @param {Set<StateSubscriber<T>>} options.subscribers - Set of subscriber functions for the parent state
 * @param {Map<Linkable, Function>} options.subscriptions - Map tracking active subscriptions to child states
 * @returns {(childPath: KeyLike, childState: Linkable, receiver?: Linkable) => void}
 *          A function that links a child state to the parent state
 *
 * @example
 * const linkFactory = createLinkFactory({ id: 'myState', init: {}, subscribers: new Set(), subscriptions: new Map() });
 * linkFactory('childKey', childStateInstance);
 */
export function createLinkFactory<T>({
  id,
  init,
  subscribers,
  subscriptions,
}: LinkFactoryInit<T>): (childPath: KeyLike, childState: Linkable, receiver?: Linkable) => void {
  return (childPath: KeyLike, childState: Linkable, receiver?: Linkable): void => {
    if (subscriptions.has(childState)) return;

    // Get the controller for the child state
    const ctrl = CONTROLLER_REGISTRY.get(childState as WeakKey);

    // If the child state has a valid controller with subscribe method
    if (typeof ctrl?.subscribe === 'function') {
      const childHandler: StateSubscriber<unknown> = (_, event, emitter) => {
        // Ignore init events to prevent duplicate notifications
        if (event && event.type !== 'init') {
          const keys = event.keys as KeyLike[];
          keys.unshift(childPath);

          // Broadcast the event with modified path to include the key
          broadcast(subscribers, init, { ...event, keys }, emitter);
        }
      };

      Object.defineProperty(childHandler, '__internal_id__', {
        value: id,
      });

      // Subscribe to the child state changes
      const childUnsubscribe = ctrl.subscribe(childHandler, receiver);

      // Store the unsubscribe function for cleanup
      subscriptions.set(childState, childUnsubscribe);
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
 * @param {Object} options - Configuration object for the unlink factory
 * @param {Map<Linkable, Function>} options.subscriptions - Map tracking active subscriptions to child states
 * @returns {(childState: Linkable) => void} A function that unlinks a child state from the parent state
 *
 * @example
 * const unlinkFactory = createUnlinkFactory({ subscriptions: new Map() });
 * unlinkFactory(childStateInstance);
 */
export function createUnlinkFactory({ subscriptions }: UnlinkFactoryInit): (childState: Linkable) => void {
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
 * @param {SubscribeFactoryInit<T>} options - Configuration object for the subscribe factory
 * @param {T} options.init - Initial state value
 * @param {Linkable} options.state - The state object being subscribed to
 * @param {string} options.recursive - Controls how nested states are handled ('flat' to skip nesting)
 * @param {(childPath: KeyLike, childState: Linkable, receiver?: Linkable) => void} options.link - Function to link child states
 * @param {Set<StateSubscriber<T>>} options.subscribers - Set of active subscriber functions
 * @param {Map<Linkable, Function>} options.subscriptions - Map tracking active child state subscriptions
 * @param {(childState: Linkable) => void} options.unlink - Function to unlink child states
 * @returns {StateSubscribeFn<T>} A function that subscribes a handler to state changes
 *
 * @example
 * const subscribeFn = createSubscribeFactory({ init: {}, state: stateInstance, ... });
 * const unsubscribe = subscribeFn((snapshot, event) => {
 *   console.log('State changed:', snapshot, event);
 * });
 *
 * // To unsubscribe later
 * unsubscribe();
 */
export function createSubscribeFactory<T>(options: SubscribeFactoryInit<T>): StateSubscribeFn<T> {
  const { init, state, recursive, link, subscribers, subscriptions, unlink } = options;

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
            unlink(val as Linkable);
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

    if (!(Array.isArray(init) && recursive === 'flat')) {
      for (const [key, value] of softEntries(init as ObjLike)) {
        const childState = INIT_REGISTRY.get(value as Linkable) as Linkable;

        if (childState && !subscriptions.has(childState) && childState !== receiver) {
          link(key, childState, (receiver ?? state) as Linkable);
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
 * @param {Object} options - Configuration object for the destroy factory
 * @param {T} options.init - Initial state value that will be removed from registries
 * @param {Linkable} options.state - The state object to be destroyed and removed from registries
 * @param {Set<StateSubscriber<T>>} options.subscribers - Set of subscriber functions to be cleared
 * @param {Map<Linkable, Function>} options.subscriptions - Map of active subscriptions to be unsubscribed
 * @returns {() => void} A function that destroys the state and cleans up all resources
 *
 * @example
 * const destroyFn = createDestroyFactory({ init: initialState, state: stateInstance, subscribers: new Set(), subscriptions: new Map() });
 * destroyFn(); // Completely destroys the state and cleans up
 */
export function createDestroyFactory<T>({
  init,
  state,
  subscribers,
  subscriptions,
}: DestroyFactoryInit<T>): () => void {
  return () => {
    for (const unsubscribe of subscriptions.values()) {
      unsubscribe?.();
    }

    // Cleaning up the observers and subscriptions.
    subscribers.clear();
    subscriptions.clear();

    // Remove the state from STATE_REGISTRY and STATE_LINK.
    INIT_REGISTRY.delete(init as WeakKey);
    REFERENCE_REGISTRY.delete(init as WeakKey);

    STATE_REGISTRY.delete(state as WeakKey);
    CONTROLLER_REGISTRY.delete(state as WeakKey);
    SUBSCRIBER_REGISTRY.delete(state as WeakKey);
    SUBSCRIPTION_REGISTRY.delete(state as WeakKey);
  };
}
