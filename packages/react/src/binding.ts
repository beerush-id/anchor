import { binding, captureStack, type ObjLike } from '@anchorlib/core';
import { useMicrotask } from './hooks.js';
import { CLEANUP_DEBOUNCE_TIME } from './constant.js';
import { useEffect } from 'react';
import { getRefState } from './ref.js';
import type { BindingProp } from './types.js';

/**
 * A React hook that creates a binding between a property of a reactive object and another value.
 *
 * This hook establishes a connection between a property in a reactive state object and a binding source,
 * allowing automatic synchronization of values. The binding is automatically cleaned up when the component
 * unmounts or when the dependencies change.
 *
 * @template S - The type of the reactive state object
 * @template T - The type of the binding source object
 * @template B - The type of the key in the binding source object
 *
 * @param state - The reactive state object whose property will be bound
 * @param key - The key of the property in the state object to bind
 * @param bind - A tuple containing the binding source object and key, or undefined to skip binding
 *
 * @returns The same state object with the specified property now bound to the provided source
 * @throws {Error} When attempting to bind to a constant value, as constants cannot be modified after creation
 */
export function useBinding<S extends ObjLike, T, B>(state: S, key: keyof S, bind?: BindingProp<T, B>): S {
  const [cleanup, cancelCleanup] = useMicrotask(CLEANUP_DEBOUNCE_TIME);
  const [bindObj, bindKey] = (bind ?? []) as BindingProp<T, B>;
  const bindRef = getRefState(bindObj);

  if (bindRef?.constant) {
    const error = new Error('Binding to constant is not allowed.');
    captureStack.violation.general(
      'Binding violation detected:',
      'Attempted to bind to a constant.',
      error,
      [
        'Constant value cannot be changed after created.',
        '- Constant only updated when its dependency changed.',
        '- Use variable if you need to update its value later.',
      ],
      useBinding
    );
  }

  const unbind =
    bindRef && !bindRef.constant ? binding([getRefState(bindObj), bindKey] as never, state, key) : undefined;

  useEffect(() => {
    cancelCleanup();

    return () => {
      cleanup(() => {
        unbind?.();
      });
    };
  }, [unbind]);

  return state;
}
