import type { KeyLike, Linkable, StateChange, StateObserver } from './types.js';

let currentObserver: StateObserver | undefined = undefined;

/**
 * Sets the current observer context for state tracking.
 * This function is used internally to manage the observer stack during state derivation.
 *
 * @param observer - The observer to set as the current context
 * @returns A cleanup function that restores the previous observer context
 */
export function setObserver(observer: StateObserver) {
  let restored = false;
  const prevObserver = currentObserver;
  currentObserver = observer;

  return () => {
    if (!restored) {
      restored = true;
      currentObserver = prevObserver;
    }
  };
}

/**
 * Gets the current observer context.
 *
 * @returns The current observer or undefined if none is set
 */
export function getObserver(): StateObserver | undefined {
  return currentObserver;
}

/**
 * Creates a new observer instance for tracking state changes.
 * An observer manages subscriptions and provides lifecycle hooks for state tracking.
 *
 * @param onChange - Callback function that will be called when state changes occur
 * @param onTrack - Callback function that will be called when a new state is tracked
 * @returns A new observer instance with states management, onChange handler, onDestroy hook, and cleanup functionality
 */
export function createObserver(
  onChange: (event: StateChange) => void,
  onTrack?: (state: Linkable, key: KeyLike) => void
): StateObserver {
  const states = new WeakMap();
  const destroyers = new Set<() => void>();

  const onDestroy = (fn: () => void) => {
    destroyers.add(fn);
  };

  const destroy = () => {
    for (const fn of destroyers) {
      if (typeof fn === 'function') {
        fn();
      }
    }

    destroyers.clear();
  };

  return {
    get states() {
      return states;
    },
    get onTrack() {
      return onTrack;
    },
    get onChange() {
      return onChange;
    },
    get onDestroy() {
      return onDestroy;
    },
    get destroy() {
      return destroy;
    },
  };
}

/**
 * Assigns an observer to a state object and sets up cleanup logic.
 * This function ensures that the observer is properly linked to the state object
 * and that cleanup logic is registered to remove the observer when it's no longer needed.
 *
 * @param init - The state object to be observed
 * @param observers - A set of all observers tracking this state object
 * @param observer - The observer to be assigned to the state object
 */
export function assignObserver(init: Linkable, observers: Set<StateObserver>, observer: StateObserver) {
  if (!observers.has(observer)) {
    observers.add(observer);

    observer.onDestroy(() => {
      observer.states.delete(init);
      observers.delete(observer);
    });
  }

  if (!observer.states.has(init)) {
    observer.states.set(init, new Set());
  }
}
