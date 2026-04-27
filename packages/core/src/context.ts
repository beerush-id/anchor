import { captureStack } from './exception.js';

/** Key type for {@link AsyncStore} entries. Accepts any value, including Symbols. */
// biome-ignore lint/suspicious/noExplicitAny: Expected.
export type AsyncKey = any;
/** Value type for {@link AsyncStore} entries. */
// biome-ignore lint/suspicious/noExplicitAny: Expected.
export type AsyncValue = any;

/**
 * A hierarchical key-value store that forms the backbone of Anchor's async context system.
 *
 * Each store optionally links to a `parent`, creating a prototype-chain-like lookup.
 * When a key is not found in the current store, the lookup automatically walks
 * up the parent chain until a value is found or the root is reached.
 *
 * @example
 * ```ts
 * const root = new AsyncStore([['theme', 'dark']]);
 * const child = new AsyncStore(root);
 * child.get('theme'); // 'dark' — inherited from parent
 * ```
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

/**
 * A Thenable wrapper that intercepts `.then()`, `.catch()`, and `.finally()` to bracket
 * each continuation with deterministic context entry and exit.
 *
 * **Context Entry:** Before executing a user callback, `fork()` saves the current event-loop
 * context and writes `this.current` into `this.context.store`, re-entering the correct scope.
 *
 * **Context Exit:** After the callback returns (or throws), the `finally` block restores
 * the event-loop context to exactly what it was before entry, preventing cross-microtask leaks.
 *
 * **Isolation Guard:** If the store belongs to a destroyed {@link isolatedContext}, the
 * `fork()` handler fires a violation warning before executing the callback.
 *
 * Because `Awaited` implements the Thenable protocol, V8's native `await` automatically
 * calls `.then()` with its internal resume function, seamlessly integrating with `async/await`.
 *
 * @internal This class is not exported. Instances are created by {@link AsyncContext.awaited}.
 */
class Awaited<T> {
  /**
   * @param promise  - The underlying native Promise to wrap.
   * @param provide - A setter function that accepts a new store reference.
   * @param current  - The exact store reference to restore before each continuation.
   * @param restore - A function that restores the previous event-loop context.
   */
  constructor(
    private promise: Promise<T>,
    private provide: (value: unknown) => void,
    private current: unknown,
    private restore: () => void
  ) {}

  /**
   * Wraps a user-provided callback with context entry/exit bracketing.
   *
   * Returns `undefined` if no callback is provided, which causes the native Promise
   * to transparently forward the resolved value without executing any user code.
   *
   * @param fn - The user callback (e.g. `onfulfilled` or `onrejected`).
   * @returns A wrapped handler, or `undefined` if `fn` is not provided.
   */
  private fork(fn?: (arg: unknown) => unknown) {
    if (!fn) return;

    return (arg: unknown) => {
      this.provide(this.current);

      try {
        return fn(arg);
      } finally {
        this.restore();
      }
    };
  }

  /**
   * Thenable implementation that wraps both fulfillment and rejection handlers
   * with context bracketing via {@link fork}.
   *
   * Returns a new `Awaited` instance, propagating the same `current` store and
   * `isolated` flag through the entire chain.
   *
   * @param onresolved - Optional fulfillment handler.
   * @param onrejected  - Optional rejection handler.
   * @returns A new `Awaited` wrapping the chained Promise.
   */
  // biome-ignore lint/suspicious/noThenProperty: Expect thenable.
  public then<T>(onresolved?: (value: T) => T, onrejected?: (reason: unknown) => void): void {
    this.promise.then(this.fork(onresolved as never), this.fork(onrejected));
  }
}

/**
 * A synchronous, single-slot context container.
 *
 * Holds a mutable `store` reference that represents the "current" context for the
 * active synchronous execution frame. Context switching is performed by temporarily
 * overwriting `store`, executing a function, and restoring the previous value in a
 * `finally` block.
 *
 * When the executed function returns a Promise, the synchronous `finally` block
 * immediately restores the parent context (so the event loop is never polluted),
 * and an {@link Awaited} wrapper is returned to re-enter the correct scope
 * before each async continuation.
 *
 * @template T - The type of value stored (typically {@link AsyncStore}).
 */
export class AsyncContext<T> {
  /** The currently active store for this context. Mutated during {@link run} and {@link awaited}. */
  public store?: T;

