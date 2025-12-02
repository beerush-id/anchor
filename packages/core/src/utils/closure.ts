import { ANCHOR_SETTINGS } from '../constant.js';
import { captureStack } from '../exception.js';
import type { KeyLike } from '../types.js';
import { isBrowser } from './inspector.js';

export type Closure = Map<unknown, unknown>;
export type ClosureMap = Map<KeyLike, Closure>;

/**
 * A storage mechanism for closures with context isolation.
 *
 * @template T - The type of data stored in the closure
 */
export type ClosureStorage<K, V> = {
  /**
   * Retrieves a value by key from the closure
   *
   * @param key - The key to retrieve the value for
   * @returns The value associated with the key, or undefined if not found
   */
  get(key: K): V | undefined;

  /**
   * Sets a value by key in the closure
   *
   * @param key - The key to set the value for
   * @param value - The value to set
   * @returns The closure storage instance for chaining
   */
  set(key: K, value: V): ClosureStorage<K, V>;

  /**
   * Retrieves all key-value pairs from the closure
   *
   * @returns A Map containing all key-value pairs in the closure, or undefined if called outside of context
   */
  all(): Closure;

  /**
   * Executes a function within the provided context
   *
   * @template R - The return type of the function
   * @param ctx - The context to run the function within
   * @param fn - The function to execute
   * @returns The result of the function execution
   */
  run<R>(ctx: Closure, fn: () => R): R;
};

/**
 * Interface for closure adapter mechanisms, typically used on the server-side
 * for context management with features like AsyncLocalStorage.
 *
 * @template T - The type of data stored in the async storage
 */
export class ClosureAdapter {
  /**
   * Executes a function within the provided context
   *
   * @template R - The return type of the function
   * @param map - The context/data to run the function with
   * @param fn - The function to execute
   * @returns The result of the function execution
   */
  public run<R>(map: ClosureMap, fn: () => R): R {
    this.warn();

    const prevClosure = currentClosure;
    currentClosure = map;

    try {
      return fn();
    } finally {
      currentClosure = prevClosure;
    }
  }

  /**
   * Returns the current store or undefined
   *
   * @returns The current store or undefined
   */
  public getStore() {
    this.warn();
    return currentClosure;
  }

  private warn() {
    if (!isBrowser() && ANCHOR_SETTINGS.closureWarning) {
      const error = new Error('AsyncLocalStorage not implemented.');
      captureStack.violation.general(
        'Missing AsyncLocalStorage implementation detected.',
        'Attempted to use async storage on the server without implementing AsyncLocalStorage.',
        error,
        [
          'AsyncLocalStorage is not available in this environment. This could lead to race condition.',
          '- Make sure to call the "implementAsyncStorage()" on your server entry file.',
          '- Consider using a different storage mechanism or environment.',
          'Documentation: https://anchorlib.dev/docs/context#server-store',
        ],
        this.run,
        this.getStore
      );
    }
  }
}

let currentClosure: ClosureMap = new Map();
let closureAdapter = new ClosureAdapter();

/**
 * A global closure utility object for managing context values.
 * Provides simple get/set operations on the current context.
 */
export const closure = {
  /**
   * Retrieves a value by key from the current closure context.
   *
   * @template V - The type of the value being retrieved
   * @param key - The key to retrieve the value for
   * @returns The value associated with the key, or undefined if not found
   * @throws {Error} If no closure adapter is available
   */
  get<V>(key: KeyLike): V | undefined {
    const storage = closureAdapter?.getStore();

    if (!storage) {
      throw new Error('Closure adapter is missing.');
    }

    return storage.get(key as never) as V;
  },

  /**
   * Sets a value by key in the current closure context.
   *
   * @template V - The type of the value being set
   * @param key - The key to set the value for
   * @param value - The value to set
   * @returns The closure object for chaining
   * @throws {Error} If no closure adapter is available
   */
  set<V>(key: KeyLike, value: V) {
    const storage = closureAdapter?.getStore();

    if (!storage) {
      throw new Error('Closure adapter is missing.');
    }

    storage.set(key as never, value as Closure);
    return this;
  },
};

/**
 * Sets a custom async storage adapter for server-side context management.
 * This is typically used to integrate with Node.js AsyncLocalStorage or similar server-side storage mechanisms.
 *
 * @param adapter - An implementation of the AsyncStorage interface to be used for context management on the server
 * @throws {Error} If the provided storage does not implement the required methods
 */
