import { $module } from '../module.js';
import { isFunction } from '../utils/typeof.js';

/** Key type for {@link AsyncStore} entries. Accepts any value, including Symbols. */
// biome-ignore lint/suspicious/noExplicitAny: Expected.
export type AsyncKey = any;
/** Value type for {@link AsyncStore} entries. */
// biome-ignore lint/suspicious/noExplicitAny: Expected.
export type AsyncValue = any;

/**
 * An active execution context within an {@link AsyncScope}.
 *
 * Each call to {@link AsyncScope.run} creates a new runner that holds the
 * store for that execution frame and a restore point for resuming the
 * previous global checkpoint state after suspension.
 *
 * @template T - The store type held by this runner.
 */
export type AsyncRunner<T> = {
  store: T;
  queues?: Set<Future<AsyncValue>>;
  restorePoint?: AsyncCheckpoint;
};

/**
 * A snapshot of the global async state at a given point in time.
 *
 * Checkpoints capture the active {@link AsyncScope}, its current store value,
 * and the active {@link AsyncRunner}. They are used by {@link restoreCheckpoint}
 * to atomically restore the global state during context switches.
 */
export type AsyncCheckpoint = {
  scope?: AsyncScope<unknown>;
  store?: unknown;
  runner?: AsyncRunner<unknown>;
};

/**
 * The currently active global checkpoint.
 *
 * This is the single coordination point for all async context tracking.
 * It is read by {@link Future} on construction (to capture state) and
 * written by {@link restoreCheckpoint} during suspend/resume transitions.
 */
let globalCheckpoint: AsyncCheckpoint | undefined;

/**
 * Tracks all runners with active (pending) async chains.
 *
 * Runners are added when {@link AsyncScope.run} detects an async callback
 * and removed when the async chain completes. When the set is empty,
 * {@link globalCheckpoint} is cleared.
 */
export const ASYNC_CALL_QUEUES: Set<Future<unknown>> = new Set();

/**
 * An isomorphic async context scope that preserves store values across
 * `await` boundaries without monkey-patching globals.
 *
 * Each scope manages its own store independently. Context is preserved
 * by wrapping async operations with {@link awaited} and using
 * `await scope.run()` for nested execution frames.
 *
 * @template T - The type of the store held by this scope.
 *
 * @example
 * ```ts
 * const ctx = new AsyncScope<Map<string, string>>();
 *
 * await ctx.run(new Map([['user', 'alice']]), async () => {
 *   console.log(ctx.getStore()?.get('user')); // 'alice'
 *
 *   await awaited(fetchData());
 *
 *   console.log(ctx.getStore()?.get('user')); // 'alice' — preserved
 * });
 * ```
 */
export class AsyncScope<T> {
  public store?: T;
  public runner?: AsyncRunner<T>;

  constructor(init?: T) {
    this.store = init;
  }

  /**
   * Returns the currently active store for this scope, or `undefined`
   * if no {@link run} is active.
   */
  public getStore(): T | undefined {
    return this.store;
  }

  /**
   * Executes `fn` with the given `store` as the active store for this scope.
   *
   * Nested calls to `run` on the same or different scopes are supported.
   * Each `run` creates its own checkpoint and runner, and cleanup is handled
   * via the restore closure in `finally`.
   *
   * @param store - The store value to activate for the duration of `fn`.
   * @param fn - The callback to execute within this scope.
   * @param queues - An optional set of queues to add this Future to.
   * @returns The return value of `fn`, or a {@link Future} thenable if `fn` returns a Promise.
   */
  public run<R>(store: T, fn: () => R, queues?: Set<Future<unknown>>): R;
  /**
   * Executes asynchronous `fn` with the given `store` as the active store for this scope.
   *
   * Nested calls to `run` on the same or different scopes are supported.
   * Each `run` creates its own checkpoint and runner, and cleanup is handled
   * via the restore closure in `finally`.
   *
   * @param store - The store value to activate for the duration of `fn`.
   * @param fn - The callback to execute within this scope.
   * @param queues - An optional set of queues to add this Future to.
   * @returns The return value of `fn`, or a {@link Future} thenable if `fn` returns a Promise.
   */
  public run<R>(store: T, fn: () => Promise<R>, queues?: Set<Future<unknown>>): Future<R>;
  public run<R>(store: T, fn: () => R | Promise<R>, queues?: Set<Future<unknown>>) {
    const restorePoint: AsyncCheckpoint | undefined = globalCheckpoint;
    const checkpoint: AsyncCheckpoint = {
      scope: this,
      store: this.store,
      runner: this.runner,
    };

    const runner: AsyncRunner<T> = { store, queues, restorePoint };

    this.runner = runner;
    this.store = store;

    globalCheckpoint = { scope: this, store, runner };

    const restore = () => {
      restoreCheckpoint(checkpoint);
      restoreCheckpoint(restorePoint);
    };

    const future = new Future();

    try {
      const result = fn();

      if (result instanceof Promise) {
        future.promise = result;
        future.restore = restore;
        return future;
      } else {
        future.detach();
      }

      return result;
    } finally {
      restore();
    }
  }
}

