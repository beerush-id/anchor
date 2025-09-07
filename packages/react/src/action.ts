import type { StateUnsubscribe } from '@anchor/core';
import { type RefObject, useEffect, useRef } from 'react';
import { useMicrotask } from './hooks.js';
import { CLEANUP_DEBOUNCE_TIME } from './constant.js';

export type Action<T> = (value: T) => StateUnsubscribe;
export type ActionRef<T> = RefObject<T> & {
  destroy: () => void;
};

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
export function useAction<T>(action: Action<T>): RefObject<T>;

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
export function useAction<T>(init: T, action: Action<T>): RefObject<T>;

export function useAction<T>(init: T | Action<T>, action?: Action<T>): RefObject<T> {
  if (typeof init === 'function') action = init as Action<T>;

  const [cleanup, cancelCleanup] = useMicrotask(CLEANUP_DEBOUNCE_TIME);
  const actionRef = useRef(typeof init === 'function' ? null : init) as ActionRef<T>;

  useEffect(() => {
    cancelCleanup();

    return () => {
      cleanup(() => actionRef.destroy?.());
    };
  }, []);

  return {
    get current() {
      return actionRef.current;
    },
    set current(value: T) {
      actionRef.destroy?.();

      actionRef.current = value;
      actionRef.destroy = (action as Action<T>)(actionRef.current);
    },
  };
}
