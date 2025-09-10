import {
  anchor,
  captureStack,
  derive,
  type Linkable,
  type LinkableSchema,
  type ModelError,
  softEqual,
  type State,
  type StateOptions,
} from '@anchor/core';
import { useEffect } from 'react';
import type { AnchorState, ExceptionList } from './types.js';
import { useSnapshot, useStableRef } from './hooks.js';
import { mutationKeys, pickValues } from './utils.js';
import { usePipe } from './derive.js';
import { useVariable } from './ref.js';

/**
 * Custom React hook that creates and manages an anchor state.
 *
 * This hook provides a way to create reactive state that can be shared across components
 * and automatically handles cleanup, fast refresh (HMR), and strict mode concerns.
 *
 * @template T - The type of the initial value, must extend Linkable
 * @template S - The schema type for the state, defaults to LinkableSchema
 *
 * @param init - The initial value for the state
 * @param options - Optional configuration for the state
 *
 * @returns A tuple containing the current state and a setter function
 */
export function useAnchor<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
): AnchorState<T> {
  const [state, setState] = useVariable(() => {
    return anchor(init, options);
  }, [init, options]);
  return [state.value, state, setState];
}

/**
 * React hook that captures and manages exceptions from a reactive state.
 * It returns an object containing the current exception states for specified keys.
 * When an exception occurs in the reactive state, it automatically updates the corresponding key in the returned object.
 *
 * @template T - The type of the reactive state object.
 * @template R - The type of keys being tracked for exceptions.
 * @param {T} state - The reactive state object to capture exceptions from.
 * @param {ExceptionList<T, R>} init - Initial exception states for the specified keys.
 * @returns {ExceptionList<T, R>} - An object containing the current exception states for the specified keys.
 */
export function useException<T extends State, R extends keyof T>(
  state: T,
  init?: ExceptionList<T, R>
): ExceptionList<T, R> {
  const stableRef = useStableRef<ExceptionList<T, R>>(() => anchor(init ?? {}), [state]);

  useEffect(() => {
    if (!anchor.has(state)) {
      const error = new Error('State is not reactive.');
      captureStack.violation.derivation('Attempted to capture exception of a non-reactive state.', error);
      return;
    }

    const release = anchor.catch(state, (event) => {
      const key = event.keys.join('.') as R;

      stableRef.stable = false;
      stableRef.value[key] = (event.issues?.[0] ?? event.error) as ModelError;
    });

    const unsubscribe = derive(
      state,
      (_, e) => {
        if (e.type !== 'init') {
          const key = e.keys.join('.') as R;
          stableRef.stable = false;
          stableRef.value[key] = null;
        }
      },
      false
    );

    return () => {
      release();
      unsubscribe();
    };
  }, [state]);

  return stableRef.value;
}

/**
 * React hook that allows you to inherit specific properties from a reactive state object.
 * It returns a new object containing only the specified keys and their values.
 * The returned object is reactive and will update when the source state changes.
 *
 * @template T - The type of the reactive state object.
 * @template K - The type of keys being picked from the state.
 * @param {T} state - The reactive state object to pick values from.
 * @param {K[]} picks - An array of keys to pick from the state object.
 * @returns {{ [key in K]: T[key] }} - A new reactive object containing only the picked properties.
 */
export function useInherit<T extends State, K extends keyof T>(state: T, picks: K[]): { [key in K]: T[key] } {
  const [init, values] = pickValues(state, picks);
  const cached = useStableRef(() => init, values).value;
  const output = anchor(cached);

  useEffect(() => {
    if (!anchor.has(state)) {
      const error = new Error('State is not reactive.');
      captureStack.violation.derivation('Attempted to pick values from a non-reactive state.', error);
      return;
    }

    return derive(
      state,
      (newValue, event) => {
        if (event.type !== 'init') {
          const keys = mutationKeys(event) as K[];
          keys.forEach((key) => {
            if (picks.includes(key)) {
              output[key] = newValue[key];
            }
          });
        }
      },
      false
    );
  }, [output]);

  return output;
}

export type FormState<T extends State, K extends keyof T> = {
  data: { [key in K]: T[key] };
  errors: ExceptionList<T, K>;
  readonly isValid: boolean;
  readonly isDirty: boolean;
  reset(): void;
};

/**
 * React hook that provides a comprehensive form management solution for a reactive state.
 * It integrates data, error handling, dirty state tracking, validity checking, and reset functionality.
 *
 * @template T - The type of the reactive state object.
 * @template K - The type of keys representing the form fields.
 * @param {T} state - The reactive state object from which form data is derived.
 * @param {K[]} keys - An array of keys that represent the fields managed by this form.
 * @returns {FormState<T, K>} - An object containing:
 *   - `data`: A reactive object containing the values of the specified form fields.
 *   - `errors`: A reactive object containing exceptions/errors for the form fields.
 *   - `isValid`: A boolean indicating if all form fields are valid (no errors).
 *   - `isDirty`: A boolean indicating if any form field has been changed from its initial snapshot.
 *   - `reset()`: A function to reset the form fields to their initial snapshot and clear errors.
 */
export function useFormWriter<T extends State, K extends keyof T>(state: T, keys: K[]): FormState<T, K> {
  const snapshot = useSnapshot(state);
  const formData = useInherit(state, keys);
  const formErrors = useException(state);
  const formRef = useStableRef<FormState<T, K>>(() => {
    return anchor({
      data: formData,
      errors: formErrors,
      get isDirty() {
        return keys.some((key) => !softEqual(formData[key], snapshot[key]));
      },
      get isValid() {
        return !keys.some((keys) => formErrors[keys]);
      },
      reset(): void {
        Object.assign(formData, snapshot);
        keys.forEach((key) => delete formErrors[key]);
      },
    });
  }, [state, ...keys]);

  usePipe(formData, state);

  return formRef.value;
}
