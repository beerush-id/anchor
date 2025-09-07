import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import {
  anchor,
  createDebugger,
  createObserver,
  getDebugger,
  type Linkable,
  microtask,
  type ObjLike,
  type StateObserver,
} from '@anchor/core';
import { DEV_MODE, STRICT_MODE } from './dev.js';
import { CLEANUP_DEBOUNCE_TIME, RENDERER_INIT_VERSION } from './constant.js';
import { depsChanged } from './utils.js';
import { useMicrotask } from './hooks.js';

/**
 * `useObserverRef` is a custom React hook that provides a stable `StateObserver` instance
 * and a version counter for triggering re-renders. It's designed to manage the lifecycle
 * of an observer in a React component, especially considering React's Strict Mode.
 *
 * The observer tracks changes in reactive dependencies and notifies the component to re-render.
 * It handles dependency updates and ensures the observer is properly destroyed on unmount.
 *
 * @param deps An optional array of `Linkable` dependencies. Changes in these dependencies
 *             will cause the observer to be re-established.
 * @param displayName An optional name for the observer, useful for debugging.
 * @returns A tuple containing:
 *          - `StateObserver`: The observer instance used for tracking.
 *          - `number`: A version counter that increments on state changes, forcing re-renders.
 */
export function useObserverRef(deps: Linkable[] = [], displayName?: string): [StateObserver, number] {
  const [cleanup, cancelCleanup] = useRef(microtask(CLEANUP_DEBOUNCE_TIME)).current;
  const [version, setVersion] = useState(RENDERER_INIT_VERSION);

  // Creates an observer instance to be used as a tracking context.
  // It's used to track changes to the state and trigger re-renders.
  // The observer should be only created once during the component setup.
  const [observer] = useState(() => {
    const current = createObserver(
      () => {
        // Trigger re-render when there is a change notification from the reactive system.
        setVersion((prev) => prev + 1);
      },
      DEV_MODE
        ? (init, key) => {
            debug?.check('Observer tracking:', true, key, init);
          }
        : undefined
    );

    current.name = displayName ?? '(ANON)';
    return current;
  });

  if (!DEV_MODE) {
    // In production, we rely on React's memo to handle cleanup during render phase when
    // there is a change in the dependencies. Check the @IMPORTANT note below for details
    // why this step is necessary.
    useMemo(() => {
      observer.destroy();
    }, deps);

    // In production, observer will be permanently destroyed only in the cleanup phase (unmount).
    useEffect(() => {
      // Cancel the pending cleanup if the effect re-runs after the cleanup phase.
      // This means that the cleanup phase is not actually unmount but a re-render.
      cancelCleanup();

      return () => {
        // Schedule the cleanup to allow cancellation of the cleanup phase.
        // This is necessary because effect will re-run when the component tree is changed.
        // The true cleanup (unmount) is when the effect not re-run after the cleanup phase executed.
        cleanup(() => {
          observer.destroy();
        });
      };
    }, []);

    return [observer, version];
  }

  // -- BEGIN_DEV_MODE -- //
  // Dedicated logics to handle observer in development mode,
  // respecting the strict-mode and fast-refresh (HMR).
  const debug = createDebugger('[useObserverRef]', getDebugger());
  const [stableQueue] = useRef(microtask(0)).current;
  const depsRef = useRef<Set<Linkable>>(null);
  const stableRef = useRef(!STRICT_MODE);

  useEffect(() => {
    stableQueue(() => {
      // Schedule to mark the observer as stable.
      // This step to make sure it's survive in the strict-mode.
      stableRef.current = true;
      cancelCleanup();
      debug.check('Observer is stable:', stableRef.current, observer.name);
    });

    return () => {
      debug.check('Observer is stable?', stableRef.current, observer.name);
      // Should destroy the observer only when the component is unmounted.
      // It prevents the strict-mode to destroy it on the second render.
      if (stableRef.current) {
        cleanup(() => {
          debug.ok('Observer destroyed:', observer.name);
          observer.destroy();
        });
      }
    };
  }, []);

  /**
   * Store the dependency reference when the observer is stable (mounted, strict-mode complete).
   * @IMPORTANT: Dependency changes are handled in the render phase (not in an effect) to ensure
   * proper reactivity. If observer destruction happened in an effect, it would clean up the
   * active observation maps after render, causing reactivity to fail.
   **/
  if (stableRef.current) {
    if (depsRef.current) {
      // Check if the dependencies have changed.
      const newDeps = depsChanged(depsRef.current, deps);
      debug.check('Observer need update?', newDeps as never, observer.name);

      if (newDeps) {
        // Update the dependencies and destroy the observer to establish a new observations.
        depsRef.current = newDeps as never;
        observer.destroy();
        debug.ok('Observer updated:', observer.name);
      }
    } else {
      // Store the dependencies
      depsRef.current = new Set<Linkable>(deps);
    }
  }

  return [observer, version];
  // -- END_DEV_MODE -- //
}

