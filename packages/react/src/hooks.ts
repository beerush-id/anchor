import { useMemo, useRef, useState } from 'react';
import { anchor, type Linkable, microbatch, microtask, outsideObserver, shortId } from '@anchor/core';
import { depsChanged } from './utils.js';
import type { TransformSnapshotFn } from './types.js';

/**
 * A React hook that generates a short, unique identifier string.
 *
 * This hook uses the **shortId** function from the Anchor core library
 * to generate a unique ID that remains stable across re-renders.
 *
 * @returns The generated short ID string.
 */
export function useShortId() {
  const [id] = useState(() => {
    return shortId();
  });
  return id;
}

/**
 * A React hook that creates a ref with a custom setter handler.
 *
 * This hook returns a ref-like object that allows you to intercept and modify
 * the value being set through a handler function. The handler function is called
 * whenever the current property is set, enabling you to apply custom logic
 * (e.g., validation, transformation) before updating the ref's value.
 *
 * @template T - The type of the value stored in the ref.
 * @param init - The initial value for the ref.
 * @param handler - A function that processes the value before it's set.
 *                  It receives the new value and returns the value to be stored.
 * @returns A ref-like object with a custom setter.
 */
export function useRefTrap<T>(init: T | null, handler: (value: T | null) => T | null) {
  const ref = useRef(init);

  return useMemo(() => {
    return {
      get current() {
        return ref.current;
      },
      set current(value) {
        ref.current = handler(value);
      },
    };
  }, [ref]);
}

/**
 * A React hook that provides a microtask function with an optional timeout.
 *
 * This hook uses the **microtask** utility from the Anchor core library to create
 * a function that executes a callback in a microtask.
 * The created microtask function is memoized using **useRef** to ensure it remains
 * stable across re-renders.
 *
 * @param timeout - An optional timeout in milliseconds after which the callback
 *                  will be executed.
 * @returns A memoized microtask function.
 */
export function useMicrotask(timeout?: number) {
  return useRef(microtask(timeout)).current;
}

/**
 * A React hook that provides a microbatch function with an optional delay.
 *
 * This hook uses the **microbatch** utility from the Anchor core library to create
 * a function that executes a callback in a microtask with batching capabilities.
 * The created microbatch function is memoized using **useRef** to ensure it remains
 * stable across re-renders.
 *
 * @param delay - An optional delay in milliseconds after which the batched callbacks
 *                will be executed.
 * @returns A memoized microbatch function.
 */
export function useMicrobatch(delay?: number) {
  return useRef(microbatch(delay)).current;
}

/**
 * A React hook that provides a stable reference to a value, updating only when specified dependencies change.
 *
 * This hook ensures that the returned reference object remains stable across re-renders,
 * only updating its value and dependencies when the provided dependencies change.
 * It supports both direct values and factory functions for initialization.
 *
 * @template T - The type of the value stored in the ref.
 * @param init - The initial value or a factory function that returns the initial value.
 * @param deps - An array of dependencies that, when changed, will trigger an update of the ref's value.
 * @returns A stable reference object containing the current value and a Set of dependencies.
 */
export function useStableRef<T>(init: T | (() => T), deps: unknown[]) {
  const stableRef = useRef({
    deps: new Set(deps),
    value: typeof init === 'function' ? (init as () => T)() : init,
    stable: false,
  }).current;

  if (stableRef.stable) {
    const updatedDeps = depsChanged(stableRef.deps, deps);

    if (updatedDeps) {
      stableRef.deps = updatedDeps;
      stableRef.value = typeof init === 'function' ? (init as () => T)() : init;
    }
  } else {
    stableRef.stable = true;
  }

  return stableRef;
}

/**
 * React hook that creates a snapshot of a reactive state.
 * The snapshot is a plain object that reflects the current state at the time of creation.
 * It does not update automatically when the state changes.
 *
 * @template T - The type of the reactive state.
 * @param {T} state - The reactive state to create a snapshot from.
 * @returns {T} - A snapshot of the reactive state.
 */
export function useSnapshot<T extends Linkable>(state: T): T;

/**
 * React hook that creates a transformed snapshot of a reactive state.
 * The snapshot is a plain object that reflects the current state at the time of creation.
 * It does not update automatically when the state changes.
 * The transform function can be used to modify the snapshot before it is returned.
 *
 * @template T - The type of the reactive state.
 * @template R - The type of the transformed snapshot.
 * @param {T} state - The reactive state to create a snapshot from.
 * @param {TransformSnapshotFn<T, R>} transform - A function that transforms the snapshot before it is returned.
 * @returns {R} - A transformed snapshot of the reactive state.
 */
export function useSnapshot<T extends Linkable, R>(state: T, transform: TransformSnapshotFn<T, R>): R;

export function useSnapshot<T extends Linkable, R>(state: T, transform?: TransformSnapshotFn<T, R>): T | R {
  return useMemo(() => {
    return outsideObserver(() => {
      if (typeof transform === 'function') {
        return transform(anchor.snapshot(state));
      }

      return anchor.snapshot(state);
    }) as T | R;
  }, [state]);
}
