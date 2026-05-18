import { GLOBAL_ASYNC_SCOPE, GLOBAL_THIS, hasASL } from '../server/constant.js';
import { ANCHOR_SETTINGS } from '../shared/constant.js';
import { captureStack } from '../shared/index.js';
import { isBrowser } from '../utils/index.js';
import { type AsyncKey, AsyncScope, type AsyncValue, type Future } from './scope.js';

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

/** The key used to store the context store in the active scope. */
const CONTEXT_STORE_KEY = Symbol('anchor-context');

/** The root-level store. All {@link withScope} children ultimately chain back to this. */
const globalStore = new AsyncStore([[CONTEXT_STORE_KEY, new AsyncStore()]]);

/** The singleton {@link AsyncScope} instance that powers the global scope functions. */
let globalAsyncCtx = new AsyncScope(globalStore);

if (hasASL()) {
  const asl = GLOBAL_THIS[GLOBAL_ASYNC_SCOPE];
  asl.store = globalStore;
  globalAsyncCtx = asl;
}

let bypassWarning = false;

/**
 * Run function in safe execution context to bypass warning.
 * Use this only on context you truly trust.
 *
 * @param fn - Function to run.
 * @returns T - What the function returns.
 */
export function safeRun<T>(fn: () => T) {
  bypassWarning = true;

  try {
    return fn();
  } finally {
    bypassWarning = false;
  }
}

/**
 * Sets the global async scope.
 * @param {AsyncScope<AsyncStore>} scope
 */
export function setAsyncScope(scope: AsyncScope<AsyncStore>) {
  globalAsyncCtx = scope as AsyncScope<AsyncStore>;
  globalAsyncCtx.store = globalStore;
}

/**
 * Retrieves the global async scope.
 * @returns The global async scope.
 */
export function getAsyncScope() {
  return globalAsyncCtx;
}

/**
 * Creates an async contract that temporarily sets the value of a given key in the async context.
 *
 * @param {AsyncKey} key - The key to set in the async context.
 * @param value - The value to set in the async context.
 * @param onstart - Optional callback that fires before the contract is entered.
 * @param onfinally - Optional callback that fires after the contract is exited.
 * @returns AsyncStoreContract
 */
export function asyncStoreContract<T>(
  key: AsyncKey,
  value: T,
  onstart?: () => void,
  onfinally?: () => void
): AsyncStoreContract {
  return async function asyncContract<R>(fn: () => Promise<R>): Promise<R> {
    onstart?.();

    const store = new AsyncStore([[key, value]], getScopeStore());

    try {
      return await globalAsyncCtx.run<R>(store, fn);
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
 * @returns StoreContract
 */
export function storeContract<T>(key: AsyncKey, value: T, onstart?: () => void, onfinally?: () => void): StoreContract {
  return function contract<R>(fn: () => R): R {
    onstart?.();

    const current = getScope(key);
    setScope(key, value);

    try {
      return fn();
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
 * @param context - Optional pre-built {@link AsyncStore} to use instead of creating a new one.
 * @returns The resolved return value of `fn`.
 */
export async function withIsolation<R>(fn: () => R, strict = true, context?: AsyncStore) {
  const floatingLists = new Set<Future<unknown>>();
  const isolatedStore = new AsyncStore([[CONTEXT_STORE_KEY, context ?? new AsyncStore()]]);

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
    if (!floatingLists.size) {
      isolatedStore.clear();
    }

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
  const store = globalAsyncCtx.getStore();

  if (!isBrowser() && !bypassWarning && store === globalStore && ANCHOR_SETTINGS.globalScopeWarning) {
    captureStack.warning.external(
      'Attempted to access global scope.',
      [
        'Accessing global scope is highly discouraged.',
        'This could lead to race condition.',
        '- Make sure to use isolated context storage or implement a custom storage mechanism.',
        'Documentation: https://anchorlib.dev/docs/context#isolated-store',
      ].join('\n'),
      'Global Scope Access Detected.',
      getScope
    );
  }

  const result = store?.get(key);
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
 * Creates a new Context Store with the given initial values.
 * @param {[AsyncKey, AsyncValue][]} init
 * @returns {AsyncStore}
 */
export function createContextStore(init?: [AsyncKey, AsyncValue][]): AsyncStore {
  return init ? new AsyncStore(init, getContextStore()) : new AsyncStore(getContextStore());
}

/**
 * Gets the currently active Context Store.
 * @returns {AsyncStore}
 */
export function getContextStore(): AsyncStore {
  return globalAsyncCtx.getStore()!.get(CONTEXT_STORE_KEY) as AsyncStore;
}

/**
 * Sets the currently active Context Store.
 * @param {AsyncStore} store
 * @returns {void}
 */
export function setContextStore(store: AsyncStore): void {
  globalAsyncCtx.getStore()!.set(CONTEXT_STORE_KEY, store);
}

/**
 * Clears the currently active Context Store.
 */
export function clearContextStore() {
  getContextStore()!.clear();
}

// Centralized Context API that replaceable.
export const CONTEXT_STORE = {
  get: (key: AsyncKey, fallback?: unknown) => {
    const value = getContextStore().get(key);
    return typeof value !== 'undefined' ? value : fallback;
  },
  set: (key: AsyncKey, value: AsyncValue) => {
    getContextStore().set(key, value);
  },
};

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
  return CONTEXT_STORE.get(key, fallback);
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
  CONTEXT_STORE.set(key, value);
}

/**
 * Returns the currently active {@link AsyncStore}.
 *
 * @returns The currently active {@link AsyncStore}, or `undefined` if none is active.
 */
export function getScopeStore() {
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
 * Returns the full {@link AsyncStore} hierarchy from the currently active store
 * up to the global root, ordered innermost-first.
 *
 * Useful for debugging, diagnostics, or manually capturing a store reference
 * for later re-entry via {@link withScope}.
 */
export function getAllScopes(list: AsyncStore[] = [], from?: AsyncStore) {
  const store = from ?? globalAsyncCtx.getStore()!;

  list.push(store);

  if (store.parent) {
    return getAllScopes(list, store.parent);
  }

  return list;
}

/**
 * Detect if currently in Global Scope.
 *
 * @returns {boolean} - True if the currently active scope is global scope.
 */
export function isGlobalScope(): boolean {
  return globalAsyncCtx.getStore() === globalStore;
}
