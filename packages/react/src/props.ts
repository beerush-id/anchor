import { captureStack, isBrowser, isMutableRef, untrack } from '@anchorlib/core';
import { isBinding } from './binding.js';
import type { BindableProps } from './types.js';

let currentProps: BindableProps | undefined;

export function withProps<P, R>(props: P, fn: () => R) {
  const prevProps = currentProps;
  currentProps = props as BindableProps;

  try {
    return fn();
  } finally {
    currentProps = prevProps;
  }
}

export function getProps<P>(): P {
  return currentProps as P;
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

export function childProps<R, P>(parentProps: R, childProps: P) {
  return new Proxy(
    { ...(parentProps as Record<string, unknown>), ...(childProps as Record<string, unknown>) },
    {
      get(target, key, receiver) {},
      set(target, key, value, receiver) {
        return true;
      },
    }
  );
}
