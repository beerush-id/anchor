import { kv, type KVState, type Storable } from '@anchor/storage/db';
import type { ConstantRef } from '../types.js';
import { onDestroy } from 'svelte';
import { variableRef } from '../ref.js';

/**
 * Creates a reactive reference to a key-value store state.
 *
 * This function initializes a key-value store with the given name and initial value,
 * and automatically cleans up the store subscription when the component is destroyed.
 *
 * @template T - The type of the stored value, must extend Storable
 * @param name - The unique identifier for the key-value store
 * @param init - The initial value for the store
 * @returns A reactive reference to the key-value store state
 */
export function kvRef<T extends Storable>(name: string, init: T): ConstantRef<KVState<T>> {
  const state = kv(name, init);

  onDestroy(() => {
    kv.leave(state);
  });

  return variableRef(state);
}
