import { useEffect, useMemo, useRef, useState } from 'react';
import { anchor, derive, type Immutable, type Linkable, type ObjLike, outsideObserver, type State } from '@anchor/core';
import type { TransformFn, TransformSnapshotFn } from './types.js';
import { useObserverRef } from './observable.js';
import { RENDERER_INIT_VERSION } from './constant.js';
import { depsChanged } from './utils.js';

/**
 * React hook that allows you to derive a computed value from a reactive state.
 * It automatically re-computes the value whenever the dependent state change.
 *
 * @param transform - A function that receives the current state and its snapshot, and returns the computed value.
 * @param [deps] - An optional array of dependencies that specify the state and mutations that the computed value depends on.
 */
export function useDerived<R, D extends unknown[] = unknown[]>(transform: TransformFn<R>, deps?: D): R {
  const [observer, version] = useObserverRef();
  return useMemo(() => {
    return observer.run(() => {
      return transform();
    }) as R;
  }, [version, ...(deps ?? [])]);
}

export function usePicker<T extends State, K extends keyof T>(state: T, keys: K[]): { [key in K]: T[key] } {
  const [init, values] = pickValues(state, keys);
  const cached = useMemo(() => init, values);
  const output = anchor(cached);

  useEffect(() => {
    return derive(
      state,
      (newValue, event) => {
        if (event.type !== 'init') {
          const key = event.keys.join('.') as K;
          if (keys.includes(key)) {
            output[key] = newValue[key];
          }
        }
      },
      false
    );
  }, [output]);

  return output;
}

export function useValue<T extends State, K extends keyof T>(state: T, key: K) {
  const [version, setVersion] = useState(RENDERER_INIT_VERSION);
  const current = useMemo(() => {
    return state?.[key];
  }, [state, key, version]);

  useEffect(() => {
    if (typeof state !== 'object' || state === null) return;

    return derive(
      state,
      (next, event) => {
        if (event.type !== 'init' && event.keys.join('.') === key) {
          setVersion((c) => c + 1);
        }
      },
      false
    );
  }, [state, key]);

  return current;
}

export function useValueIs<T extends State, K extends keyof T>(state: T, key: K, expect: unknown): boolean {
  const depsRef = useRef(new Set([state, key, expect]));
  const updateRef = useRef(false);
  const compareRef = useRef(state?.[key] === expect);
  const [, setVersion] = useState(RENDERER_INIT_VERSION);

  if (updateRef.current) {
    const updatedDeps = depsChanged(depsRef.current, [state, key, expect]);

    if (updatedDeps) {
      depsRef.current = updatedDeps;
      compareRef.current = state?.[key] === expect;
    }
  } else {
    updateRef.current = true;
  }

  useEffect(() => {
    if (typeof state !== 'object' || state === null) return;

    return derive(
      state,
      (_, event) => {
        if (event.type !== 'init' && event.keys.join('.') === key) {
          const next = state[key] === expect;
          if (next !== compareRef.current) {
            updateRef.current = false;
            compareRef.current = next;
            setVersion((c) => c + 1);
          }
        }
      },
      false
    );
  }, [state, key, expect]);

  return compareRef.current;
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

export function useDerivedRef<T extends State>(state: T): Immutable<T>;
export function useDerivedRef<T extends State, R>(state: T, transform?: TransformSnapshotFn<T, R>): R;
/**
 * React hook that derives an underlying object of a reactive state.
 * It returns the underlying object of the state, or the result of applying a transform function to the underlying
 * object.
 *
 * This hook doesn't react to state changes. It's only re-compute if the state itself that changed.
 *
 * @template T - The type of the reactive state.
 * @template R - The type of the transformed value.
 * @param {T} state - A reactive state from which to derive the underlying object.
 * @param {TransformSnapshotFn<T, R>} [transform] - An optional function that receives the state snapshot and returns the transformed value.
 * @returns {R} The snapshot of the state, or the result of applying the transform function to the snapshot.
 */
export function useDerivedRef<T extends State, R>(state: T, transform?: TransformSnapshotFn<T, R>): R {
  return useMemo(() => {
    const value = anchor.get(state);
    return transform ? transform(value) : value;
  }, [state]) as R;
}

function pickValues<T extends State>(state: T, keys: (keyof T)[]) {
  const values = [] as T[keyof T][];
  const result = {} as T;

  for (const key of keys) {
    values.push(state[key]);
    result[key] = state[key];
  }

  return [result, values] as const;
}
