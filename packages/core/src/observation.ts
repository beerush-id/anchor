import { ANCHOR_SETTINGS } from './constant.js';
import { getDevTool } from './dev.js';
import { captureStack } from './exception.js';
import { onCleanup } from './lifecycle.js';
import { META_REGISTRY } from './registry.js';
import type {
  EffectHandler,
  KeyLike,
  Linkable,
  StateChange,
  StateMetadata,
  StateObserver,
  StateObserverList,
  StatePublicTracker,
  StateTracker,
  StateUnsubscribe,
} from './types.js';
import { closure, isFunction, shortId } from './utils/index.js';

const OBSERVER_SYMBOL = Symbol('state-observer');
const OBSERVER_RESTORER_SYMBOL = Symbol('state-observer-restore');

/**
 * Creates a reactive effect that automatically tracks dependencies and re-runs when those dependencies change.
 * The effect function will be executed immediately and then again whenever any tracked state changes.
 *
 * @param fn - The effect function to execute. It receives a StateChange event object containing
 *                 information about what triggered the effect (init, set, delete, etc.) and which keys changed.
 * @param displayName - Optional effect name for debugging.
 * @returns A cleanup function that can be called to manually dispose of the effect and unsubscribe
 *          from all tracked dependencies. This is automatically called when the current scope is cleaned up.
 */
export function effect<T>(fn: EffectHandler<T>, displayName?: string): StateUnsubscribe {
  let cleanup: StateUnsubscribe | undefined;

  const observer = createObserver((event) => {
    cleanup?.();
    observer.reset();

    runEffect(event);
  });
  observer.name = `Effect(${displayName ?? 'Anonymous'})`;

  const runEffect = (event: StateChange) => {
    const unobserve = observer.run(() => fn(event));

    if (typeof unobserve === 'function') {
      cleanup = unobserve as StateUnsubscribe;
    } else {
      cleanup = undefined;
    }
  };
  const runCleanup = () => {
    cleanup?.();
    observer.destroy();
  };

  onCleanup(runCleanup);

  runEffect({ type: 'init', keys: [] });

  return runCleanup;
}

/**
 * Executes a function outside any observer context.
 * This function temporarily removes the current observer context,
 * executes the provided function, and then restores the previous observer context.
 * It's useful for running code that shouldn't be tracked by the reactive system.
 *
 * @param fn - The function to execute outside of observer context
 */
export function untrack<R>(fn: () => R): R {
  const prevObserver = closure.get<StateObserver>(OBSERVER_SYMBOL);
  closure.set(OBSERVER_SYMBOL, undefined as never);

  if (typeof fn === 'function') {
    try {
      return fn();
    } catch (error) {
      captureStack.error.external('Unable to execute the outside of observer function', error as Error, untrack);
    } finally {
      closure.set(OBSERVER_SYMBOL, prevObserver);
    }
  } else {
    const error = new Error('Invalid argument.');
    captureStack.error.argument('The given argument is not a function', error, untrack);
  }

  return undefined as R;
}

/**
 * @deprecated This function is deprecated.
 * Sets the current observer context for state tracking.
 * This function is used internally to manage the observer stack during state derivation.
 *
 * @param observer - The observer to set as the current context
 * @returns A cleanup function that restores the previous observer context
 * @warning This is a low-level API designed for library authors or advanced use cases.
 */
export function setObserver(observer: StateObserver) {
  const currentObserver = closure.get<StateObserver>(OBSERVER_SYMBOL);
  const currentRestorer = closure.get<() => void>(OBSERVER_RESTORER_SYMBOL);

  // Make sure it handles duplicate observer such as when evaluated in React's strict mode.
  if (currentObserver === observer) return currentRestorer as () => void;

  let restored = false;

  const nextRestore = () => {
    if (!restored) {
      closure.set(OBSERVER_SYMBOL, currentObserver);
      closure.set(OBSERVER_RESTORER_SYMBOL, currentRestorer);
      restored = true;
    }
  };

  closure.set(OBSERVER_SYMBOL, observer);
  closure.set(OBSERVER_RESTORER_SYMBOL, nextRestore);

  return nextRestore;
}

/**
 * Gets the current observer context.
 *
 * @returns The current observer or undefined if none is set
 * @warning This is a low-level API designed for library authors or advanced use cases.
 */
export function getObserver(): StateObserver | undefined {
  return closure.get(OBSERVER_SYMBOL);
}

/**
 * Creates a new observer instance for tracking state changes.
 * An observer manages subscriptions and provides lifecycle hooks for state tracking.
 *
 * @param onChange - Callback function that will be called when state changes occur
 * @param onTrack - Callback function that will be called when a new state is tracked
 * @param controlled - A flag indicating whether the observer is controlled by the user
 * @returns A new observer instance with states management, onChange handler, onDestroy hook, and cleanup functionality
 * @warning This is a low-level API designed for library authors or advanced use cases.
 */