/**
 * `useObserved` is a custom React hook that allows you to create a reactive computation
 * that automatically re-runs when its observed dependencies change.
 *
 * It combines the power of `useObserverRef` and React's `useMemo` to create a memoized
 * value that updates whenever any reactive dependencies accessed within the `transform`
 * function change. This ensures efficient re-computation only when necessary.
 *
 * @template R The type of the value returned by the transform function.
 * @template D An optional tuple type representing the additional dependencies.
 * @param observe A function that performs the computation. Any reactive state
 *                  accessed within this function will be automatically tracked,
 *                  and the function will re-run when that state changes.
 * @param deps An optional array of additional dependencies. If any of these
 *             dependencies change (using React's default shallow comparison),
 *             the transform function will re-run. This is useful for incorporating
 *             non-reactive values into the computation.
 * @returns The result of the transform function. This value is memoized and will
 *          only be recomputed when its reactive dependencies or additional deps change.
 */
export function useObserved<R, D extends unknown[]>(observe: () => R, deps?: D) {
  const [observer, version] = useObserverRef();
  return useMemo(() => {
    return observer.run(() => {
      return observe();
    }) as R;
  }, [version, ...(deps ?? [])]);
}

/**
 * `useReactiveRef` is a custom React hook that creates a mutable ref object
 * whose `current` property is reactive. It allows you to define a transformation
 * function that will be re-executed whenever any reactive dependencies accessed
 * within it change, automatically updating the ref's value.
 *
 * This hook is useful for scenarios where you need a mutable reference that
 * automatically updates based on reactive state, similar to how `useRef` works
 * but with added reactivity.
 *
 * The `observe` function is run within an observer context, meaning any reactive
 * state accessed inside it will be registered as dependencies and will cause the
 * ref to update when the reactive state changes.
 *
 * @template T The type of the value held by the ref.
 * @param init The initial value for the ref. Can be `null`.
 * @param observe A function that takes the current (or initial) value and returns
 *                  the new value for the ref. This function is run reactively.
 *                  Any reactive dependencies accessed within it will cause the ref
 *                  to update.
 * @returns A mutable `RefObject` object whose `current` property is reactive.
 */
export function useObservedRef<T>(init: T | null, observe: (value: T | null) => T | null): RefObject<T | null> {
  const valueRef = useRef(init);
  const [cleanup, cancelCleanup] = useMicrotask(CLEANUP_DEBOUNCE_TIME);
  const [observer] = useState(() => {
    return createObserver(() => {
      valueRef.current = createValue(valueRef.current) ?? valueRef.current;
    });
  });

  const createValue = (next: T | null) => {
    return observer.run(() => {
      return observe(next);
    }) as T | null;
  };

  useEffect(() => {
    cancelCleanup();

    return () => {
      cleanup(() => {
        observer.destroy();
      });
    };
  }, [init]);

  return {
    get current() {
      return valueRef.current;
    },
    set current(next) {
      observer.destroy();
      valueRef.current = createValue(next) ?? valueRef.current;
    },
  };
}

/**
 * React hook that derives a list of objects with their index as keys from a reactive array state.
 * Each item in the returned array contains a **key** (the index) and a **value** property.
 *
 * @template T - The type of the reactive array state.
 * @param {T} state - A reactive array state from which to derive the list.
 * @returns An array of objects with index keys and corresponding values.
 */
export function useObservedList<T extends ObjLike[]>(state: T): Array<{ key: number; value: T[number] }>;

/**
 * React hook that derives a list of objects with custom keys from a reactive array state.
 * Each item in the returned array contains a **key** (derived from the specified property) and a **value** property.
 *
 * @template T - The type of the reactive array state.
 * @template K - The type of the key property.
 * @param {T} state - A reactive array state from which to derive the list.
 * @param {K} key - A property name to use as the key for each item in the list.
 * @returns An array of objects with custom keys and corresponding values.
 */
export function useObservedList<T extends ObjLike[], K extends keyof T[number]>(
  state: T,
  key: K
): Array<{ key: T[number][K]; value: T[number] }>;

/**
 * React hook that derives a list of objects with their keys from a reactive array state.
 * Each item in the returned array contains a **key** and a **value** property.
 * If no key is specified, the index of each item in the array is used as the key.
 *
 * @template T - The type of the reactive array state.
 * @template K - The type of the key property.
 * @param {T} state - A reactive array state from which to derive the list.
 * @param {K} [key] - An optional property name to use as the key for each item in the list.
 */
export function useObservedList<T extends ObjLike[], K extends keyof T[number]>(
  state: T,
  key?: K
): Array<{ key: T[number][K]; value: T[number] }> {
  const [observer, version] = useObserverRef();
  return useMemo(() => {
    return observer.run(() => {
      if (!key) {
        return state.map((value, key) => ({ key, value }));
      }

      const snap = anchor.get(state);
      return state.map((value, i) => ({ key: snap[i][key], value }));
    }) as Array<{ key: T[number][K]; value: T[number] }>;
  }, [version, state, key]);
}
