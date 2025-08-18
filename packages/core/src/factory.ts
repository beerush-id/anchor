import type {
  DestroyFactoryInit,
  KeyLike,
  Linkable,
  LinkFactoryInit,
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

export function createLinkFactory<T>({ init, subscribers, subscriptions }: LinkFactoryInit<T>) {
  return (childPath: KeyLike, childState: Linkable): void => {
    if (subscriptions.has(childState)) return;

    // Get the controller for the child state
    const ctrl = CONTROLLER_REGISTRY.get(childState as WeakKey);

    // If the child state has a valid controller with subscribe method
    if (typeof ctrl?.subscribe === 'function') {
      // Subscribe to the child state changes
      const childUnsubscribe = ctrl.subscribe((_, event) => {
        // Ignore init events to prevent duplicate notifications
        if (event && event.type !== 'init') {
          const keys = event.keys as KeyLike[];
          keys.unshift(childPath);

          // Broadcast the event with modified path to include the key
          broadcast(subscribers, init, { ...event, keys });
        }
      });

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
  const { init, subscribers, subscriptions, unlink } = options;

  const subscribeFn = (handler: StateSubscriber<T>) => {
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

    // @TODO: Revisit eager subscriptions once the core is stable.
    // Link all child references to track their changes
    // if (recursive && !(recursive === 'flat' && Array.isArray(init))) {
    //   for (const [key, target] of createLinkableTargets(init)) {
    //     const childState = INIT_REGISTRY.get(target) as Linkable;
    //     if (childState && childState !== state && !subscriptions.has(childState)) {
    //       link(key, childState);
    //     }
    //   }
    // }

    // Add the handler to the list of active subscribers
    subscribers.add(handler);

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