export function createObserver(
  onChange: (event: StateChange) => void,
  onTrack?: (state: Linkable, key: KeyLike) => void,
  controlled?: boolean
): StateObserver {
  let observedSize = 0;
  let isObserving = false;
  let isDestroyed = false;

  const states = new WeakMap();
  const cleaners = new Set<() => void>();
  const resetters = new Set<() => void>();

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
    if (isDestroyed) return;

    const currentCleaners = Array.from(cleaners);

    for (const clear of currentCleaners) {
      if (typeof clear === 'function') {
        clear();
      }
    }

    observedSize = 0;
    cleaners.clear();
    resetters.clear();

    isDestroyed = true;
  };

  const reset = () => {
    resetters.forEach((reset) => {
      if (typeof reset === 'function') {
        reset();
      }
    });
  };

  const assign = ((init, observers) => {
    if (!observers.has(observer)) {
      observers.add(observer);

      cleaners.add(() => {
        states.delete(init);
        observers.delete(observer);
        getDevTool()?.onUntrack?.(META_REGISTRY.get(init) as StateMetadata, observer);
      });
    }

    if (!states.has(init)) {
      const keys = new Set();
      states.set(init, keys);

      resetters.add(() => {
        keys.clear();
      });

      if (ANCHOR_SETTINGS.safeObservation) {
        observedSize += 1;

        if (observedSize > ANCHOR_SETTINGS.safeObservationThreshold) {
          const error = new Error('Observation limit exceeded.');
          captureStack.violation.general(
            'Unsafe observation detected:',
            `Attempted to observe too many (${observedSize}) states within a single observer.`,
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
    isObserving = true;
    isDestroyed = false;

    const prevObserver = closure.get<StateObserver>(OBSERVER_SYMBOL);
    closure.set(OBSERVER_SYMBOL, observer);

    try {
      return fn();
    } finally {
      closure.set(OBSERVER_SYMBOL, prevObserver);
      isObserving = false;
    }
  };

  const propagate = (event: StateChange) => {
    if (isObserving) {
      const error = new Error('Circular mutation.');
      captureStack.violation.general(
        'Circular mutation detected:',
        `Attempted to mutate a state while observing the state itself.`,
        error,
        [
          'Circular state mutation is highly discouraged as it can lead to infinite loops and unpredictable behavior.',
          '- This happens when you mutate a reactive property inside a function that’s tracking that same property.',
          '- To prevent this, avoid mutating properties that you depend on inside an observer, or use the "untrack" utility to mark the read as non-reactive.',
        ],
        propagate
      );

      return;
    }

    onChange(event);
  };

  if (!controlled) {
    onCleanup(destroy);
  }

  const observer = {
    id: shortId(),
    get states() {
      return states;
    },
    get onChange() {
      return propagate;
    },
    get destroy() {
      return destroy;
    },
    get reset() {
      return reset;
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
 * @warning This is a low-level API designed for library authors or advanced use cases.
 */
export function withinObserver<R>(fn: () => R, observer: StateObserver): R;
export function withinObserver<R>(observer: StateObserver, fn: () => R): R;
export function withinObserver<R>(observerOrFn: StateObserver | (() => R), fnOrObserver: (() => R) | StateObserver): R {
  if (isFunction(observerOrFn)) return withinObserver(fnOrObserver as StateObserver, observerOrFn);

  const restore = setObserver(observerOrFn);
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

  restore?.();

  return result as R;
}

/**
 * @deprecated Use {@link untrack} instead
 */
export const outsideObserver = untrack;

const TRACKER_SYMBOL = Symbol('state-tracker');
const TRACKER_RESTORE_SYMBOL = Symbol('state-tracker-restore');

/**
 * Sets the current tracker function for state observation.
 * This function manages the tracker stack, allowing for nested tracker contexts.
 * If the same tracker is already set, it returns the existing restore function.
 *
 * A tracker is meant for library author to implement global tracking, which
 * then they control how they track the state.
 *
 * @param tracker - The tracker function to set as current
 * @returns A restore function that reverts to the previous tracker when called
 * @warning This is a low-level API designed for library authors or advanced use cases.
 */
export function setTracker(tracker: StatePublicTracker) {
  const currentTracker = closure.get<StatePublicTracker>(TRACKER_SYMBOL);
  const currentTrackerRestore = closure.get<() => void>(TRACKER_RESTORE_SYMBOL);

  if (currentTracker === tracker) return currentTrackerRestore;

  let restored = false;

  const nextRestore = () => {
    if (!restored) {
      closure.set(TRACKER_SYMBOL, currentTracker);
      closure.set(TRACKER_RESTORE_SYMBOL, currentTrackerRestore);
      restored = true;
    }
  };

  closure.set(TRACKER_SYMBOL, tracker);
  closure.set(TRACKER_RESTORE_SYMBOL, nextRestore);

  return nextRestore;
}

/**
 * Gets the current tracker function for state observation.
 * This function returns the currently active tracker, which is used to monitor
 * state changes and dependencies during reactive computations.
 *
 * @returns The current tracker function or undefined if no tracker is set
 * @warning This is a low-level API designed for library authors or advanced use cases.
 */
export function getTracker(): StatePublicTracker | undefined {
  return closure.get<StatePublicTracker>(TRACKER_SYMBOL);
}

/**
 * Tracks a state change by invoking the current tracker function if one is set.
 * This function is used internally by the reactive system to notify observers
 * about state changes and their dependencies.
 *
 * @param init - The initial state value that is being tracked
 * @param observers - A collection of observers that are watching this state
 * @param key - The key or property identifier for the state change
 * @warning This is a low-level API designed for library authors or advanced use cases.
 */
export function track(init: Linkable, observers: StateObserverList, key: KeyLike) {
  const currentTracker = closure.get<StatePublicTracker>(TRACKER_SYMBOL);
  if (typeof currentTracker !== 'function') return;
  currentTracker(init, observers, key);
}