  /**
   * @param init - Optional initial store value (e.g. the global root {@link AsyncStore}).
   */
  constructor(init?: T) {
    this.store = init;
  }

  /**
   * Executes `fn` with `store` as the active context, restoring the previous
   * context when `fn` completes (synchronously or asynchronously).
   *
   * @param store - The store to activate for the duration of `fn`.
   * @param fn    - The function to execute within the context.
   * @returns The return value of `fn`, or an {@link Awaited} if `fn` returns a Promise.
   */
  public run<R>(store: T, fn: () => R) {
    return this.awaited(fn, store);
  }

  /**
   * Core context-switching primitive. Executes `fn` and ensures the context is
   * deterministically restored regardless of sync return, async resolution, or exception.
   *
   * **Sync path:** `fn` runs, the result is returned, and `restore()` fires in the
   * `finally` block.
   *
   * **Async path:** `fn` returns a Promise. The `finally` block immediately restores
   * the parent context (keeping the event loop clean). A `.finally(restore)` callback
   * is attached to the inner Promise for native lifecycle cleanup. An {@link Awaited}
   * wrapper is returned, capturing `this.store` as `current` so that every chained
   * continuation re-enters the correct scope.
   *
   * @param fn    - The function to execute.
   * @param store - Optional store to activate before executing `fn`.
   * @returns The return value of `fn`, or an {@link Awaited} Thenable if `fn` returns a Promise.
   */
  public awaited<R>(fn: () => R, store?: T): R extends Promise<infer F> ? PromiseLike<F> : R {
    const current = this.store;
    const restore = () => {
      this.store = current;
    };

    if (store) {
      this.store = store;
    }

    try {
      const result = fn();

      if (isPromise(result)) {
        const isolate = this.store instanceof Map ? this.store.get(FLOATING_PROMISES_LIST_KEY) : undefined;
        const cleanup = () => {
          isolate?.delete(promise);
          restore();
        };

        const promise = new Awaited<R>(
          result as Promise<R>,
          (value) => (this.store = value as T),
          this.store as AsyncStore,
          cleanup
        );

        isolate?.add(promise);
        return promise as never;
      }

      return result as never;
    } finally {
      restore();
    }
  }

  /** Returns the currently active store. */
  public getStore() {
    return this.store;
  }
}

/** The root-level store. All {@link inContext} children ultimately chain back to this. */
const globalStore = new AsyncStore();
/** The singleton {@link AsyncContext} instance that powers the global helper functions. */
const globalAsyncCtx = new AsyncContext(globalStore);

export function resetGlobalStore() {
  globalStore.clear();
}

/**
 * An async contract is a function that temporarily sets a value in the async context,
 * and executes a function.
 */
export type AsyncContract = <T>(fn: () => T) => T extends Promise<infer R> ? PromiseLike<R> : T;

/**
 * Creates an async contract that temporarily sets the value of a given key in the async context.
 *
 * @param {AsyncKey} key - The key to set in the async context.
 * @param value - The value to set in the async context.
 * @param onstart - Optional callback that fires before the contract is entered.
 * @param onfinally - Optional callback that fires after the contract is exited.
 * @param runner
 * @returns AsyncContract
 */
export function asyncContract<T>(
  key: AsyncKey,
  value: T,
  onstart?: () => void,
  onfinally?: () => void,
  runner?: (fn: () => unknown) => unknown
): AsyncContract {
  return function asyncContract<R>(fn: () => R): R {
    onstart?.();

    const current = getAsyncContext(key);
    setAsyncContext(key, value);

    try {
      const result = typeof runner === 'function' ? runner(fn) : fn();

      if (result instanceof Promise) {
        return new Awaited(
          result,
          (next) => setAsyncContext(key, next),
          value,
          () => setAsyncContext(key, current)
        ) as never as R;
      }

      return result as R;
    } finally {
      setAsyncContext(key, current);
      onfinally?.();
    }
  } as never;
}

/**
 * Creates a child context scope that inherits from the currently active store.
 *
 * If the parent belongs to an {@link isolatedContext}, the child automatically
 * inherits the isolation flag so that floating-promise detection propagates
 * through nested scopes.
 *
 * @param fn    - The function to execute within the child context.
 * @param store - Optional pre-built {@link AsyncStore} to use instead of creating a new one.
 *                Useful for re-entering a previously captured store (e.g. in event callbacks).
 * @returns The return value of `fn`, or an {@link Awaited} Thenable if `fn` is async.
 *
 * @example
 * ```ts
 * await inContext(async () => {
 *   setAsyncContext('user', 'alice');
 *   await awaited(() => fetch('/api'));
 *   getAsyncContext('user'); // 'alice'
 * });
 * ```
 */
