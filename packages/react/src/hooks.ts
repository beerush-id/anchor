import { useMemo, useRef, useState } from 'react';
import { DEV_MODE } from './dev.js';
import { microtask, shortId, softEqual } from '@anchor/core';

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
 * A React hook that returns a constant value that is only updated when the value changes in development mode.
 *
 * In production mode, the hook will always return the initial value.
 * In development mode, the hook will update the value if it is not equal to the current value.
 * If the initial value is a factory, it will always use the initial value.
 *
 * @template T - The type of the value.
 * @param {T | (() => T)} init - The initial value, or the initial value factory.
 * @returns The constant value.
 */
export function useConstant<T>(init: () => T): T;
/**
 * A React hook that returns a constant value that is only updated when the value changes in development mode.
 *
 * In production mode, the hook will always return the initial value.
 * In development mode, the hook will update the value if it is not equal to the current value.
 * If the initial value is a factory, it will always use the initial value.
 *
 * @template T - The type of the value.
 * @param {T | (() => T)} init - The initial value, or the initial value factory.
 * @param {(current: T) => void} cleanup - An optional cleanup function to be called when the value changes.
 * @returns The constant value.
 */
export function useConstant<T>(init: T, cleanup?: (current: T) => void): T;
export function useConstant<T>(init: T | (() => T), cleanup?: (current: T) => void): T {
  const ref = useRef<T>(null);

  if (!ref.current) {
    ref.current = typeof init === 'function' ? (init as () => T)() : init;
  }

  if (DEV_MODE && typeof init !== 'function' && !softEqual(init, ref.current)) {
    cleanup?.(ref.current);
    ref.current = init;
  }

  return ref.current as T;
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
