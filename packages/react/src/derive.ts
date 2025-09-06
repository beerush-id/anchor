import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import {
  anchor,
  BATCH_MUTATION_KEYS,
  type BatchMutation,
  captureStack,
  derive,
  type KeyLike,
  type Linkable,
  type ObjLike,
  outsideObserver,
  type State,
  type StateChange,
} from '@anchor/core';
import type { TransformFn, TransformSnapshotFn } from './types.js';
import { useObserverRef } from './observable.js';
import { CLEANUP_DEBOUNCE_TIME, RENDERER_INIT_VERSION } from './constant.js';
import { depsChanged, pickValues } from './utils.js';
import { useMicrotask } from './hooks.js';

/**
 * React hook that allows you to derive a computed value from a reactive state.
 * It automatically re-computes the value whenever the dependent state change.
 *
 * @param state - The reactive state to derive from.
 * @param recursive - Whether to recursively derive the computed value.
 */
export function useDerived<T extends Linkable>(state: T, recursive?: boolean): T;
/**
 * React hook that allows you to derive a computed value from a reactive state.
 * It automatically re-computes the value whenever the dependent state change.
 *
 * @param state - The reactive state to derive from.
 * @param transform - A function that receives the current value, and returns the computed value.
 */
export function useDerived<T extends Linkable, R>(state: T, transform: TransformFn<T, R>): R;
export function useDerived<T extends Linkable, R>(state: T, transformRecursive?: TransformFn<T, R> | boolean): T | R {
  const [version, setVersion] = useState(RENDERER_INIT_VERSION);
  const value = useMemo(() => {
    const current = anchor.has(state) ? anchor.get(state) : state;
    return typeof transformRecursive === 'function' ? transformRecursive(current) : current;
  }, [state, version]);

  useEffect(() => {
    if (!anchor.has(state)) {
      const error = new Error('State is not reactive.');
      captureStack.violation.derivation('Attempted to derive from a non-reactive state.', error);
      return;
    }

    return derive(
      state,
      (_, event) => {
        if (event.type !== 'init') {
          setVersion((c) => c + 1);
        }
      },
      typeof transformRecursive === 'boolean' ? transformRecursive : false
    );
  }, [state]);

  return value as T | R;
}

/**
 * React hook that creates a derivation pipe between a source and target reactive state.
 * Changes from the source state are automatically piped to the target state.
 * An optional transform function can be used to modify the data during the pipe operation.
 *
 * @template T - The type of the source reactive state.
 * @template R - The type of the target reactive state.
 * @param {T} source - The source reactive state to pipe from.
 * @param {R} target - The target reactive state to pipe to.
 * @param {TransformFn<T, R>} [transform] - Optional function to transform the data during piping.
 * @returns {void}
 */
export function usePipe<T extends State, R extends State>(source: T, target: R, transform?: TransformFn<T, R>) {
  useEffect(() => {
    if (!source || !target) return;
    return derive.pipe(source, target, transform);
  }, [source, target]);
}

/**
 * React hook that creates a bidirectional binding between two reactive states.
 * Changes from either state are automatically synchronized to the other state.
 * Optional transform functions can be used to modify the data during the synchronization.
 *
 * @template T - The type of the left reactive state.
 * @template R - The type of the right reactive state.
 * @param {T} left - The left reactive state to bind.
 * @param {R} right - The right reactive state to bind.
 * @param {TransformFn<T, R>} [transformLeft] - Optional function to transform data from left to right.
 * @param {TransformFn<R, T>} [transformRight] - Optional function to transform data from right to left.
 * @returns {void}
 */
export function useBind<T extends State, R extends State>(
  left: T,
  right: R,
  transformLeft?: TransformFn<T, R>,
  transformRight?: TransformFn<R, T>
) {
  useEffect(() => {
    return derive.bind(left, right, transformLeft, transformRight);
  }, [left, right]);
}

