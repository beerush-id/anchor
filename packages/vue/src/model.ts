import {
  anchor,
  captureStack,
  type ImmutableOutput,
  type LinkableSchema,
  type ModelInput,
  type ModelOutput,
  type ObjLike,
  type StateBaseOptions,
  type StateExceptionMap,
} from '@anchor/core';
import type { ConstantRef, VariableRef } from './types.js';
import { constantRef, REF_REGISTRY, variableRef } from './ref.js';
import { isRef } from 'vue';

/**
 * Creates a reactive reference to a model state that can be used in Vue components.
 *
 * This function wraps the anchor model with Vue's reactivity system, allowing
 * the model state to be used as a reactive reference in Vue templates and composables.
 *
 * @template S - The schema type that extends LinkableSchema
 * @template T - The initial value type that extends ModelInput<S>
 *
 * @param schema - The schema definition for the model
 * @param init - The initial state value for the model
 * @param options - Optional configuration for the anchor model
 *
 * @returns A Vue Ref containing the model state that updates reactively
 */
export function modelRef<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: StateBaseOptions
): VariableRef<ModelOutput<S>>;

/**
 * Creates an immutable reactive reference to a model state that can be used in Vue components.
 *
 * When the **immutable** option is set to true, the returned reference will contain
 * an immutable version of the model state, preventing direct mutations.
 *
 * @template S - The schema type that extends LinkableSchema
 * @template T - The initial value type that extends ModelInput<S>
 *
 * @param schema - The schema definition for the model
 * @param init - The initial state value for the model
 * @param options - Configuration for the anchor model with immutable flag set to true
 *
 * @returns A Vue Ref containing the immutable model state that updates reactively
 */
export function modelRef<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options: StateBaseOptions & { immutable: true }
): VariableRef<ImmutableOutput<S>>;

export function modelRef<S extends LinkableSchema, T extends ModelInput<S>>(
  schema: S,
  init: T,
  options?: StateBaseOptions
) {
  const state = anchor(init, schema, options);
  return variableRef(state) as VariableRef<ModelOutput<S>>;
}

/**
 * Creates a reactive constant reference that tracks exceptions for a given state object.
 * This is a Vue wrapper around anchor.catch that returns a ConstantRef.
 *
 * @template T - The type of the state object (object or array)
 * @param state - The state object to track exceptions for
 * @returns A Vue constant ref containing the exception map for the state object
 */
export function exceptionRef<T extends ObjLike | Array<unknown>>(
  state: T | VariableRef<T>
): ConstantRef<StateExceptionMap<T>> {
  if (isRef(state)) {
    state = REF_REGISTRY.get(state as VariableRef<unknown>)!.value as T;

    captureStack.violation.general(
      'VariableRef passing detected:',
      'Attempted to capture exception on a VariableRef.',
      new Error('Unexpected VariableRef passing'),
      [
        `While it works, it won't update when the variable value itself changed.`,
        `We always recommend passing the state directly instead of passing the VariableRef.`,
      ],
      exceptionRef
    );
  }

  const exception = anchor.catch(state);
  return constantRef(exception);
}
