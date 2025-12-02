import { captureStack, closure, isBrowser, isMutableRef, untrack } from '@anchorlib/core';
import { isBinding } from './binding.js';
import type { BindableProps } from './types.js';

const PROPS_SYMBOL = Symbol('setup-props');

/**
 * Executes a function with provided props temporarily set in the current context.
 *
 * This function sets the given props in the current closure context and executes
 * the provided function. After execution, it restores the previous props value.
 * This is useful for providing contextual data to child components in a scoped manner.
 *
 * @template P - The type of props being set
 * @template R - The return type of the executed function
 * @param props - The props to temporarily set in the context
 * @param fn - The function to execute with the provided props
 * @returns The result of executing the provided function
 */
export function withProps<P, R>(props: P, fn: () => R) {
  const prevProps = closure.get<BindableProps>(PROPS_SYMBOL);
  closure.set(PROPS_SYMBOL, props);

  try {
    return fn();
  } finally {
    closure.set(PROPS_SYMBOL, prevProps);
  }
}

/**
 * Retrieves the props from the current context.
 *
 * This function gets the props that were previously set using withProps().
 * It accesses the props from a shared closure context using a symbol key.
 *
 * @template P - The expected type of the props
 * @returns The props from the current context
 */
export function getProps<P>(): P {
  return closure.get(PROPS_SYMBOL) as P;
}

/**
 * Conditionally returns a callback function based on the environment.
 *
 * In non-browser environments, returns undefined to prevent execution
 * of client-side callbacks during server-side rendering.
 *
 * @template T - The function type
 * @param fn - The callback function
 * @returns The function if in browser environment, undefined otherwise
 */
export function callback<T>(fn: T): T {
  if (!isBrowser()) return undefined as never;
  return fn;
}

/**
 * Creates a proxy for props that handles binding references and read-only properties.
 *
 * This function creates a proxy that:
 * - Resolves binding references to their actual values on get operations
 * - Prevents assignment to event handler properties (those starting with "on")
 * - Properly handles setting values on binding references
 *
 * @template P - The props type
 * @param props - The props object to wrap
 * @returns A proxy wrapping the props object
 */
export function setupProps<P>(props: P) {
  return new Proxy(props as BindableProps, {
    get(target, key, receiver) {
      const bindingRef = Reflect.get(target, key, receiver);

      if (isBinding(bindingRef)) {
        return (bindingRef.source as Record<string, unknown>)[bindingRef.key];
      } else if (isMutableRef(bindingRef)) {
        return bindingRef.value;
      }

      return bindingRef;
    },
    set(target, key, value, receiver) {
      const bindingRef = untrack(() => Reflect.get(target, key, receiver));

      if (typeof key === 'string' && key.startsWith('on')) {
        const error = new Error(`Property '${key}' is read-only.`);
        captureStack.violation.general(
          'Read-only property assignment',
          `Cannot assign to read-only property '${key}'. Event handlers can only be specified in parent component.`,
          error,
          [
            'Event handler properties (starting with "on") are read-only.',
            'Define event handlers in the parent component.',
            'Only mutate properties meant for two-way data binding.',
          ]
        );
        return true;
      }

      if (isBinding(bindingRef)) {
        (bindingRef.source as Record<string, unknown>)[bindingRef.key] = value;
      } else if (isMutableRef(bindingRef)) {
        bindingRef.value = value;
      } else {
        Reflect.set(target, key, value, receiver);
      }

      return true;
    },
  });
}
