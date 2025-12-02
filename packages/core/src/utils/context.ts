import { captureStack } from '../exception.js';
import { mutable } from '../ref.js';
import type { KeyLike } from '../types.js';
import { createClosure } from './closure.js';

/**
 * A context object which is essentially a reactive Map that can store key-value pairs.
 *
 * @template K - The type of keys in the context, must extend KeyLike
 * @template V - The type of values in the context
 */
export type Context<K extends KeyLike = KeyLike, V = unknown> = Map<K, V>;

const contextStorage = createClosure(Symbol('context'));

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

  return contextStorage.run(ctx, fn);
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
  contextStorage.set(key, value as never);
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
  const result = contextStorage.get(key);

  if (typeof result !== 'undefined') {
    return result as V;
  }

  return fallback;
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
  return mutable(new Map<K, V>(init), { recursive: true });
}
