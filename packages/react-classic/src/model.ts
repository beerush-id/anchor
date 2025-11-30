import {
  anchor,
  captureStack,
  type ImmutableOutput,
  type LinkableSchema,
  type ModelError,
  type ModelInput,
  type ModelOutput,
  softEqual,
  type State,
  type StateBaseOptions,
  subscribe,
} from '@anchorlib/core';
import type { AnchorState, ExceptionList, FormState } from './types.js';
import { useInherit } from './anchor.js';
import { useSnapshot, useStableRef } from './hooks.js';
import { useEffect } from 'react';
import { usePipe } from './derivation.js';
import { useVariable } from './ref.js';

/**
 * Creates a reactive model based on the provided schema and initial data.
 * This overload is used when the model should be mutable.
 *
 * @template S - The type of the LinkableSchema.
 * @template T - The type of the initial model input, which must conform to ModelInput<S>.
 * @param schema - The schema defining the structure and types of the model.
 * @param init - The initial data for the model.
 * @param options - Optional configuration for the model state.
 * @returns An AnchorState object containing the mutable model output.
 */
export function useModel<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: StateBaseOptions
): AnchorState<ModelOutput<S>>;

/**
 * Creates an immutable reactive model based on the provided schema and initial data.
 * This overload is used when the model should be immutable.
 *
 * @template S - The type of the LinkableSchema.
 * @template T - The type of the initial model input, which must conform to ModelInput<S>.
 * @param schema - The schema defining the structure and types of the model.
 * @param init - The initial data for the model.
 * @param options - Optional configuration for the model state with immutable flag set to true.
 * @returns An AnchorState object containing the immutable model output.
 */
export function useModel<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: StateBaseOptions & { immutable: true }
): AnchorState<ImmutableOutput<S>>;

/**
 * Implementation of the useModel hook that creates a reactive model.
 *
 * @template S - The type of the LinkableSchema.
 * @template T - The type of the initial model input, which must conform to ModelInput<S>.
 * @param schema - The schema defining the structure and types of the model.
 * @param init - The initial data for the model.
 * @param options - Optional configuration for the model state.
 * @returns An AnchorState object containing the model output, state, and setter function.
 */
export function useModel<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: StateBaseOptions
): AnchorState<ModelOutput<S>> {
  const [state, setState] = useVariable<ModelOutput<S>>(
    (newInit) => {
      return anchor.model(schema, (newInit ?? init) as T, options) as ModelOutput<S>;
    },
    [schema, init, options]
  );
  return [state.value, state, setState];
}

/**
 * Creates an immutable reactive model based on the provided schema and initial data.
 * This hook is specifically designed for scenarios where the model should be immutable.
 *
 * @template S - The type of the LinkableSchema.
 * @template T - The type of the initial model input, which must conform to ModelInput<S>.
 * @param schema - The schema defining the structure and types of the model.
 * @param init - The initial data for the model.
 * @param options - Optional configuration for the model state.
 * @returns An AnchorState object containing the immutable model output.
 */
export function useImmutableModel<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: StateBaseOptions
): AnchorState<ImmutableOutput<S>> {
  const [state, setState] = useVariable<ImmutableOutput<S>>(
    (newValue) => {
      return anchor.immutable((newValue ?? init) as T, schema, options) as ImmutableOutput<S>;
    },
    [schema, init, options]
  );
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
      stableRef.value[key] = event.issues?.[0] as never as ModelError;
    });

    const unsubscribe = subscribe(
      state,
      (_, e) => {
        if (e.type !== 'init' && e.keys.length) {
          const key = e.keys.join('.') as R;
          stableRef.stable = false;
          delete stableRef.value[key];
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
