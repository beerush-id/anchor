import { type ComponentInternalInstance, customRef, getCurrentInstance, onUnmounted, type Ref } from 'vue';
import {
  anchor,
  captureStack,
  createObserver,
  linkable,
  microbatch,
  setTracker,
  type StateObserver,
} from '@anchor/core';
import type { ConstantRef, StateRef, VariableRef } from './types.js';

export const REF_REGISTRY = new WeakMap<Ref, StateRef<unknown>>();
export const INSTANCE_REGISTRY = new WeakMap<ComponentInternalInstance, Set<StateObserver>>();

const [batch] = microbatch(0);

/**
 * Setup global tracker to bind observer with component.
 * This tracker is responsible for synchronizing state changes with Vue component instances.
 * When a reactive state is accessed, this tracker captures the current component instance
 * and ensures that any observers associated with that component are notified of changes.
 *
 * @param init - The initial state value
 * @param observers - Array of observer functions to be notified of changes
 * @param key - The property key being accessed
 */
setTracker((init, observers, key) => {
  const component = getCurrentInstance();
  if (!component) return;

  // Batch the tracking to unblock the property reads.
  batch(() => {
    const componentObservers = INSTANCE_REGISTRY.get(component);
    if (!componentObservers?.size) return;

    for (const observer of componentObservers) {
      observer.assign(init, observers)(key);
    }
  });
});

/**
 * Creates a reactive variable reference that can be used in Vue components.
 * This overload creates a standard variable reference that can be modified.
 *
 * @template T - The type of the value being stored
 * @param init - The initial value for the reactive variable
 * @returns A reactive reference to the variable
 */
export function variableRef<T>(init: T): VariableRef<T>;

/**
 * Creates a constant reactive reference that cannot be modified after creation.
 * This overload creates a readonly reference when the constant parameter is true.
 *
 * @template T - The type of the value being stored
 * @param init - The initial value for the reactive variable
 * @param constant - When true, creates a constant (readonly) reference
 * @returns A constant reference to the variable
 */
export function variableRef<T>(init: T, constant: true): ConstantRef<T>;

/**
 * Creates a reactive variable reference with configurable mutability.
 *
 * @template T - The type of the value being stored
 * @param init - The initial value for the reactive variable
 * @param constant - Optional flag to make the reference readonly
 * @returns Either a VariableRef or ConstantRef depending on the constant parameter
 */
export function variableRef<T>(init: T, constant?: boolean): VariableRef<T> {
  const state = anchor({ value: init }, { recursive: true });
  const stateRef = customRef((track, trigger) => {
    const observer = createObserver(trigger);
    const component = getCurrentInstance();

    if (component) {
      if (!INSTANCE_REGISTRY.has(component)) {
        INSTANCE_REGISTRY.set(component, new Set());
      }

      INSTANCE_REGISTRY.get(component)!.add(observer);
    } else {
      const error = new Error('Outside of component scope.');
      captureStack.violation.general(
        'Variable declaration violation detected:',
        'Attempted to declare reactive state outside of a component scope',
        error
      );
    }

    onUnmounted(() => {
      observer.destroy();

      if (component) {
        const observers = INSTANCE_REGISTRY.get(component);
        observers?.delete(observer);

        if (!observers?.size) {
          INSTANCE_REGISTRY.delete(component);
        }
      }
    });

    return {
      get() {
        track();
        return state.value;
      },
      set(value) {
        // Ignore if the new value is the same with the existing one.
        if (value === state.value) return;

        if (!constant) {
          if (linkable(state.value)) {
            observer.destroy();
          }

          state.value = value;
        }
      },
    };
  });

  REF_REGISTRY.set(stateRef, state);

  onUnmounted(() => {
    // Destroy the state.
    anchor.destroy(state);

    // Remove the state ref from registry.
    REF_REGISTRY.delete(stateRef);
  });

  return stateRef;
}

/**
 * Creates a constant reactive reference that cannot be modified after creation.
 * This function is a convenience wrapper around variableRef that automatically sets the constant flag to true.
 *
 * @template T - The type of the value being stored
 * @param init - The initial value for the constant reference
 * @returns A constant (readonly) reference to the value
 */
export function constantRef<T>(init: T): ConstantRef<T> {
  return variableRef(init, true);
}
