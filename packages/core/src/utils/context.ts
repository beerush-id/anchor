import type { KeyLike } from '../types.js';
import { captureStack } from '../exception.js';
import { anchor } from '../anchor.js';

export type Context<K extends KeyLike, V> = Map<K, V>;

let currentContext: Context<KeyLike, unknown> | undefined = undefined;
let currentRestore: (() => void) | undefined = undefined;

/**
 * Activates the given context and returns a restore function that can be used to revert to the previous context.
 * If the given context is already active, the current restore function is returned.
 *
 * @template K - The type of keys in the context.
 * @template V - The type of values in the context.
 * @param context - The context to activate.
 * @returns A function that restores the previous context when called.
 */
export function activateContext<K extends KeyLike, V>(context: Context<K, V>): () => void {
  if (currentContext === context) return currentRestore as () => void;

  let restored = false;
  const prevContext = currentContext;
  const prevRestore = currentRestore;

  currentContext = context;
  currentRestore = () => {
    if (!restored) {
      restored = true;
      currentContext = prevContext;
      currentRestore = prevRestore;
    }
  };

  return currentRestore;
}

/**
 * Retrieves the currently active context.
 *
 * @returns The currently active context, or undefined if no context is active.
 */
export function getActiveContext() {
  return currentContext;
}

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
 * Executes a function within the specified context.
 * The context is activated before the function is called and restored afterward.
 *
 * @template K - The type of keys in the context.
 * @template V - The type of values in the context.
 * @template T - The return type of the function.
 * @param context - The context to execute the function within.
 * @param fn - The function to execute.
 * @returns The result of the function execution.
 */
export function withinContext<K extends KeyLike, V, T>(context: Map<K, V>, fn: () => T): T {
  activateGlobalContext();

  const restore = activateContext(context);

  try {
    return fn();
  } finally {
    restore();
  }
}

/**
 * Executes a function within the global context.
 * The global context is activated before the function is called.
 * If an error occurs during execution, it is captured and logged.
 *
 * @template T - The return type of the function.
 * @param fn - The function to execute within the global context.
 * @returns The result of the function execution, or void if an error occurs.
 */
export function withinGlobalContext<T>(fn: () => T): T | void {
  activateGlobalContext();

  try {
    return fn();
  } catch (_error) {
    const error = new Error((_error as Error)?.message);
    captureStack.error.external('Exception occurred within global context execution.', error, withinGlobalContext);
  }
}

/**
 * Sets a value in the currently active context.
 * If no context is active, an error is logged.
 *
 * @template V - The type of the value to set.
 * @template K - The type of the key (must extend KeyLike).
 * @param key - The key to set the value for.
 * @param value - The value to set.
 * @throws {Error} If called outside of a context.
 */
export function setContext<V, K extends KeyLike = KeyLike>(key: K, value: V): void {
  activateGlobalContext();

  if (!currentContext) {
    const error = new Error('Outside of context.');
    captureStack.error.external(
      'Set context is called outside of context. Make sure you are calling it within a context.',
      error
    );
    return;
  }

  currentContext.set(key, value);
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
  activateGlobalContext();

  if (!currentContext) {
    const error = new Error('Outside of context.');
    captureStack.error.external(
      'Get context is called outside of context. Make sure you are calling it within a context.',
      error
    );
    return;
  }

  const result = currentContext.get(key);

  if (result !== undefined) {
    return result as V;
  } else {
    return fallback;
  }
}

let globalContextActivated = false;
/**
 * Activates the global context if it hasn't been activated yet and if the environment is a browser.
 * This function ensures that a default context is available for client-side operations.
 * It creates a new context and activates it, setting the global context activation flag to true.
 *
 * @template V - The type of values in the context.
 * @template K - The type of keys in the context.
 * @param context - Optional context to activate. If not provided, a new context will be created.
 * @remarks
 * This function is a no-op if:
 * - The global context has already been activated (`globalContextActivated` is true)
 * - The code is running in a non-browser environment (e.g., Node.js)
 */
export function activateGlobalContext<V, K extends KeyLike = KeyLike>(context?: Context<K, V>) {
  if (globalContextActivated || typeof window === 'undefined') return;

  activateContext(context ?? createContext());
  globalContextActivated = true;
}

/**
 * Deactivates the global context if it is currently active.
 * This function resets the global context activation flag to false and clears the current context.
 *
 * @remarks
 * This function is a no-op if the global context has not been activated yet.
 */
export function deactivateGlobalContext() {
  if (!globalContextActivated) return;

  globalContextActivated = false;
  currentContext = undefined;
}