/**
 * React hook that allows you to inherit specific properties from a reactive state object.
 * It returns a new object containing only the specified keys and their values.
 * The returned object is reactive and will update when the source state changes.
 *
 * @template T - The type of the reactive state object.
 * @template K - The type of keys being picked from the state.
 * @param {T} state - The reactive state object to pick values from.
 * @param {K[]} picks - An array of keys to pick from the state object.
 * @returns {{ [key in K]: T[key] }} - A new reactive object containing only the picked properties.
 */
export function useInherit<T extends State, K extends keyof T>(state: T, picks: K[]): { [key in K]: T[key] } {
  const [init, values] = pickValues(state, picks);
  const cached = useMemo(() => init, values);
  const output = anchor(cached);

  useEffect(() => {
    if (!anchor.has(state)) {
      const error = new Error('State is not reactive.');
      captureStack.violation.derivation('Attempted to pick values from a non-reactive state.', error);
      return;
    }

    return derive(
      state,
      (newValue, event) => {
        if (event.type !== 'init') {
          const keys = mutationKeys(event) as K[];
          keys.forEach((key) => {
            if (picks.includes(key)) {
              output[key] = newValue[key];
            }
          });
        }
      },
      false
    );
  }, [output]);

  return output;
}

/**
 * React hook that derives a specific property value from a reactive state object.
 * It automatically re-computes the value whenever the dependent state property changes.
 *
 * @template T - The type of the reactive state object.
 * @template K - The type of the key being derived.
 * @param {T} state - The reactive state object to derive from.
 * @param {K} key - The key of the property to derive from the state object.
 * @returns {T[K]} - The derived value of the specified property.
 */
export function useValue<T extends State, K extends keyof T>(state: T, key: K): T[K] {
  const [version, setVersion] = useState(RENDERER_INIT_VERSION);
  const current = useMemo(() => {
    return state?.[key];
  }, [state, key, version]);

  useEffect(() => {
    if (!anchor.has(state)) {
      const error = new Error('State is not reactive.');
      captureStack.violation.derivation('Attempted to derive value from a non-reactive state.', error);
      return;
    }

    return derive(
      state,
      (next, event) => {
        if (isMutationOf(event, key)) {
          setVersion((c) => c + 1);
        }
      },
      false
    );
  }, [state, key]);

  return current;
}

/**
 * React hook that checks if a specific property of a reactive state equals an expected value.
 * It automatically re-evaluates the comparison whenever the dependent state changes.
 *
 * @template T - The type of the reactive state object.
 * @template K - The type of the key being checked.
 * @param {T} state - The reactive state object to check.
 * @param {K} key - The key of the property to check in the state object.
 * @param {unknown} expect - The expected value to compare against.
 * @returns {boolean} - Returns true if the property value equals the expected value, false otherwise.
 */
export function useValueIs<T extends State, K extends keyof T>(state: T, key: K, expect: unknown): boolean {
  const ref = useRef({
    deps: new Set([state, key, expect]),
    matched: state?.[key] === expect,
    checkDeps: false,
  }).current;
  const [cleanup, cancelCleanup] = useMicrotask(CLEANUP_DEBOUNCE_TIME);
  const [, setVersion] = useState(RENDERER_INIT_VERSION);

  if (ref.checkDeps) {
    const updatedDeps = depsChanged(ref.deps, [state, key, expect]);

    if (updatedDeps) {
      ref.deps.clear(); // Cleanup the previous deps to allow for garbage collection.
      ref.deps = updatedDeps;
      ref.matched = state?.[key] === expect;
    }
  } else {
    ref.checkDeps = true;
  }

  useEffect(() => {
    if (!anchor.has(state)) {
      const error = new Error('State is not reactive.');
      captureStack.violation.derivation('Attempted to compare value from a non-reactive state.', error);
      return;
    }

    cancelCleanup();

    const unsubscribe = derive(
      state,
      (_, event) => {
        if (isMutationOf(event, key)) {
          const next = state[key] === expect;

          if (next !== ref.matched) {
            ref.matched = next;
            ref.checkDeps = false;

            setVersion((c) => c + 1);
          }
        }
      },
      false
    );

    return () => {
      unsubscribe();

      cleanup(() => {
        ref.deps.clear();
      });
    };
  }, [state, key, expect]);

  return ref.matched;
}

