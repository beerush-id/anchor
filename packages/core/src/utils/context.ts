import { anchor } from '../anchor.js';
import { captureStack } from '../exception.js';
import type { KeyLike } from '../types.js';
import { isBrowser } from './inspector.js';

export type Context<K extends KeyLike, V> = Map<K, V>;

export type ContextStore = {
  run<R>(ctx: Context<KeyLike, unknown>, fn: () => R): void;
  getStore(): Context<KeyLike, unknown>;
};

let currentStore: ContextStore | undefined;

/**
 * Sets the current context store to be used for context management.
 *
 * @param store - The context store implementation to use
 */
export function setContextStore(store: ContextStore) {
  currentStore = store;
}

/**
 * Executes a function within the specified context using the current context store.
 * If no context store is available, executes the function directly and logs an error.
 *
 * @template R - The return type of the function
 * @param ctx - The context to run the function within
 * @param fn - The function to execute
 * @returns The result of the function execution
 * @throws {Error} If called outside a context and no context store is available
 */
export function withContext<R>(ctx: Context<KeyLike, unknown>, fn: () => R) {
  if (!(ctx instanceof Map)) {
    const error = new Error('Invalid context argument.');
    captureStack.error.validation('Run in context is called with invalid context argument.', error, false, withContext);

    return fn();
  }

  if (!isBrowser() && !currentStore) {
    const error = new Error('Outside of context.');
    captureStack.error.external(
      'Run in context is called outside of context. Make sure you are calling it within a context.',
      error,
      withContext
    );

    return fn();
  }

  if (!currentStore) {
    const prevContext = currentContext;
    currentContext = ctx;

    try {
      return fn();
    } finally {
      currentContext = prevContext;
    }
  }

  return currentStore?.run(ctx, fn) ?? fn();
}

let currentContext: Context<KeyLike, unknown> | undefined;

/**
 * Creates a new context with optional initial key-value pairs.
 * The context is anchored with non-recursive behavior.
 *
 * @template K - The type of keys in the context.
 * @template V - The type of values in the context.
 * @param init - Optional array of key-value pairs to initialize the context with.
 * @returns A new anchored Map instance representing the context.
 */
export function createContext<K extends KeyLike, V>(init?: [K, V][]) {
  return anchor(new Map<K, V>(init), { recursive: true });
}

/**
 * Sets a value in the currently active context.
 * If no context is active, an error is logged.
 *
 * @template V - The type of the value to set.
 * @template K - The type of the key (must extend KeyLike).
 * @param key - The key to set the value for.
 * @param value - The value to set.
 * @throws {Error} If called outside a context.
 */
export function setContext<V, K extends KeyLike = KeyLike>(key: K, value: V): void {
  ensureContext();

  const context = currentStore?.getStore() ?? currentContext;
  if (!context) {
    const error = new Error('Outside of context.');
    captureStack.error.external(
      'Set context is called outside of context. Make sure you are calling it within a context.',
      error
    );
    return;
  }

  context.set(key, value);
}

/**
 * Retrieves a value from the currently active context by key.
 * If no context is active, an error is logged and undefined is returned.
 *
 * @template V - The type of the value to retrieve.
 * @template K - The type of the key (must extend KeyLike).
 * @param key - The key to retrieve the value for.
 * @returns The value associated with the key, or undefined if not found or if called outside a context.
 * @throws {Error} If called outside a context.
 */
export function getContext<V, K extends KeyLike = KeyLike>(key: K): V | undefined;

/**
 * Retrieves a value from the currently active context by key.
 * If no context is active, an error is logged and the fallback value is returned.
 *
 * @template V - The type of the value to retrieve.
 * @template K - The type of the key (must extend KeyLike).
 * @param key - The key to retrieve the value for.
 * @param fallback - A fallback value to return if the key is not found.
 * @returns The value associated with the key, or the fallback value if not found or if called outside a context.
 * @throws {Error} If called outside a context.
 */
export function getContext<V, K extends KeyLike = KeyLike>(key: K, fallback: V): V;

/**
 * Retrieves a value from the currently active context by key.
 * If no context is active, an error is logged and undefined is returned.
 *
 * @template V - The type of the value to retrieve.
 * @template K - The type of the key (must extend KeyLike).
 * @param key - The key to retrieve the value for.
 * @param fallback - An optional fallback value to return if the key is not found.
 * @returns The value associated with the key, or undefined if not found or if called outside a context.
 * @throws {Error} If called outside a context.
 */
export function getContext<V, K extends KeyLike = KeyLike>(key: K, fallback?: V): V | undefined {
  ensureContext();

  const context = currentStore?.getStore() ?? currentContext;
  if (!context) {
    const error = new Error('Outside of context.');
    captureStack.error.external(
      'Get context is called outside of context. Make sure you are calling it within a context.',
      error
    );
    return;
  }

  const result = context.get(key);

  if (result !== undefined) {
    return result as V;
  } else {
    return fallback;
  }
}

/**
 * Ensures a context is available in browser environments.
 *
 * This function checks if the code is running in a browser environment (where `window` is defined)
 * and if no context is currently active. If both conditions are met, it creates a new context
 * and sets it as the current context with an empty restore function.
 *
 * This is primarily used to ensure that client-side code has a default context available
 * when no explicit context has been set up.
 *
 * @remarks
 * This function is a no-op in server-side environments (where `window` is undefined)
 * or when a context is already active.
 */
export function ensureContext(context?: Context<KeyLike, unknown>, force?: boolean) {
  if (force) {
    currentContext = context;
    return;
  }

  if (typeof window !== 'undefined' && typeof currentContext === 'undefined') {
    currentContext = context ?? createContext();
  }
}
