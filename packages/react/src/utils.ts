import { type State } from '@anchor/core';
import type { AnchoredProps, Bindable } from './types.js';

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

/**
 * Helper function that extracts specific properties from a reactive state object.
 * It returns a tuple containing:
 * 1. An object with the picked properties and their values
 * 2. An array of the values corresponding to the picked keys
 *
 * @template T - The type of the reactive state object
 * @param {T} state - The reactive state object to pick values from
 * @param {(keyof T)[]} keys - An array of keys to pick from the state object
 * @returns {[T, T[keyof T][]]} A tuple containing the picked object and values array
 */
export function pickValues<T extends State>(state: T, keys: (keyof T)[]): [T, T[keyof T][]] {
  const values = [] as T[keyof T][];
  const result = {} as T;

  for (const key of keys) {
    values.push(state[key]);
    result[key] = state[key];
  }

  return [result, values] as const;
}
