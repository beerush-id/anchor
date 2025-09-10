import { useCallback, useEffect, useRef, useState } from 'react';
import { anchor, captureStack, softClone, softEqual } from '@anchor/core';
import { useMicrotask } from './hooks.js';
import type { ConstantRef, RefInitializer, RefUpdater, StateRef, VariableRef } from './types.js';
import { CLEANUP_DEBOUNCE_TIME } from './constant.js';

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

    state.value = value;
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
      const newDeps = needUpdate(initRef.deps, softClone(Array.isArray(constantDeps) ? constantDeps : []));

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

  useEffect(() => {
    cancelCleanup();

    return () => {
      cleanup(() => {
        anchor.destroy(state);
      });
    };
  }, []);

  if (constant === true) {
    return [stateRef];
  }

  return [stateRef, update];
}

export function useConstant<T>(init: T) {
  return useVariable(init, true);
}

const needUpdate = (prev: unknown[], next: unknown[]): unknown[] | undefined => {
  if (prev.length !== next.length) return next;
  for (let i = 0; i < prev.length; i++) {
    if (!softEqual(prev[i], next[i], true)) return next;
  }
};
