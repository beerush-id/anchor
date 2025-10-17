import { createObserver, type KeyLike, type Linkable, setTracker } from '@anchorlib/core';
import { createSubscriber } from 'svelte/reactivity';

export const TRACKER_REGISTRY = new WeakMap<Linkable, (prop: KeyLike) => void>();

let bindingInitialized = false;

if (!bindingInitialized && typeof window !== 'undefined') {
  bindingInitialized = true;

  /**
   * Sets up a tracker function that integrates Anchor's reactivity system with Svelte's reactivity.
   * This tracker is responsible for creating observers that watch for changes in reactive objects
   * and properly subscribing/unsubscribing to Svelte's reactivity system.
   *
   * @param init - The initial linkable object to track
   * @param observers - The observers collection to use for tracking
   * @param key - The specific key/property to track on the object
   */
  setTracker((init, observers, key) => {
    // Only initialize the tracking setup once per object
    if (!TRACKER_REGISTRY.has(init)) {
      let track: ((prop: KeyLike) => void) | undefined = undefined;

      // Create a Svelte subscriber that manages the lifecycle of our observer
      const subscribe = createSubscriber((update) => {
        // Create an Anchor observer that will trigger the Svelte update when changes occur
        const observer = createObserver(() => {
          update();
        });

        // Assign the observer to track changes on the init object and its observers
        track = observer.assign(init, observers);

        // Return cleanup function to destroy observer and remove from registry
        return () => {
          observer.destroy();
          TRACKER_REGISTRY.delete(init);
        };
      });

      // Function to assign tracking to a specific key/property
      const assign = (prop: KeyLike) => {
        // Activate the subscription
        subscribe();
        // Track the specific property
        track?.(prop);
      };

      // Store the assign function in the registry for this object
      TRACKER_REGISTRY.set(init, assign);
    }

    // Execute the tracking function for the specific key
    TRACKER_REGISTRY.get(init)?.(key);
  });
}