export function inContext<R>(fn: () => R, store?: AsyncStore) {
  const parent = globalAsyncCtx.getStore()!;
  const childStore = store ?? new AsyncStore(parent);

  const isolations = parent.get(FLOATING_PROMISES_LIST_KEY);

  if (isolations) childStore.set(FLOATING_PROMISES_LIST_KEY, isolations);

  return globalAsyncCtx.awaited(fn, childStore);
}

const FLOATING_PROMISES_LIST_KEY = Symbol('anchor-isolated-list');

/**
 * Creates a fully isolated context boundary with lifecycle-aware destruction tracking.
 *
 * When `fn` completes (or the returned Promise settles), the `destroyed` flag is set
 * to `true`. Any floating {@link Awaited} promise that later attempts to execute a
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
 *
 * @example
 * ```ts
 * // SSR request handler
 * await isolatedContext(async () => {
 *   setAsyncContext('requestId', req.id);
 *   const html = await awaited(() => renderApp());
 *   return html;
 * });
 * // After this point, any floating promise from renderApp()
 * // that tries to access context will trigger a violation.
 * ```
 */
export async function isolatedContext<R>(fn: () => R, strict = true) {
  const floatingPromises = new Set<Awaited<unknown>>();

  const parent = globalAsyncCtx.getStore()!;
  const isolatedStore = new AsyncStore([[FLOATING_PROMISES_LIST_KEY, floatingPromises]], parent);

  try {
    const result = await (globalAsyncCtx.awaited(fn, isolatedStore) as Promise<R>);

    if (floatingPromises.size) {
      const error = new Error('Hanging async context!');
      captureStack.violation.general(
        'Hanging promises detected!',
        `${floatingPromises.size} promises hanging in a detached isolated Async Context.`,
        error,
        [
          'Accessing async context in a detached isolation is highly discouraged.',
          '- Make sure to await your awaited function.',
          '- Avoid running a hanging "then" in an isolated context.',
          '- Documentation: https://anchorlib.dev/docs/async-context',
        ],
        getAsyncContext
      );

      if (strict) {
        throw error;
      }
    }

    return result as R;
  } finally {
    floatingPromises.clear();
  }
}

/**
 * Wraps a function that may return a Promise, ensuring the currently active
 * context is preserved across `await` boundaries.
 *
 * This is the primary user-facing API for async context safety. Any async
 * operation that crosses a microtask boundary **must** be wrapped with `awaited()`
 * to prevent context loss.
 *
 * @param fn - A function that returns a value or a Promise.
 * @returns The return value of `fn`, or an {@link Awaited} Thenable if `fn` returns a Promise.
 *
 * @example
 * ```ts
 * await inContext(async () => {
 *   setAsyncContext('key', 'value');
 *   // Without awaited(), context would be lost after the await:
 *   await awaited(() => fetch('/api'));
 *   getAsyncContext('key'); // 'value' — safely preserved
 * });
 * ```
 */
export function awaited<R>(fn: () => R) {
  return globalAsyncCtx.awaited<R>(fn);
}

/**
 * Reads a value from the currently active {@link AsyncStore}, walking up
 * the parent chain if the key is not found locally.
 *
 * @param key - The key to look up.
 * @returns The value, or `undefined` if not found in any ancestor.
 */
export function getAsyncContext<R>(key: AsyncKey): R | undefined {
  return globalAsyncCtx.getStore()!.get(key);
}

/**
 * Writes a value to the currently active {@link AsyncStore}.
 * The value is set on the **current** (innermost) store only and does not
 * propagate to parent stores.
 *
 * @param key   - The key to set.
 * @param value - The value to associate with the key.
 */
export function setAsyncContext(key: AsyncKey, value: AsyncValue) {
  return globalAsyncCtx.getStore()!.set(key, value);
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
 * for later re-entry via {@link inContext}.
 */
export const getAllAsyncContext = getAll as () => AsyncStore[];

function isPromise<T>(value: unknown): value is Promise<T> {
  return value instanceof Promise;
}
