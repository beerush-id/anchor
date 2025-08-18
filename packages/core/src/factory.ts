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

export function createLinkFactory<T>({ id, init, subscribers, subscriptions }: LinkFactoryInit<T>) {
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

export function createUnlinkFactory({ subscriptions }: UnlinkFactoryInit) {
  return (childState: Linkable) => {
    const unsubscribe = subscriptions.get(childState);

    if (typeof unsubscribe === 'function') {
      unsubscribe();
      subscriptions.delete(childState);
    }
  };
}

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

export function createDestroyFactory<T>({ init, state, subscribers, subscriptions }: DestroyFactoryInit<T>) {
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
