import { kv, type KVState, type Storable } from '@anchor/storage/db';
import { onUnmounted, type Ref } from 'vue';
import { derivedRef } from '@base/index.js';

/**
 * Creates a Vue ref that wraps a KV store state.
 *
 * @param name - The name of the KV store
 * @param init - The initial value for the KV store
 * @returns A Vue ref containing the KV state
 */
export function kvRef<T extends Storable>(name: string, init: T): Ref<KVState<T>> {
  const state = kv(name, init);

  onUnmounted(() => {
    kv.leave(state);
  });

  return derivedRef(state);
}
