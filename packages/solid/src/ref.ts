import { anchor } from '@anchorlib/core';
import { onCleanup } from 'solid-js';
import { REF_REGISTRY } from './reactive.js';
import type { ConstantRef, VariableRef } from './types.js';

/**
 * @deprecated Use 'mutable()' instead.
 * Creates a reactive variable reference that can be used in Solid components.
 * This function creates a reactive state container that integrates with Solid's reactivity system
 * and Anchor's state management. The returned reference object provides getter and setter access
 * to the underlying reactive value.
 *
 * @typeParam T - The type of the value being stored
 * @param init - The initial value for the reactive variable
 * @returns A VariableRef object with getter and setter for the reactive value
 */
export function variableRef<T>(init: T): VariableRef<T>;

/**
 * @deprecated Use 'mutable()' instead.
 * Creates a constant reactive reference that can be used in Solid components.
 * This overload creates a read-only reactive reference that integrates with Solid's reactivity system.
 * The returned reference object only provides a getter for the underlying reactive value.
 *
 * @typeParam T - The type of the value being stored
 * @param init - The initial value for the reactive variable
 * @param constant - A literal true value to indicate this should be a constant reference
 * @returns A ConstantRef object with only a getter for the reactive value
 */
export function variableRef<T>(init: T, constant: true): ConstantRef<T>;

/**
 * @deprecated Use 'mutable()' instead.
 * Creates a reactive reference that can be used in Solid components.
 * This function creates a reactive state container that integrates with Solid's reactivity system
 * and Anchor's state management. Depending on the constant parameter, it returns either a
 * mutable reference (with getter and setter) or an immutable reference (with only getter).
 *
 * @typeParam T - The type of the value being stored
 * @param init - The initial value for the reactive variable
 * @param constant - Optional flag to indicate if this should be a constant (read-only) reference
 * @returns Either a VariableRef (if constant is false/undefined) or ConstantRef (if constant is true)
 */
export function variableRef<T>(init: T, constant?: boolean): VariableRef<T> {
  const state = anchor({ value: init }, { recursive: true });
  const stateRef =
    constant === true
      ? {
          get value() {
            return state.value;
          },
        }
      : {
          get value() {
            return state.value;
          },
          set value(value: T) {
            state.value = value;
          },
        };

  REF_REGISTRY.add(stateRef);

  onCleanup(() => {
    anchor.destroy(state);
    REF_REGISTRY.delete(stateRef);
  });

  return stateRef;
}

/**
 * @deprecated Use 'immutable()' instead.
 * Creates a constant reactive reference that can be used in Solid components.
 * This is a convenience function that creates a read-only reactive reference by calling
 * variableRef with the constant flag set to true.
 *
 * @typeParam T - The type of the value being stored
 * @param init - The initial value for the reactive variable
 * @returns A ConstantRef object with only a getter for the reactive value
 */
export function constantRef<T>(init: T): ConstantRef<T> {
  return variableRef(init, true);
}

/**
 * @deprecated Use 'isValueRef()' instead.
 * Checks if a given value is a reactive reference created by variableRef or constantRef.
 * This function can be used to determine if an object is a reactive reference that
 * integrates with the Solid and Anchor reactivity systems.
 *
 * @param state - The value to check
 * @returns true if the value is a reactive reference, false otherwise
 */
export function isRef(state: unknown): state is VariableRef<unknown> | ConstantRef<unknown> {
  return REF_REGISTRY.has(state as VariableRef<unknown>);
}