export function useDerivedList<T extends ObjLike[]>(state: T): Array<{ key: number; value: T[number] }>;
export function useDerivedList<T extends ObjLike[], K extends keyof T[number]>(
  state: T,
  key: K
): Array<{ key: T[number][K]; value: T[number] }>;
/**
 * React hook that derives a list of objects with their keys from a reactive array state.
 * Each item in the returned array contains a **key** and a **value** property.
 * If no key is specified, the index of each item in the array is used as the key.
 *
 * @template T - The type of the reactive array state.
 * @param {T} state - A reactive array state from which to derive the list.
 * @param {(keyof T[number]) | number} [key] - An optional property name to use as the key for each item in the list.
 */
export function useDerivedList<T extends ObjLike[], K extends keyof T[number]>(
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

export function useSnapshot<T extends Linkable>(state: T): T;
export function useSnapshot<T extends Linkable, R>(state: T, transform: TransformSnapshotFn<T, R>): R;
/**
 * React hook that allows you to derive a computed value from a reactive state without an explicit observer.
 * It re-computes the value whenever the state changes.
 *
 * @warning This hook subscribes to ALL changes on the state object and creates a snapshot on every update,
 * making it less efficient than `useDerived` for fine-grained reactivity. Only use this hook when you need
 * to react to all changes or when working with non-observable properties.
 *
 * @param state - A reactive state from which to derive the computed value.
 * @param transform - An optional function that receives the current state snapshot and returns the computed value. If not provided, the state snapshot itself is returned.
 */
export function useSnapshot<T extends Linkable, R>(state: T, transform?: TransformSnapshotFn<T, R>): T | R {
  const [version, setVersion] = useState(1);
  const value = useMemo(() => {
    return outsideObserver(() => {
      if (typeof transform === 'function') {
        return transform(anchor.snapshot(state));
      }

      return anchor.snapshot(state);
    }) as T | R;
  }, [state, version]);

  useEffect(() => {
    return derive(state, (_, event) => {
      if (event.type !== 'init') {
        setVersion((prev) => prev + 1);
      }
    });
  }, [state]);

  return value;
}

/**
 * React hook that creates a derived reference from a reactive state.
 * The handle function is called whenever the state changes, receiving the current state and the current ref value.
 * The hook returns a RefObject that can be used to get or set the current ref value.
 * When the ref value is set, the handle function is called with the current state and the new ref value.
 *
 * @template S - The type of the reactive state.
 * @template R - The type of the ref value.
 * @param {S} state - The reactive state to derive from.
 * @param {(current: S, ref: R | null) => void} handle - The function to call when the state changes or the ref value is set.
 * @returns {RefObject<R | null>} - A RefObject that can be used to get or set the current ref value.
 */
export function useDerivedRef<S extends State, R>(
  state: S,
  handle: (current: S, ref: R | null) => void
): RefObject<R | null> {
  const valueRef = useRef<R>(null);

  useEffect(() => {
    return derive(state, () => {
      handle(anchor.read(state) as S, valueRef.current);
    });
  }, [state]);

  return {
    get current() {
      return valueRef.current;
    },
    set current(next) {
      valueRef.current = next;
      handle(anchor.read(state) as S, valueRef.current);
    },
  };
}

/**
 * Checks if a state change event is a mutation of a specific key.
 *
 * @param event - The state change event.
 * @param key - The key to check for mutation.
 */
export function isMutationOf(event: StateChange, key: KeyLike) {
  if (event.type === 'init') return false;
  return mutationKeys(event).includes(key as string);
}

/**
 * Extracts the keys that were mutated in a state change event.
 *
 * @param event - The state change event.
 * @returns An array of keys that were mutated.
 */
export function mutationKeys(event: StateChange) {
  if (BATCH_MUTATION_KEYS.has(event.type as BatchMutation)) {
    return Object.keys(event.prev ?? {});
  }

  // Only expect one key (single level) for non-batch mutations.
  return event.keys.slice(0, 1);
}