export function setAsyncStorageAdapter<A extends ClosureAdapter>(adapter: A) {
  if (typeof adapter.run !== 'function' || typeof adapter.getStore !== 'function') {
    throw new Error('Invalid Closure Adapter: Expected object with "run()" and "getStore()" properties.');
  }

  closureAdapter = adapter;
}

/**
 * Creates a closure storage with isolated context using a symbol identifier.
 * This function is used internally to create isolated context storages,
 * ensuring that different parts of an application don't interfere with each other's context values.
 *
 * @template T - The type of data stored in the closure
 * @param id {string|symbol} - A string or symbol used to identify and isolate this closure storage
 * @returns A ClosureStorage instance for managing context values
 * @throws {Error} If the closure adapter is missing
 */
export function createClosure<K = KeyLike, V = unknown>(id: KeyLike): ClosureStorage<K, V> {
  const ensureStorage = () => {
    const storage = closureAdapter?.getStore();

    if (!storage) {
      throw new Error('Closure adapter is missing.');
    }

    if (!storage.has(id)) {
      storage.set(id, new Map());
    }

    return storage;
  };

  return {
    get(key) {
      const storage = ensureStorage();
      const context = storage.get(id);

      if (!context) {
        const error = new Error('Outside of context.');
        captureStack.error.external(
          'Get context is called outside of context. Make sure you are calling it within a context.',
          error
        );
        return;
      }

      return context.get(key) as V;
    },
    set(key, value) {
      const storage = ensureStorage();
      const context = storage.get(id);

      if (!context) {
        const error = new Error('Outside of context.');
        captureStack.error.external(
          'Set context is called outside of context. Make sure you are calling it within a context.',
          error
        );

        return this;
      }

      context.set(key, value);
      return this;
    },
    all() {
      const storage = ensureStorage();
      const context = storage.get(id);

      if (!context) {
        const error = new Error('Outside of context.');
        captureStack.error.external(
          'All context is called outside of context. Make sure you are calling it within a context.',
          error
        );

        return;
      }

      return context as Closure;
    },
    run<R>(ctx: Closure, fn: () => R) {
      const storage = ensureStorage();

      const currentCtx = storage.get(id);
      storage.set(id, ctx as Closure);

      try {
        return fn();
      } finally {
        storage.set(id, currentCtx as Closure);
      }
    },
  } as ClosureStorage<K, V>;
}

/**
 * Interface for a closure runner function that can execute code within a context.
 * Provides both synchronous and asynchronous execution capabilities.
 */
export interface ClosureRunner {
  /**
   * Synchronously executes a function within an optional context.
   *
   * @template R - The return type of the function
   * @param fn - The function to execute
   * @param ctx - Optional context map to run the function within
   * @returns The result of the function execution
   */
  <R>(fn: () => R, ctx?: ClosureMap): R;

  /**
   * Asynchronously executes a function within an optional context.
   *
   * @template R - The return type of the function
   * @param fn - The function to execute (can return either a Promise or direct value)
   * @param ctx - Optional context map to run the function within
   * @returns A promise resolving to the result of the function execution
   */
  async<R>(fn: () => Promise<R> | R, ctx?: ClosureMap): Promise<R>;
}

/**
 * Executes a function within a new empty context.
 * This function creates a fresh context (empty Map) and runs the provided function within that context.
 * It's useful for isolating operations that need a clean context environment.
 *
 * @template T - The return type of the function
 * @param fn - The function to execute within the new context
 * @param ctx - Optional context to initialize the new context with
 * @returns The result of the function execution
 * @throws {Error} If async storage is not properly implemented on the server
 */
const runClosure = ((fn, ctx = new Map()) => {
  try {
    return closureAdapter.run(ctx, fn);
  } finally {
    ctx.clear();
  }
}) as ClosureRunner;

/**
 * Executes an asynchronous function within a new empty context.
 * This function creates a fresh context (empty Map) and runs the provided asynchronous function within that context.
 * It's useful for isolating operations that need a clean context environment.
 *
 * @template T - The return type of the function
 * @param fn - The asynchronous function to execute within the new context
 * @param ctx - Optional context to initialize the new context with
 * @returns The result of the asynchronous function execution
 * @throws {Error} If async storage is not properly implemented on the server
 */
runClosure.async = async (fn, ctx = new Map()) => {
  try {
    return await closureAdapter.run(ctx, fn);
  } finally {
    ctx.clear();
  }
};

export const isolated = runClosure as ClosureRunner;
