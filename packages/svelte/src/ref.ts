import type { ConstantRef, RefSubscriber, StateRef, VariableRef } from './types.js';
import { anchor, derive, type Linkable, linkable, type StateController } from '@anchorlib/core';
import { onDestroy } from 'svelte';

export const REF_REGISTRY = new WeakMap<ConstantRef<unknown>, StateRef<unknown>>();

/**
 * Creates a readable reference that can be subscribed to for reactive updates.
 * This function initializes a reactive reference with a given initial value and provides
 * mechanisms for subscribing to changes and publishing updates to subscribers.
 *
 * @template T The type of the value being referenced
 * @param init - The initial value for the reference
 * @param updater
 * @returns A readable reference object with subscribe and publish capabilities
 */
export function variableRef<T>(init: T, updater?: (value: T) => T): VariableRef<T>;

/**
 * Creates a constant (read-only) reference that can be subscribed to for reactive updates.
 * This function initializes a reactive reference with a given initial value that cannot be modified
 * after creation.
 *
 * @template T The type of the value being referenced
 * @param init - The initial value for the reference
 * @param constant - If true, the reference will be read-only and cannot be updated.
 * @returns A constant reference object with subscribe capability but no write access
 */
export function variableRef<T>(init: T, constant: true): ConstantRef<T>;

/**
 * Creates a readable reference that can be subscribed to for reactive updates.
 * This function initializes a reactive reference with a given initial value and provides
 * mechanisms for subscribing to changes and publishing updates to subscribers.
 *
 * @template T The type of the value being referenced
 * @param init - The initial value for the reference
 * @param constant - If true, the reference will be read-only and cannot be updated.
 * @returns A readable reference object with subscribe and publish capabilities
 */
export function variableRef<T>(init: T, constant?: boolean | ((value: T) => T)) {
  const subscribers = new Set<RefSubscriber<T>>();
  const stateRef = anchor({ value: init }, { recursive: true });
  const controller = derive.resolve(stateRef) as StateController;

  let leaveState: ((destroy?: boolean) => void) | undefined = undefined;

  const set = (value: T) => {
    // Ignore if the value is the same.
    if (constant === true || value === stateRef.value) return;

    if (typeof constant === 'function') {
      stateRef.value = (constant as (value: T) => T)(value);
      return;
    }

    if (!linkable(value)) {
      stateRef.value = value;
      return;
    }

    const { schema, configs } = anchor.has(stateRef.value as Linkable)
      ? (derive.resolve(stateRef.value as Linkable)?.meta ?? {})
      : {};

    // Create a new state using the same options.
    stateRef.value = anchor(value as never, (schema ?? configs) as never, configs);
  };

  const subscribe = (handler: RefSubscriber<T>) => {
    if (!anchor.has(stateRef)) {
      handler(stateRef.value);
      return () => {};
    }

    if (!leaveState) {
      leaveState = controller.subscribe.all((_, event) => {
        if (event.type !== 'init' && !event.error) {
          publish();
        }
      });
    }

    handler(stateRef.value);
    subscribers.add(handler);

    return () => {
      subscribers.delete(handler);

      if (!subscribers.size) {
        leaveState?.();
        leaveState = undefined;
      }
    };
  };

  const publish = () => {
    for (const subscriber of subscribers) {
      subscriber(stateRef.value);
    }
  };

  onDestroy(() => {
    // Clear the subscribers.
    subscribers.clear();
    // Leave the ref state.
    leaveState?.();
    leaveState = undefined;

    // Remove the ref from the registry.
    REF_REGISTRY.delete(ref as ConstantRef<unknown>);

    // Destroy the ref state.
    anchor.destroy(stateRef);
  });

  const ref = {
    get value() {
      return stateRef.value;
    },
    set value(value: T) {
      set(value);
    },
  } as never;

  Object.defineProperties(ref, {
    publish: {
      value: publish,
    },
    subscribe: {
      value: subscribe,
    },
    set: {
      value: set,
    },
  });

  REF_REGISTRY.set(ref as ConstantRef<unknown>, stateRef);

  return ref as ConstantRef<T>;
}

/**
 * Creates a constant (read-only) reference that can be subscribed to for reactive updates.
 * This function initializes a reactive reference with a given initial value that cannot be modified
 * after creation. It's useful for values that should remain constant throughout the component lifecycle
 * but still need to be reactively tracked.
 *
 * @template T The type of the value being referenced
 * @param init - The initial value for the constant reference
 * @returns A constant reference object with subscribe capability but no write access
 */
export function constantRef<T>(init: T): ConstantRef<T> {
  return variableRef(init, true);
}

/**
 * Checks if a given value is a writable reference.
 * This function uses the REF_REGISTRY to determine if the provided value
 * is a registered writable reference.
 *
 * @template T The type of the value that the reference holds
 * @param ref - The value to check
 * @returns True if the value is a writable reference, false otherwise
 */
export function isRef<T>(ref: unknown): ref is VariableRef<T> {
  return REF_REGISTRY.has(ref as VariableRef<unknown>);
}
