import type { KeyLike, Linkable, StateChange, StateMetadata, StateObserver, StateTracker } from './types.js';
import { captureStack } from './exception.js';
import { getDevTool } from './dev.js';
import { META_REGISTRY } from './registry.js';
import { shortId } from './utils/index.js';
import { isFunction } from '@beerush/utils';
import { ANCHOR_SETTINGS } from './constant.js';

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
  let observedSize = 0;

  const states = new WeakMap();
  const destroyers = new Set<() => void>();

  const track = ((state, key) => {
    const keys = states.get(state) as Set<KeyLike>;

    if (keys.has(key)) {
      return true;
    } else {
      keys.add(key);

      if (isFunction(onTrack)) {
        onTrack(state, key);
      }
    }

    return false;
  }) satisfies StateTracker;

  const destroy = () => {
    for (const fn of destroyers) {
      if (typeof fn === 'function') {
        fn();
      }
    }

    destroyers.clear();
  };

  const assign = ((init, observers) => {
    if (!observers.has(observer)) {
      observers.add(observer);

      destroyers.add(() => {
        states.delete(init);
        observers.delete(observer);
        getDevTool()?.onUntrack?.(META_REGISTRY.get(init) as StateMetadata, observer);
      });
    }

    if (!states.has(init)) {
      states.set(init, new Set());

      if (ANCHOR_SETTINGS.safeObservation) {
        observedSize += 1;

        if (observedSize >= ANCHOR_SETTINGS.safeObservationThreshold) {
          const error = new Error('Observation limit exceeded.');
          captureStack.violation.general(
            'Unsafe observation detected:',
            `Attempted to observe too many states (${observedSize}) within a single observer.`,
            error,
            [
              `We always recommend keeping observations small.`,
              `- It's likely you are trying to perform an extensive read operation such as JSON.stringify during the observation phase.`,
              `- Use the optimized reader utility such as "anchor.read" to perform an extensive operation while maintain immutability.`,
            ],
            assign
          );
        }
      }
    }

    return (key) => track(init, key);
  }) satisfies StateObserver['assign'];

  const run = <R>(fn: () => R): R => {
    return withinObserver(fn, observer);
  };

  const observer = {
    id: shortId(),
    get states() {
      return states;
    },
    get onChange() {
      return onChange;
    },
    get destroy() {
      return destroy;
    },
    get assign() {
      return assign;
    },
    get run() {
      return run;
    },
  };

  return observer;
}

/**
 * Executes a function within a specific observer context.
 * This function temporarily sets the provided observer as the current context,
 * executes the provided function, and then restores the previous observer context.
 * It's useful for running code that should be tracked by a specific observer.
 *
 * @template R - The type of the return value of the function.
 * @param {() => R} fn - The function to execute within the observer context
 * @param {StateObserver} observer - The observer to set as the current context
 */
export function withinObserver<R>(fn: () => R, observer: StateObserver): R;
export function withinObserver<R>(observer: StateObserver, fn: () => R): R;
export function withinObserver<R>(observerOrFn: StateObserver | (() => R), fnOrObserver: (() => R) | StateObserver): R {
  if (isFunction(observerOrFn)) return withinObserver(fnOrObserver as StateObserver, observerOrFn);

  const prevObserver = currentObserver;
  currentObserver = observerOrFn;

  let result: R | undefined = undefined;

  if (typeof fnOrObserver === 'function') {
    try {
      result = fnOrObserver();
    } catch (error) {
      captureStack.error.external('Unable to execute the within observer function', error as Error, withinObserver);
    }
  } else {
    const error = new Error('Invalid argument.');
    captureStack.error.argument('The given argument is not a function', error, withinObserver);
  }

  currentObserver = prevObserver;

  return result as R;
}

/**
 * Executes a function outside any observer context.
 * This function temporarily removes the current observer context,
 * executes the provided function, and then restores the previous observer context.
 * It's useful for running code that shouldn't be tracked by the reactive system.
 *
 * @param fn - The function to execute outside of observer context
 */
export function outsideObserver<R>(fn: () => R): R {
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

  return result as R;
}
