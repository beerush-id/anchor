import type { AsyncKey, AsyncValue } from './scope.js';

/**
 * An async contract is a function that temporarily sets a value in the async context,
 * and executes a function.
 */
export type StoreContract = <T>(fn: () => T) => T;
export type AsyncStoreContract = <T>(fn: () => Promise<T>) => Promise<T>;

/**
 * A hierarchical key-value store that forms the backbone of Anchor's async context system.
 *
 * Each store optionally links to a `parent`, creating a prototype-chain-like lookup.
 * When a key is not found in the current store, the lookup automatically walks
 * up the parent chain until a value is found or the root is reached.
 */
export class AsyncStore extends Map<AsyncKey, AsyncValue> {
  /** The parent store to fall back to during {@link get} lookups. */
  public parent?: AsyncStore;

  constructor(parent?: AsyncStore);
  constructor(seeds: Iterable<readonly [AsyncKey, AsyncValue]>, parent?: AsyncStore);
  constructor(seeds?: Iterable<readonly [AsyncKey, AsyncValue]> | AsyncStore, parent?: AsyncStore) {
    super(seeds instanceof AsyncStore ? undefined : seeds);
    this.parent = seeds instanceof AsyncStore ? seeds : parent;
  }

  /**
   * Retrieves a value by key, walking up the parent chain if not found locally.
   *
   * @param key - The key to look up.
   * @returns The value from this store or the nearest ancestor, or `undefined`.
   */
  public get(key: AsyncKey): AsyncValue | undefined {
    return super.get(key) ?? this.parent?.get(key);
  }
}
