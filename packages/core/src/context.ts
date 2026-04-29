import { captureStack } from './exception.js';
import { type AsyncKey, AsyncScope, type AsyncValue, type Future } from './scope.js';
import { GLOBAL_ASYNC_SCOPE, GLOBAL_THIS, hasASL } from './server/constant.js';

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

/** The root-level store. All {@link withScope} children ultimately chain back to this. */
const globalStore = new AsyncStore();
/** A list of all active {@link AsyncScope} instances for context lookups. */
const contextLookups: AsyncScope<AsyncStore>[] = [];

/** The singleton {@link AsyncScope} instance that powers the global scope functions. */
let globalAsyncCtx = new AsyncScope(globalStore);

if (hasASL()) {
  const asl = GLOBAL_THIS[GLOBAL_ASYNC_SCOPE];
  asl.store = globalStore;
  globalAsyncCtx = asl;
}

/**
 * Attaches an AsyncContext to the global context lookup list.
 * @param {AsyncScope<unknown>} lookup
 */
export function attachContextLookup(lookup: AsyncScope<AsyncStore>) {
  if (!(lookup instanceof AsyncScope) || !(lookup.getStore() instanceof Map)) return;
  if (contextLookups.includes(lookup)) return;
  contextLookups.unshift(lookup);
}

/**
 * Detaches an AsyncContext from the global context lookup list.
 * @param {AsyncScope<unknown>} lookup
 */
export function detachContextLookup(lookup: AsyncScope<AsyncStore>) {
  const index = contextLookups.indexOf(lookup);
  if (index !== -1) {
    contextLookups.splice(index, 1);
  }
}

/**
 * Returns the global context lookup list.
 * @returns {AsyncScope<AsyncStore>[]}
 */
export function getContextLookups(): AsyncScope<AsyncStore>[] {
  return contextLookups;
}

/**
 * An async contract is a function that temporarily sets a value in the async context,
 * and executes a function.
 */
export type StoreContract = <T>(fn: () => T) => T;
export type AsyncStoreContract = <T>(fn: () => Promise<T>) => Future<T>;

/**
 * Creates an async contract that temporarily sets the value of a given key in the async context.
 *
 * @param {AsyncKey} key - The key to set in the async context.
 * @param value - The value to set in the async context.
 * @param onstart - Optional callback that fires before the contract is entered.
 * @param onfinally - Optional callback that fires after the contract is exited.
 * @param runner
 * @returns AsyncStoreContract
 */
export function asyncStoreContract<T>(
  key: AsyncKey,
  value: T,
  onstart?: () => void,
  onfinally?: () => void
): AsyncStoreContract {
  return function asyncContract<R>(fn: () => Promise<R>): Future<R> {
    onstart?.();

    const store = new AsyncStore([[key, value]], getAsyncStore());

    try {
      return globalAsyncCtx.run(store, fn) as never;
    } finally {
      onfinally?.();
    }
  } as AsyncStoreContract;
}

/**
 * Creates a contract that temporarily sets the value of a given key in the async context.
 *
 * @param {AsyncKey} key - The key to set in the async context.
 * @param value - The value to set in the async context.
 * @param onstart - Optional callback that fires before the contract is entered.
 * @param onfinally - Optional callback that fires after the contract is exited.
 * @param runner
 * @returns StoreContract
 */
export function storeContract<T>(
  key: AsyncKey,
  value: T,
  onstart?: () => void,
  onfinally?: () => void,
  runner?: <R>(fn: () => R) => R | undefined
): StoreContract {
  return function contract<R>(fn: () => R): R {
    onstart?.();

    const current = getScope(key);
    setScope(key, value);

    try {
      return typeof runner === 'function' ? (runner(fn) as R) : fn();
    } finally {
      setScope(key, current);
      onfinally?.();
    }
  } as StoreContract;
}

/**
 * Creates a child context scope that inherits from the currently active store.
 *
 * If the parent belongs to an {@link withIsolation}, the child automatically
 * inherits the isolation flag so that floating-promise detection propagates
 * through nested scopes.
 *
 * @param fn    - The function to execute within the child context.
 * @param store - Optional pre-built {@link AsyncStore} to use instead of creating a new one.
 *                Useful for re-entering a previously captured store (e.g. in event callbacks).
 * @returns The return value of `fn`, or an {@link Future} Thenable if `fn` is async.
 */
export function withScope<R>(fn: () => R, store?: AsyncStore) {
  const parent = globalAsyncCtx.getStore()!;
  const childStore = store ?? new AsyncStore(parent);
  return globalAsyncCtx.run(childStore, fn);
}

/**
 * Creates a fully isolated context boundary with lifecycle-aware destruction tracking.
 *
 * When `fn` completes (or the returned Promise settles), the `destroyed` flag is set
 * to `true`. Any floating {@link Future} promise that later attempts to execute a
 * continuation inside this boundary will trigger a violation warning via
 * {@link captureStack}, alerting the developer to a memory-unsafe hanging promise.
 *
 * This is the primary security mechanism for SSR request isolation: each request
 * runs inside its own `isolatedContext`, and orphaned async tasks from a finished
 * request are immediately detected.
 *
 * @param fn - The function to execute within the isolated boundary.
 * @param strict - Whether to enable strict mode for this boundary.
 * @returns The resolved return value of `fn`.
 */
