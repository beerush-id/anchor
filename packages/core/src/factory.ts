import type {
  Broadcaster,
  KeyLike,
  Linkable,
  ObjLike,
  State,
  StateMetadata,
  StateSubscribeFn,
  StateSubscriber,
  SubscribeFactoryInit,
} from './types.js';
import {
  BROADCASTER_REGISTRY,
  CONTROLLER_REGISTRY,
  INIT_GATEWAY_REGISTRY,
  INIT_REGISTRY,
  META_INIT_REGISTRY,
  META_REGISTRY,
  MUTATOR_REGISTRY,
  RELATION_REGISTRY,
  SORTER_REGISTRY,
  STATE_REGISTRY,
  SUBSCRIBER_REGISTRY,
  SUBSCRIPTION_REGISTRY,
} from './registry.js';
import { captureStack } from './exception.js';
import { softEntries, softValues } from './utils/index.js';
import { getDevTool } from './dev.js';

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
 * @returns {(childPath: KeyLike, childState: State, receiver?: State) => void}
 *          A function that links a child state to the parent state
 */
export function createLinkFactory<T extends Linkable>(
  init: T,
  meta: StateMetadata<T>
): (childPath: KeyLike, childState: State, receiver?: State) => void {
  const devTool = getDevTool();
  const broadcaster = BROADCASTER_REGISTRY.get(init) as Broadcaster;

  return (childPath: KeyLike, childState: State, receiver?: State): void => {
    if (meta.subscriptions.has(childState)) return;

    // Get the controller for the child state
    const childInit = STATE_REGISTRY.get(childState) as Linkable;
    const childMeta = META_REGISTRY.get(childInit) as StateMetadata;
    const childController = CONTROLLER_REGISTRY.get(childState);

    // If the child state has a valid controller with subscribe method
    if (typeof childController?.subscribe === 'function') {
      const childHandler: StateSubscriber<unknown> = (_, event, emitter) => {
        // Ignore init events to prevent duplicate notifications
        if (event && event.type !== 'init') {
          const keys = [childPath, ...event.keys] as KeyLike[];
          // Broadcast the event with modified path to include the key
          broadcaster.broadcast(init, { ...event, keys }, emitter);
        }
      };

      Object.defineProperty(childHandler, '__internal_id__', {
        value: meta.id,
      });

      // Subscribe to the child state changes
      const childUnsubscribe = childController.subscribe(childHandler, receiver);

      // Store the unsubscribe function for cleanup
      meta.subscriptions.set(childState, childUnsubscribe);

      devTool?.onLink?.(meta, childMeta);
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
 * @param meta - The metadata object associated with the child state
 * @returns {(childState: Linkable) => void} A function that unlinks a child state from the parent state
 */
export function createUnlinkFactory<T extends Linkable>(meta: StateMetadata<T>): (childState: Linkable) => void {
  const devTool = getDevTool();
  const { subscriptions } = meta;

  return (childState: State) => {
    const unsubscribe = subscriptions.get(childState);

    if (typeof unsubscribe === 'function') {
      unsubscribe();
      subscriptions.delete(childState);

      if (devTool?.onUnlink) {
        const childInit = STATE_REGISTRY.get(childState) as Linkable;
        const childMeta = META_REGISTRY.get(childInit) as StateMetadata;
        devTool.onUnlink(meta, childMeta);
      }
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
  const devTool = getDevTool();
  const { subscribers, subscriptions } = meta;

  const subscribeFn = (handler: StateSubscriber<T>, receiver?: State) => {
    // Immediately notify the handler with the current state.
    try {
      handler(init, { type: 'init', keys: [] });
    } catch (error) {
      captureStack.error.external('Unable to execute the subscription handler function', error as Error);
      return () => {};
    }

    const unsubscribeFn = () => {
      // Do nothing if no subscribers left for potential multiple unsubscribe calls.
      if (!subscribers.size) return;

      // Remove the handler from active subscribers
      subscribers.delete(handler);

      // If no more subscribers, clean up resources
      if (subscribers.size <= 0) {
        // Unlink all child references if any exist
        if (subscriptions.size) {
          // Iterate over a copy of the subscriptions map to safely unlink
          subscriptions.forEach((_, val) => {
            helper.unlink(val as State);
          });
        }
      }

      devTool?.onUnsubscribe?.(meta, handler, receiver);
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
        const childState = INIT_REGISTRY.get(value as Linkable) as State;

        if (childState && !subscriptions.has(childState) && childState !== receiver) {
          helper.link(key, childState, (receiver ?? state) as State);
        }
      }
    }

    devTool?.onSubscribe?.(meta, handler, receiver);

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
 * 3. Removing the state from all internal registries (INIT, META, REFERENCE, STATE, CONTROLLER, SUBSCRIBER,
 * SUBSCRIPTION)
 *
 * This cleanup process ensures no memory leaks and properly disconnects the state from the reactive system.
 *
 * @template T - The type of the state being destroyed
 * @param init - Initial state value
 * @param state - The state object to be destroyed and removed from registries
 * @param meta - The metadata associated with the state
 * @returns {() => void} A function that destroys the state and cleans up all resources
 */
export function createDestroyFactory<T extends Linkable>(init: T, state: State<T>, meta: StateMetadata<T>): () => void {
  const devTool = getDevTool();
  const { observers, subscribers, subscriptions } = meta;

  const handler = (propagation?: boolean) => {
    // Prevents destroying a state that is already destroyed.
    if (!INIT_REGISTRY.has(init)) return;

    if (propagation && subscribers.size) {
      const error = new Error('State is active');
      captureStack.error.internal('Attempted to destroy state that still active', error, handler);
      return;
    }

    // Removing the destroyed state from all observers.
    if (observers.size) {
      for (const observer of observers) {
        if (observer.states.has(init)) {
          observer.states.delete(init);
        }
      }

      observers.clear();
    }

    if (subscriptions.size) {
      for (const unsubscribe of subscriptions.values()) {
        unsubscribe?.();
      }

      subscriptions.clear();
    }

    for (const childInit of softValues(init as { [key: string]: Linkable })) {
      const childState = INIT_REGISTRY.get(childInit as Linkable) as State;

      if (childState) {
        const childController = CONTROLLER_REGISTRY.get(childState);

        if (!childController?.meta.subscribers.size) {
          (childController?.destroy as (prop: boolean) => void)(true);
        }
      }
    }

    // Cleaning up the subscriber list.
    subscribers.clear();

    // Remove the state from STATE_REGISTRY and STATE_LINK.
    INIT_REGISTRY.delete(init);
    META_REGISTRY.delete(init);
    SORTER_REGISTRY.delete(init);

    RELATION_REGISTRY.delete(init);
    MUTATOR_REGISTRY.delete(init);
    BROADCASTER_REGISTRY.delete(init);
    INIT_GATEWAY_REGISTRY.delete(init);

    STATE_REGISTRY.delete(state);
    CONTROLLER_REGISTRY.delete(state);
    SUBSCRIBER_REGISTRY.delete(state);
    SUBSCRIPTION_REGISTRY.delete(state);
    META_INIT_REGISTRY.delete(meta as StateMetadata);

    devTool?.onDestroy?.(init, meta);
  };

  return handler;
}
