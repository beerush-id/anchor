import { useEffect, useMemo, useRef, useState } from 'react';
import { useMicrotask } from './hooks.js';
import { CLEANUP_DEBOUNCE_TIME } from './constant.js';
import type { Action, ActionRef } from './types.js';
import { createObserver, type StateUnsubscribe } from '@anchorlib/core';

/**
 * Custom hook that manages an action with cleanup capabilities.
 *
 * This hook maintains a reference to a value and runs an action function whenever
 * the value changes. It automatically handles cleanup of the previous action
 * before running a new one, and also cleans up when the component unmounts.
 *
 * @template T - The type of the value being managed
 * @param action - A function that takes the current value and returns a cleanup function
 * @returns An object with getter and setter for the current value
 */
export function useAction<T>(action: Action<T>): ActionRef<T>;

/**
 * Custom hook that manages an action with cleanup capabilities.
 *
 * This hook maintains a reference to a value and runs an action function whenever
 * the value changes. It automatically handles cleanup of the previous action
 * before running a new one, and also cleans up when the component unmounts.
 *
 * @template T - The type of the value being managed
 * @param init - The initial value, can be null
 * @param action - A function that takes the current value and returns a cleanup function
 * @returns An object with getter and setter for the current value
 */
export function useAction<T>(init: T, action: Action<T>): ActionRef<T>;

export function useAction<T>(init: T | Action<T>, action?: Action<T>): ActionRef<T> {
  if (typeof init === 'function') action = init as Action<T>;

  const [cleanup, cancelCleanup] = useMicrotask(CLEANUP_DEBOUNCE_TIME);
  const [observer] = useState(() => {
    return createObserver(() => {
      actionRef.destroy?.();
      actionRef.destroy = (action as Action<T>)(actionRef.current) as StateUnsubscribe;
    });
  });
  const actionRef = useRef(typeof init === 'function' ? null : init) as ActionRef<T>;

  useEffect(() => {
    cancelCleanup();

    return () => {
      cleanup(() => {
        observer.destroy();
        actionRef.destroy?.();
      });
    };
  }, []);

  return {
    get current() {
      return actionRef.current;
    },
    set current(value: T) {
      if (value === actionRef.current) return;

      actionRef.destroy?.();
      actionRef.current = value;
      actionRef.destroy = observer.run(() => (action as Action<T>)(actionRef.current)) as StateUnsubscribe;
    },
    destroy() {
      actionRef.current = null as T;
      observer.destroy();
      actionRef.destroy?.();
    },
  };
}

/**
 * Custom hook that combines multiple action references into a single action reference.
 *
 * This hook allows you to synchronize multiple action references so that when the
 * combined action's value is updated, all individual actions are updated with the
 * same value. It also handles cleanup for all actions when the combined action is destroyed.
 *
 * Use cases: Apply class binding, style binding, and event listeners to the same element.
 *
 * @template T - The type of the value being managed
 * @param actions - An array of action references to be combined
 * @returns A single action reference that controls all provided actions
 */
export function useActions<T>(...actions: (ActionRef<T> | undefined)[]): ActionRef<T> {
  const selfRef = useRef<T>(null);
  return useMemo(() => {
    return {
      get current() {
        return selfRef.current as T;
      },
      set current(value: T) {
        selfRef.current = value;
        actions.filter((action) => typeof action === 'object').forEach((action) => (action.current = value));
      },
      destroy() {
        selfRef.current = null;
        actions.filter((action) => typeof action === 'object').forEach((action) => action.destroy?.());
      },
    };
  }, actions);
}
