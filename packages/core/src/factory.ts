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
import { broadcast, createLinkableRefs } from './internal.js';
import { INIT_REGISTRY, STATE_REGISTRY } from './registry.js';

import { cancelCleanup } from './derive.js';
import { captureStack } from './exception.js';

export function createLinkFactory<T>({ init, subscribers, subscriptions }: LinkFactoryInit<T>) {
  return (childPath: KeyLike, childState: Linkable) => {
    // Avoid duplicate linking
    if (!STATE_REGISTRY.has(childState) || subscriptions.has(childState)) return;

    // Get the controller for the child state
    const ctrl = STATE_REGISTRY.get(childState as WeakKey);

    // If the child state has a valid controller with subscribe method
    if (typeof ctrl?.subscribe === 'function') {
      // Subscribe to the child state changes
      const childUnsubscribe = ctrl.subscribe((_, event) => {
        // Ignore init events to prevent duplicate notifications
        if (event && event?.type !== 'init') {
          const keys = event?.keys ?? [];
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
  const { init, state, recursive, subscribers, subscriptions, link, unlink } = options;

  return (handler: StateSubscriber<T>) => {
    cancelCleanup(state as Linkable);

    // Immediately notify the handler with the current state.
    try {
      handler(init, { type: 'init', keys: [] });
    } catch (error) {
      captureStack.error.external('Unable to execute the subscription handler function', error as Error);
      return () => {};
    }

    // Check if the handler is already subscribed.
    // If it is, return an empty unsubscribe function to prevent duplicate notifications.
    if (subscribers.has(handler)) {
      return () => {};
    }

    // Link all child references to track their changes
    if (recursive && !(recursive === 'flat' && Array.isArray(init))) {
      for (const [key, value] of createLinkableRefs(init)) {
        if (value !== init && !subscriptions.has(value)) {
          link(key, value);
        }
      }
    }

    // Add the handler to the list of active subscribers
    subscribers.add(handler);

    // Return the unsubscribe function
    return () => {
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

        // Clean up the state from global tracking maps
        // STATE_LINK.delete(init as WeakKey);
        // ANCHOR_REGISTRY.delete(state as WeakKey);
      }
    };
  };
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
    STATE_REGISTRY.delete(state as WeakKey);
    INIT_REGISTRY.delete(init as WeakKey);
  };
}
