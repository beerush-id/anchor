import type { KeyLike, Linkable, StateChange, StateMetadata, StateObserver } from './types.js';
import { captureStack } from './exception.js';
import { getDevTool } from './dev.js';
import { META_REGISTRY } from './registry.js';
import { shortId } from './utils/index.js';

let currentObserver: StateObserver | undefined = undefined;
let currentRestorer: (() => void) | undefined = undefined;

/**
 * Sets the current observer context for state tracking.
 * This function is used internally to manage the observer stack during state derivation.
 *
 * @param observer - The observer to set as the current context
 * @returns A cleanup function that restores the previous observer context
 */
export function setObserver(observer: StateObserver) {
  // Make sure it handles duplicate observer such as when evaluated in React's strict mode.
  if (currentObserver === observer) return currentRestorer as () => void;

  let restored = false;
  const prevObserver = currentObserver;
  const prevRestorer = currentRestorer;

  currentObserver = observer;
  currentRestorer = () => {
    if (!restored) {
      restored = true;
      currentObserver = prevObserver;
      currentRestorer = prevRestorer;
    }
  };

  return currentRestorer;
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
    id: shortId(),
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
    run<R>(fn: () => R): R | undefined {
      return withinObserver(this, fn);
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
      getDevTool()?.onUntrack?.(META_REGISTRY.get(init) as StateMetadata, observer);
    });
  }

  if (!observer.states.has(init)) {
    observer.states.set(init, new Set());
  }
}

/**
 * Executes a function within a specific observer context.
 * This function temporarily sets the provided observer as the current context,
 * executes the provided function, and then restores the previous observer context.
 * It's useful for running code that should be tracked by a specific observer.
 *
 * @param observer - The observer to set as the current context
 * @param fn - The function to execute within the observer context
 */
export function withinObserver<R>(observer: StateObserver, fn: () => R): R | undefined {
  const prevObserver = currentObserver;
  currentObserver = observer;

  let result: R | undefined = undefined;

  if (typeof fn === 'function') {
    try {
      result = fn();
    } catch (error) {
      captureStack.error.external('Unable to execute the within observer function', error as Error, withinObserver);
    }
  } else {
    const error = new Error('Invalid argument.');
    captureStack.error.argument('The given argument is not a function', error, withinObserver);
  }

  currentObserver = prevObserver;

  return result;
}

/**
 * Executes a function outside any observer context.
 * This function temporarily removes the current observer context,
 * executes the provided function, and then restores the previous observer context.
 * It's useful for running code that shouldn't be tracked by the reactive system.
 *
 * @param fn - The function to execute outside of observer context
 */
export function outsideObserver<R>(fn: () => R): R | undefined {
  const prevObserver = currentObserver;
  currentObserver = undefined;

  let result: R | undefined = undefined;

  if (typeof fn === 'function') {
    try {
      result = fn();
    } catch (error) {
      captureStack.error.external(
        'Unable to execute the outside of observer function',
        error as Error,
        outsideObserver
      );
    }
  } else {
    const error = new Error('Invalid argument.');
    captureStack.error.argument('The given argument is not a function', error, outsideObserver);
  }

  currentObserver = prevObserver;

  return result;
}
