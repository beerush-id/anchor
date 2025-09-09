import { type Readable } from 'svelte/store';
import { createObserver } from '@anchor/core';
import type { RefSubscriber } from './types.js';
import { onDestroy } from 'svelte';

/**
 * Creates a Svelte readable store that observes a reactive function and updates its subscribers
 * when the observed value changes. The function automatically handles observer lifecycle
 * and cleanup using Svelte's onDestroy hook.
 *
 * @template R - The type of the observed value
 * @param observe - A function that returns the value to be observed
 * @returns A Svelte readable store containing the observed value
 */
export function observedRef<R>(observe: () => R): Readable<R> {
  const subscribers = new Set<RefSubscriber<R>>();
  const observer = createObserver((c) => {
    update();
  });

  let current = observer.run(observe);

  const update = () => {
    current = observer.run(observe);
    subscribers.forEach((handler) => handler(current));
  };

  const subscribe = (handler: RefSubscriber<R>) => {
    handler(current);
    subscribers.add(handler);

    return () => {
      subscribers.delete(handler);
    };
  };

  onDestroy(() => {
    observer.destroy();
  });

  return { subscribe };
}
