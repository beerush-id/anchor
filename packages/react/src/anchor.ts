import {
  anchor,
  captureStack,
  type ImmutableOutput,
  type Linkable,
  type LinkableSchema,
  type ModelInput,
  type ModelOutput,
  type State,
  type StateBaseOptions,
  type StateOptions,
  subscribe,
} from '@anchorlib/core';
import { useEffect } from 'react';
import type { AnchorState } from './types.js';
import { useStableRef } from './hooks.js';
import { mutationKeys, pickValues } from './utils.js';
import { useVariable } from './ref.js';

/**
 * Custom React hook that creates and manages a reactive anchor state.
 *
 * This overload is used when you only provide an initial value and optional state options.
 *
 * @template T - The type of the initial value
 * @template S - The schema type for the state, defaults to LinkableSchema
 *
 * @param init - The initial value for the state
 * @param options - Optional configuration for the state
 *
 * @returns A tuple containing the current state value, the state object, and a setter function
 */
export function useAnchor<T, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
): AnchorState<T>;

/**
 * Custom React hook that creates and manages a reactive anchor state.
 *
 * This overload is used when you provide an initial value, a schema, and optional base options.
 *
 * @template S - The schema type for the state
 * @template T - The type of the initial value, must extend ModelInput<S>
 *
 * @param init - The initial value for the state
 * @param schema - The schema to validate and structure the state
 * @param options - Optional base configuration for the state
 *
 * @returns A tuple containing the current state value, the state object, and a setter function
 */
export function useAnchor<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema: S,
  options?: StateBaseOptions
): AnchorState<ModelOutput<S>>;

/**
 * Custom React hook that creates and manages a reactive anchor state.
 *
 * This overload is used when you provide an initial value, a schema, and options with immutable flag set to true.
 *
 * @template S - The schema type for the state
 * @template T - The type of the initial value, must extend ModelInput<S>
 *
 * @param init - The initial value for the state
 * @param schema - The schema to validate and structure the state
 * @param options - Configuration for the state with immutable flag
 *
 * @returns A tuple containing the current state value, the state object, and a setter function
 */
export function useAnchor<S extends LinkableSchema, T extends ModelInput<S>>(
  init: T,
  schema: S,
  options?: StateBaseOptions & { immutable: true }
): AnchorState<ImmutableOutput<T>>;

/**
 * Custom React hook that creates and manages a reactive anchor state.
 *
 * This is the implementation signature that handles all the overload cases.
 *
 * @template T - The type of the initial value, must extend Linkable
 * @template S - The schema type for the state, defaults to LinkableSchema
 *
 * @param init - The initial value for the state
 * @param schemaOptions - Optional schema or options for the state
 * @param options - Optional base configuration for the state
 *
 * @returns A tuple containing the current state value, the state object, and a setter function
 */
export function useAnchor<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  schemaOptions?: S,
  options?: StateBaseOptions
): AnchorState<T | ModelOutput<S> | ImmutableOutput<T>> {
  const [state, setState] = useVariable<ModelInput<T>>(
    (newInit) => {
      return anchor(newInit ?? (init as ModelInput<S>), schemaOptions as S, options) as ModelInput<T>;
    },
    [init, schemaOptions, options]
  );
  return [state.value, state, setState] as AnchorState<T | ModelOutput<S> | ImmutableOutput<T>>;
}

/**
 * React hook that creates a reactive state.
 * This hook is an alias for **useAnchor**.
 *
 * @template T - The type of the initial value, must extend Linkable
 * @template S - The schema type for the state, defaults to LinkableSchema
 *
 * @param init - The initial value for the state
 * @param options - Optional configuration for the state
 *
 * @returns A tuple containing the current state value, the state object, and a setter function
 */
export const useReactive = useAnchor;

/**
 * Custom React hook that creates and manages a raw anchor state.
 * This hook is similar to **useAnchor** but creates a raw state that mutates the underlying state object.
 *
 * Unless you set the global options to `cloned: true`, you don't want to use this.
 *
 * @template T - The type of the initial value, must extend Linkable
 * @template S - The schema type for the state, defaults to LinkableSchema
 *
 * @param init - The initial value for the state
 * @param options - Optional configuration for the state
 *
 * @returns A tuple containing the current state value, the state object, and a setter function
 */
export function useRaw<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
): AnchorState<T> {
  const [state, setState] = useVariable<T>(
    (newValue) => {
      return anchor.raw(newValue ?? init, options);
    },
    [init, options]
  );
  return [state.value, state, setState];
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

    return subscribe(
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
