import { kv, type KVState, type Storable } from '@anchorlib/storage/db';
import type { ConstantState } from '../index.js';
import { useConstant } from '../index.js';

/**
 * A React hook that provides access to a key-value storage with reactive state management.
 *
 * This hook wraps the kv storage utility and provides a reactive interface for storing
 * and retrieving values. It returns the current value, the storage object, and a setter
 * function to update the value.
 *
 * @template T - The type of the stored value, must extend Storable
 * @param name - The unique identifier for the storage entry
 * @param init - The initial value to store if no existing value is found
 * @returns {ConstantState<KVState<T>>} A constant state object of the KVState type.
 */
export function useKv<T extends Storable>(name: string, init: T): ConstantState<KVState<T>> {
  const [state] = useConstant(() => {
    return kv(name, init);
  }, [name, init]);
  return [state.value, state];
}
