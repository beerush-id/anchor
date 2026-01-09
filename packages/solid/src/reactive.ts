import type { StateObserver } from '@anchorlib/core';
import { createObserver, microbatch, onGlobalCleanup, setCleanUpHandler, setTracker } from '@anchorlib/core';
import { createSignal, getOwner, onCleanup, type Owner } from 'solid-js';
import type { ConstantRef, VariableRef } from './types.js';

type ElementRef = {
  version: () => number;
  observer: StateObserver;
};

type InternalOwner = Owner & {
  comparator?: (a: unknown, b: unknown) => boolean;
};

export const REF_REGISTRY = new WeakSet<VariableRef<unknown> | ConstantRef<unknown>>();
export const COMPONENT_REGISTRY = new WeakMap<Owner, Map<Owner, ElementRef>>();
export const ELEMENT_OBSERVER_REGISTRY = new WeakMap<Owner, StateObserver>();

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
    const element = getOwner();
    if (!element) return;

    const component = getPureOwner(element as InternalOwner);
    if (!component) return;

    if (!COMPONENT_REGISTRY.has(component)) {
      const elements = new Map();
      COMPONENT_REGISTRY.set(component, elements);

      if (!Array.isArray(component.cleanups)) {
        component.cleanups = [];
      }

      component.cleanups.push(() => {
        // Batch the cleanup to unblock the component destruction.
        batch(() => {
          for (const [, { observer }] of elements) {
            observer.destroy();
          }

          elements.clear();
          COMPONENT_REGISTRY.delete(component);
        });
      });
    }

    const registry = COMPONENT_REGISTRY.get(component);
    if (!registry) return;

    if (!registry.has(element)) {
      const [version, setVersion] = createSignal(0);
      const observer = createObserver(
        () => {
          observer.reset();
          setVersion(version() + 1);
        },
        undefined,
        true
      );

      registry.set(element, { version, observer });
    }

    if (!ELEMENT_OBSERVER_REGISTRY.has(element)) {
      const { version, observer } = registry.get(element) ?? ({} as ElementRef);
      if (!version) return;

      // Trigger signal read to observe.
      version();

      // Register cleanup to properly handle element re-creation on state change.
      onCleanup(() => {
        ELEMENT_OBSERVER_REGISTRY.delete(element);
      });

      ELEMENT_OBSERVER_REGISTRY.set(element, observer);
    }

    // Batch the tracking to unblock the property reads.
    const observer = ELEMENT_OBSERVER_REGISTRY.get(element);
    batch(() => {
      observer?.assign(init, observers)(key);
    });
  });

  /**
   * Recursively finds the nearest owner in the component tree that has owned components.
   * This function traverses up the owner chain to find the closest parent owner that
   * actually owns child components, filtering out intermediate owners that don't own anything.
   *
   * @param node - Optional Owner node to start the search from. If not provided, uses the current owner.
   * @returns The first Owner that has owned components, or undefined if no such owner exists
   */
  function getPureOwner(node?: InternalOwner | null): InternalOwner | undefined {
    if (!node) return;
    return node.owned && !node.comparator ? node : getPureOwner(node?.owner as InternalOwner);
  }

  setCleanUpHandler((handler) => {
    if (getOwner()) {
      return onCleanup(handler);
    }

    return onGlobalCleanup(handler);
  });
}
