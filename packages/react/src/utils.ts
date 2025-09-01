import { useMemo, useRef, useState } from 'react';
import { shortId } from '@anchor/core';
import type { AnchoredProps, Bindable } from './types.js';

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
