import type { ConstantRef, VariableRef } from './types.js';
import { createSignal, getOwner, onCleanup, type Owner } from 'solid-js';
import { createObserver, microbatch, setTracker, type StateObserver } from '@anchorlib/core';

export const REF_REGISTRY = new WeakSet<VariableRef<unknown> | ConstantRef<unknown>>();
export const OWNER_REGISTRY = new WeakMap<Owner, StateObserver>();

const [batch] = microbatch(0);

let bindingInitialized = false;

if (!bindingInitialized) {
  // Make sure to initialize binding only once.
  bindingInitialized = true;

  /**
   * Setup global tracker to bind observer with component.
   * This tracker is responsible for synchronizing state changes with Solid component instances.
   * When a reactive state is accessed, this tracker captures the current component instance
   * and ensures that any observers associated with that component are notified of changes.
   *
   * @param init - The initial state value
   * @param observers - Array of observer functions to be notified of changes
   * @param key - The property key being accessed
   */
  setTracker((init, observers, key) => {
    const owner = getOwner();
    if (!owner) return;

    if (!OWNER_REGISTRY.has(owner)) {
      const [version, setVersion] = createSignal(0);
      const observer = createObserver(() => {
        setVersion(version() + 1);
      });

      version();
      onCleanup(() => {
        observer.destroy();
        OWNER_REGISTRY.delete(owner);
      });

      OWNER_REGISTRY.set(owner, observer);
    }

    // Batch the tracking to unblock the property reads.
    batch(() => {
      OWNER_REGISTRY.get(owner)!.assign(init, observers)(key);
    });
  });
}