export function hasALS() {
  return $module.async && !($module.async instanceof AsyncScope);
}

let currentFuture: Future<unknown> | undefined;

/**
 * A custom thenable that intercepts `await` to restore async context
 * before the continuation runs.
 *
 * Futures are created by {@link AsyncScope.run} (for async callbacks)
 * and by {@link awaited} (for explicit async boundary wrapping).
 *
 * **Run-level Futures** (created by `run`) carry a `restore` callback
 * that performs final cleanup when the async chain completes.
 *
 * **Intermediate Futures** (created by `awaited`) have no `restore`
 * callback. They capture the current checkpoint on construction and
 * restore it in their `.then` wrapper when the promise settles.
 *
 * This class is intentionally non-chainable — `.then()` returns `void`.
 *
 * @template T - The resolved value type of the wrapped promise.
 */
export class Future<T> {
  /** The store value captured from {@link globalCheckpoint} at construction time. */
  private store: unknown | undefined = globalCheckpoint?.store;
  /** The scope captured from {@link globalCheckpoint} at construction time. */
  private scope: AsyncScope<unknown> | undefined = globalCheckpoint?.scope;
  /** The runner captured from {@link globalCheckpoint} at construction time. */
  private runner: AsyncRunner<unknown> | undefined = globalCheckpoint?.runner;

  /** The parent Future, if any. */
  private parent: Future<unknown> | undefined;
  private restorePoint?: AsyncCheckpoint | undefined;

  /** Whether the Future is awaited */
  public awaited = false;

  /**
   * @param promise - The underlying promise to wrap.
   * @param restore - Optional cleanup callback, provided only by {@link AsyncScope.run}
   *                  for run-level Futures. When present, it fires in `finally` after
   *                  the `.then` continuation and skips dynamic restorePoint updates.
   */
  constructor(
    public promise?: Promise<T>,
    public restore?: () => void
  ) {
    this.parent = currentFuture;
    currentFuture = this;

    queueCall(this);
    this.runner?.queues?.add(this);
  }

  /**
   * Wraps a `.then` callback with context restoration logic.
   *
   * On invocation, the wrapper:
   * 1. Captures the current {@link globalCheckpoint} as the new restore point.
   * 2. Builds a checkpoint from the state captured at construction time.
   * 3. For intermediate Futures (no `restore`), updates the runner's
   *    `restorePoint` to the captured checkpoint — enabling the next
   *    suspension to restore to the correct interleaved state.
   * 4. Restores the checkpoint (sets scope store and global state).
   * 5. Calls the original callback.
   * 6. In `finally`, fires the `restore` callback if this is a run-level Future.
   */
  private wrap(fn: (value?: unknown) => unknown) {
    if (typeof fn !== 'function') return;

    return (value?: unknown) => {
      let restorePoint: AsyncCheckpoint | undefined = globalCheckpoint;
      const floating = !!(this.parent && !this.parent.awaited);

      if (floating) {
        restorePoint = { scope: this.scope, runner: this.scope?.runner, store: this.scope?.store };
        this.parent!.attach(restorePoint);
      } else {
        this.parent = undefined;
      }

      const checkpoint: AsyncCheckpoint = { scope: this.scope, runner: this.runner, store: this.store };

      if (checkpoint.runner && !this.restore) {
        checkpoint.runner.restorePoint = restorePoint;
      }

      restoreCheckpoint(checkpoint);

      try {
        return fn(value);
      } finally {
        this.detach();
      }
    };
  }

