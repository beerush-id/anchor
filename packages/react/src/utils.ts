import { useMemo, useRef, useState } from 'react';
import { microtask, shortId, softEqual } from '@anchor/core';
import type { AnchoredProps, Bindable } from './types.js';
import { DEV_MODE } from './dev.js';

/**
 * A React hook that generates a short, unique identifier string.
 *
 * This hook uses the **shortId()** function from the Anchor core library
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
 * `cleanProps` is a utility function designed to remove the internal
 * `_state_version` prop from a component's props object.
 *
 * When a component is wrapped by the `observed` HOC, it receives an
 * additional `_state_version` prop. This prop is used internally by the
 * `observed` HOC to force re-renders and should typically not be passed
 * down to native DOM elements or other components that don't expect it.
 *
 * Use this function to filter out `_state_version` before spreading props
 * onto child components or DOM elements.
 *
 * @template T The type of the props object, which must extend `Bindable`.
 * @param props The props object that might contain `_state_version`.
 * @returns A new object containing all original props except `_state_version`.
 */
export function cleanProps<T extends Bindable>(props: T) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _state_version, ...rest } = props as T & AnchoredProps;
  return rest;
}

export function useConstant<T>(init: () => T): T;
export function useConstant<T>(init: T, cleanup?: (current: T) => void): T;
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

export function useMicrotask(timeout?: number) {
  return useRef(microtask(timeout)).current;
}

/**
 * Compares two arrays for shallow equality, ignoring the order of elements.
 *
 * This function checks if two arrays contain the same elements by comparing:
 * 1. Their lengths
 * 2. Whether all elements in one array exist in the other array
 *
 * It's used to determine if the dependencies of an observer have changed,
 * where the position of elements doesn't matter but their presence does.
 *
 * @param prev - The previous array of dependencies
 * @param next - The next array of dependencies
 * @returns true if the arrays are different, false if they contain the same elements
 */
export function depsChanged(prev: Set<unknown>, next: unknown[]): Set<unknown> | void {
  const nextSet = new Set(next);
  if (nextSet.size !== prev.size) return nextSet;

  for (const item of nextSet) {
    if (!prev.has(item)) return nextSet;
  }
}