export async function withIsolation<R>(fn: () => R, strict = true) {
  const parent = globalAsyncCtx.getStore()!;

  const floatingLists = new Set<Future<unknown>>();
  const isolatedStore = new AsyncStore(parent);

  try {
    const result = await (globalAsyncCtx.run(isolatedStore, fn, floatingLists) as Promise<R>);

    if (floatingLists.size) {
      const error = new Error('Floating promise detected!');
      captureStack.violation.general(
        'Floating promise detected!',
        `${floatingLists.size} promises hanging in a detached isolated Async Context.`,
        error,
        [
          'Accessing async context in a detached isolation is highly discouraged.',
          '- Make sure to await your awaited function.',
          '- Avoid running a hanging "then" in an isolated context.',
          '- Documentation: https://anchorlib.dev/docs/async-context',
        ],
        getScope
      );

      if (strict) {
        throw error;
      }
    }

    return result as R;
  } finally {
    floatingLists.clear();
  }
}

/**
 * Reads a value from the currently active {@link AsyncStore}, walking up
 * the parent chain if the key is not found locally.
 *
 * @param key - The key to look up.
 * @returns The value, or `undefined` if not found in any ancestor.
 */
export function getScope<R>(key: AsyncKey): R | undefined;
/**
 * Reads a value from the currently active {@link AsyncStore}, walking up
 * the parent chain if the key is not found locally.
 * @param {AsyncKey} key - The key to look up.
 * @param fallback - A fallback value to return if the key is not found.
 * @returns - The value, or `fallback` if not found in any ancestor.
 */
export function getScope<R>(key: AsyncKey, fallback: R): R;
export function getScope<R>(key: AsyncKey, fallback?: R): R | undefined {
  const result = globalAsyncCtx.getStore()?.get(key);
  return typeof result !== 'undefined' ? result : fallback;
}

/**
 * Writes a value to the currently active {@link AsyncStore}.
 * The value is set on the **current** (innermost) store only and does not
 * propagate to parent stores.
 *
 * @param key   - The key to set.
 * @param value - The value to associate with the key.
 */
export function setScope(key: AsyncKey, value: AsyncValue) {
  return globalAsyncCtx.getStore()?.set(key, value);
}

/**
 * Reads a value from the currently active {@link AsyncStore}s, walking up
 * the parent chain if the key is not found locally.
 *
 * @param key - The key to look up.
 * @returns The value, or `undefined` if not found in any ancestor.
 */
export function getContext<R>(key: AsyncKey): R | undefined;
/**
 * Reads a value from the currently active {@link AsyncStore}s, walking up
 * the parent chain if the key is not found locally.
 * @param {AsyncKey} key - The key to look up.
 * @param fallback - A fallback value to return if the key is not found.
 * @returns - The value, or `fallback` if not found in any ancestor.
 */
export function getContext<R>(key: AsyncKey, fallback: R): R;
export function getContext<R>(key: AsyncKey, fallback?: R): R | undefined {
  const scope = contextLookups[0] as AsyncScope<AsyncStore>;
  if (!scope) return fallback;

  const initLookup = scope.getStore()!.get?.(key);
  if (typeof initLookup !== 'undefined') return initLookup;

  if (contextLookups.length > 1) {
    const length = contextLookups.length;

    for (let i = 1; i < length; i++) {
      const result = contextLookups[i].getStore()!.get?.(key);
      if (typeof result !== 'undefined') return result;
    }
  }

  return fallback;
}

/**
 * Writes a value to the first active {@link AsyncStore}.
 * The value is set on the **current** (innermost) store only and does not
 * propagate to parent stores.
 *
 * @param key   - The key to set.
 * @param value - The value to associate with the key.
 */
export function setContext(key: AsyncKey, value: AsyncValue) {
  const lookup = contextLookups[0] as AsyncScope<AsyncStore>;
  if (!lookup) return;
  return lookup.getStore()!.set(key, value);
}

/**
 * Returns the currently active {@link AsyncStore}.
 *
 * @returns The currently active {@link AsyncStore}, or `undefined` if none is active.
 */
export function getAsyncStore() {
  return globalAsyncCtx.getStore();
}

/**
 * Returns the root {@link AsyncStore} instance.
 *
 * @returns The root {@link AsyncStore} instance.
 */
export function getRootStore() {
  return globalStore;
}

/**
 * Recursively collects the full store hierarchy from a starting store up to the root.
 *
 * @param list - Accumulator array (used internally for recursion).
 * @param from - The store to start from. Defaults to the currently active store.
 * @returns An array of {@link AsyncStore} instances, ordered from innermost to root.
 */
function getAll(list: AsyncStore[] = [], from?: AsyncStore) {
  const store = from ?? globalAsyncCtx.getStore()!;

  list.push(store);

  if (store.parent) {
    return getAll(list, store.parent);
  }

  return list;
}

/**
 * Returns the full {@link AsyncStore} hierarchy from the currently active store
 * up to the global root, ordered innermost-first.
 *
 * Useful for debugging, diagnostics, or manually capturing a store reference
 * for later re-entry via {@link withScope}.
 */
export const getAllAsyncContext = getAll as () => AsyncStore[];
