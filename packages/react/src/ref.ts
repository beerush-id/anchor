import { useCallback, useEffect, useRef, useState } from 'react';
import { anchor, captureStack, softClone, softEqual } from '@anchorlib/core';
import { useMicrotask } from './hooks.js';
import type { ConstantRef, RefInitializer, RefUpdater, StateRef, VariableRef } from './types.js';
import { CLEANUP_DEBOUNCE_TIME } from './constant.js';

const REF_REGISTRY = new WeakMap();

export function useVariable<T>(init: T): [VariableRef<T>, RefUpdater<T>];
export function useVariable<T>(init: T, constant: true): [ConstantRef<T>];
export function useVariable<T>(init: RefInitializer<T>, deps: unknown[]): [VariableRef<T>, RefUpdater<T>];
export function useVariable<T>(init: RefInitializer<T>, deps: unknown[], constant: true): [ConstantRef<T>];
export function useVariable<T>(
  init: T | RefInitializer<T>,
  constantDeps?: boolean | unknown[],
  constant?: boolean
): [VariableRef<T>, RefUpdater<T>] | [ConstantRef<T>] {
  if (constantDeps === true) constant = constantDeps;

  const [cleanup, cancelCleanup] = useMicrotask(CLEANUP_DEBOUNCE_TIME);
  const [state] = useState<StateRef<T>>(() => {
    return anchor({
      value: typeof init === 'function' ? (init as RefInitializer<T>)() : init,
    });
  });

  const update = useCallback((value: T) => {
    if (initRef.constant === true) {
      captureStack.violation.general(
        'Assignment violation detected:',
        'Attempted to modify the value of a constant.',
        new Error('Constant is read-only'),
        [
          'Constant value cannot be changed after created.',
          '- Constant only updated when its dependency changed.',
          '- Use variable if you need to update its value later.',
        ],
        Object.getOwnPropertyDescriptors(stateRef).value.set
      );
      return;
    }

    if (value === state.value) return;

    state.value = typeof initRef.init === 'function' ? (init as RefInitializer<T>)(value) : value;
  }, []);

  const initRef = useRef({
    init,
    deps: [] as unknown[],
    stable: false,
    constant,
  }).current;

  if (typeof init === 'function' && Array.isArray(constantDeps) && !initRef.deps.length) {
    initRef.deps = softClone(constantDeps);
  }

  const stateRef = useRef({
    get value() {
      return state.value;
    },
    set value(value: T) {
      update(value);
    },
  }).current;

  if (initRef.stable) {
    if (typeof initRef.init === 'function') {
      const newDeps = getNextDeps(initRef.deps, softClone(Array.isArray(constantDeps) ? constantDeps : []));

      if (newDeps) {
        state.value = (init as RefInitializer<T>)(state.value);
        initRef.deps = newDeps;
      }
    } else {
      if (initRef.constant !== constant) {
        initRef.constant = constant;
      }

      if (initRef.init !== init) {
        state.value = init as T;
        initRef.init = init;
      }
    }
  } else {
    initRef.stable = true;
  }

  REF_REGISTRY.set(stateRef, state);

  useEffect(() => {
    cancelCleanup();

    return () => {
      cleanup(() => {
        anchor.destroy(state);
        REF_REGISTRY.delete(stateRef);
      });
    };
  }, []);

  if (constant === true) {
    return [stateRef];
  }

  return [stateRef, update];
}

/**
 * Creates a constant reference that never changes its value.
 *
 * @template T - The type of the constant value
 * @param init - The initial value or initializer function
 * @returns A tuple containing the constant reference
 */
export function useConstant<T>(init: T): [ConstantRef<T>];

/**
 * Creates a constant reference that only updates when dependencies change.
 *
 * @template T - The type of the constant value
 * @param init - The initializer function that computes the constant value
 * @param deps - Dependency array that determines when the constant should be recalculated
 * @returns A tuple containing the constant reference
 */
export function useConstant<T>(init: RefInitializer<T>, deps: unknown[]): [ConstantRef<T>];

/**
 * Implementation of useConstant that creates a constant reference.
 *
 * @template T - The type of the constant value
 * @param init - The initial value or initializer function
 * @param deps - Optional dependency array for computed constants
 * @returns A tuple containing the constant reference
 */
export function useConstant<T>(init: T | RefInitializer<T>, deps?: unknown[]): [ConstantRef<T>] {
  return useVariable(init as RefInitializer<T>, deps as unknown[], true);
}

/**
 * Determines whether an update is needed by comparing previous and next dependency arrays.
 *
 * @param prev - The previous dependency array
 * @param next - The next dependency array
 * @returns The next array if an update is needed, otherwise undefined
 */
export function getNextDeps(prev: unknown[], next: unknown[]): unknown[] | undefined {
  if (prev.length !== next.length) return next;
  for (let i = 0; i < prev.length; i++) {
    if (!softEqual(prev[i], next[i], true)) return next;
  }
}

/**
 * Checks if a value is a reference (either variable or constant).
 *
 * @param value - The value to check
 * @returns True if the value is a reference, false otherwise
 */
export function isRef(value: unknown): value is VariableRef<unknown> | ConstantRef<unknown> {
  return REF_REGISTRY.has(value as WeakKey);
}

/**
 * Retrieves the internal state reference for a given reference.
 *
 * @template T - The type of the reference value
 * @param value - The reference (variable or constant) to get the state for
 * @returns The internal state reference if the input is a valid reference, otherwise returns the input as-is
 */
export function getRefState<T>(value: T): StateRef<T> {
  if (isRef(value)) return REF_REGISTRY.get(value as WeakKey);

  return value as StateRef<T>;
}