  /**
   * Registers fulfillment and rejection handlers on the underlying promise,
   * wrapping each with context restoration logic.
   *
   * Returns `void` — this thenable is intentionally non-chainable.
   * The `await` keyword consumes it directly.
   */
  // biome-ignore lint/suspicious/noThenProperty: Expect thenable.
  public then(onresolved?: (value: T) => unknown, onrejected?: (reason: unknown) => unknown): void {
    restoreCheckpoint(this.runner?.restorePoint);

    this.promise!.then(this.wrap(onresolved as never), this.wrap(onrejected as never));
    this.awaited = true;
  }

  public attach(restorePoint?: AsyncCheckpoint) {
    if (!this.promise) return;

    this.awaited = true;
    this.restorePoint = restorePoint;
    this.promise.then(this.wrap(() => {}));
  }

  public detach() {
    currentFuture = this.parent;
    resolveCall(this);
    this.runner?.queues?.delete(this);

    if (this.restorePoint) {
      restoreCheckpoint(this.restorePoint);
      restoreCheckpoint(undefined);
    } else {
      this.restore?.();
    }
  }
}

/**
 * Wraps an async operation to preserve the currently active {@link AsyncScope}
 * across `await` boundaries.
 *
 * This is the primary user-facing API for async context safety in the browser.
 * Any async operation that crosses a microtask boundary **must** be wrapped
 * with `awaited()` to prevent context loss.
 *
 * Accepts either a `Promise` directly or a function that returns a value or `Promise`.
 * Sync return values from functions are wrapped in `Promise.resolve()` to ensure
 * the Future mechanism handles the `await` microtask boundary.
 *
 * @param promise - A Promise, or a function returning a value or Promise.
 * @returns A {@link Future} thenable that restores context when awaited.
 *
 * @example
 * ```ts
 * // With a promise.
 * const data = await awaited(fetch('/api'));
 *
 * // With a function.
 * const result = await awaited(() => someAsyncOperation());
 *
 * // With a function that may return sync or async.
 * const value = await awaited(() => cachedOrFetch(key));
 * ```
 */
export function awaited<T>(promise: T | Promise<T>): Future<T>;
export function awaited<T>(fn: () => Promise<T> | T): Future<T>;

export function awaited<T>(promise: T | Promise<T> | (() => T | Promise<T>)): Future<T> {
  if (hasALS()) return (isFunction(promise) ? (promise as () => unknown)() : promise) as Future<T>;

  const future = new Future<T>();

  let result: T | Promise<T> = promise as T;

  if (isFunction(promise)) {
    result = (promise as () => Promise<T>)();
  }

  if (!(result instanceof Promise)) {
    result = Promise.resolve(result);
  }

  future.promise = result;
  return future;
}

/**
 * Registers a runner as having an active async chain.
 * @internal
 */
function queueCall(runner: Future<unknown>) {
  ASYNC_CALL_QUEUES.add(runner);
}

/**
 * Marks a runner's async chain as complete and removes it from the queue.
 * When all async chains have resolved, clears {@link globalCheckpoint}.
 * @internal
 */
function resolveCall(runner: Future<unknown>) {
  ASYNC_CALL_QUEUES.delete(runner);

  if (!ASYNC_CALL_QUEUES.size) {
    globalCheckpoint = undefined;
  }
}

/**
 * Atomically restores the global async state from a checkpoint.
 *
 * Sets {@link globalCheckpoint} to the given checkpoint, then updates
 * the checkpoint's scope with the stored `store` and `runner` values.
 * If the checkpoint is `undefined`, clears the global state.
 * @internal
 */
export function restoreCheckpoint(checkpoint?: AsyncCheckpoint) {
  globalCheckpoint = checkpoint;
  if (!globalCheckpoint) return;

  const scope = globalCheckpoint.scope;

  if (scope) {
    scope.store = globalCheckpoint.store;
    scope.runner = globalCheckpoint.runner;
  }
}
