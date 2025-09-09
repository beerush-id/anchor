import type { ConstantRef, RefSubscriber, StateRef, VariableRef } from './types.js';
import { anchor, derive, type Linkable } from '@anchor/core';
import { onDestroy } from 'svelte';

export const REF_REGISTRY = new WeakMap<ConstantRef<unknown>, StateRef<unknown>>();

/**
 * Creates a readable reference that can be subscribed to for reactive updates.
 * This function initializes a reactive reference with a given initial value and provides
 * mechanisms for subscribing to changes and publishing updates to subscribers.
 *
 * @template T The type of the value being referenced
 * @param init - The initial value for the reference
 * @returns A readable reference object with subscribe and publish capabilities
 */
export function variableRef<T>(init: T) {
  const subscribers = new Set<RefSubscriber<T>>();
  const stateRef = anchor({ value: init }, { recursive: true });

  let leaveState: ((destroy?: boolean) => void) | undefined = undefined;

  const subscribe = (handler: RefSubscriber<T>) => {
    if (!anchor.has(stateRef)) {
      handler(stateRef.value);
      return () => {};
    }

    if (!leaveState) {
      leaveState = derive(stateRef, (_, event) => {
        if (event.type !== 'init') {
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
    if (anchor.has(stateRef.value as Linkable)) {
      // Destroy the value if it was a state.
      anchor.destroy(stateRef.value as Linkable);
    }

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
  } as never;

  Object.defineProperties(ref, {
    publish: {
      value: publish,
    },
    subscribe: {
      value: subscribe,
    },
    set: {
      value: () => {},
      writable: true,
    },
  });

  REF_REGISTRY.set(ref as ConstantRef<unknown>, stateRef);

  return ref as ConstantRef<T>;
}

/**
 * Determines whether a given value is linkable, meaning it can be used as a state object.
 * Linkable values include objects, arrays, Sets, and Maps.
 *
 * @param init - The value to check for linkability
 * @returns True if the value is linkable, false otherwise
 */
export function linkable(init: unknown) {
  return (
    (typeof init === 'object' && init !== null) || Array.isArray(init) || init instanceof Set || init instanceof Map
  );
}

/**
 * Extracts the current value from a writable reference or returns the value itself if it's not a reference.
 * This function provides a unified way to access values regardless of whether they are wrapped in a reference or not.
 *
 * @template T The type of the value
 * @param ref The writable reference or plain value to extract from
 * @returns The current value of the reference or the value itself
 */
export function getRefValue<T>(ref: VariableRef<T> | T): T {
  if (isRef(ref)) {
    return REF_REGISTRY.get(ref as VariableRef<unknown>)?.value as T;
  }

  return ref as T;
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
