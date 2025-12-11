import { kv, type KVState, type Storable } from '@anchorlib/storage/db';
import { onCleanup } from 'solid-js';

/**
 * @deprecated Use `kv()` instead.
 * Creates a reactive key-value store reference with automatic cleanup.
 *
 * This function initializes a key-value store and sets up automatic cleanup
 * when the component using this store is unmounted. It's designed to work
 * within Solid.js reactivity system.
 *
 * @template T - The type of the storable value, must extend Storable
 * @param name - The unique identifier for the key-value store
 * @param init - The initial value for the store
 * @returns A reactive key-value store state object
 */
export function kvRef<T extends Storable>(name: string, init: T): KVState<T> {
  const state = kv(name, init);

  onCleanup(() => {
    kv.leave(state);
  });

  return state;
}
