import { binding, captureStack, type ObjLike } from '@anchorlib/core';
import { useMicrotask } from './hooks.js';
import { CLEANUP_DEBOUNCE_TIME } from './constant.js';
import { useEffect } from 'react';
import { getRefState } from './ref.js';
import type { BindingProp } from './types.js';

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
