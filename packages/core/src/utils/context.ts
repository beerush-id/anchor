import { createClosure } from '../closure.js';
import { getScope as _getCtx, setScope as _setCtx } from '../context.js';
import { captureStack } from '../exception.js';
import type { KeyLike } from '../types.js';

/**
 * @todo Remove in the next release.
 * @deprecated DEPRECATED APIS. WILL BE REMOVED SOON.
 */

export const RENDER_CONTEXT_KEY = Symbol('render-context');

/**
 * A context class that extends Map to provide hierarchical context storage.
 * It supports parent-child relationships, allowing values to be inherited from parent contexts.
 */
export class RenderContext extends Map {
  /**
   * Creates a new RenderContext instance.
   * @param name - The name of the context, defaults to 'Anonymous'.
   * @param parent - An optional parent context to inherit values from.
   */
  constructor(
    public name = 'Anonymous',
    public parent?: RenderContext
  ) {
    super();
  }

  /**
   * Retrieves a value by key, searching the current context first and then the parent context chain.
   * @template T - The expected type of the value.
   * @param key - The key to look up.
   * @returns The value associated with the key, or undefined if not found in this or any parent context.
   */
  get<T>(key: KeyLike): T | undefined {
    return (super.get(key) ?? this.parent?.get(key)) as T | undefined;
  }
}

/**
 * Creates a new RenderContext instance.
 * If no parent is provided, it attempts to use the currently active render context.
 * @param name - The name for the new context, defaults to 'Anonymous'.
 * @param parent - An optional explicit parent context.
 * @returns A new RenderContext instance.
 */
export function createRenderCtx(name = 'Anonymous', parent?: RenderContext) {
  return new RenderContext(name, parent ?? getRenderCtx());
}

/**
 * Sets the current active render context in the closure storage.
 * @param ctx - The context to set, or undefined to clear the current context.
 */
export function setRenderCtx(ctx?: RenderContext) {
  _setCtx(RENDER_CONTEXT_KEY, ctx);
}

/**
 * Retrieves the current active render context from the closure storage.
 * @returns The current RenderContext instance, or undefined if no context is active.
 */
export function getRenderCtx(): RenderContext | undefined {
  return _getCtx(RENDER_CONTEXT_KEY);
}

/**
 * A context object which is essentially a reactive Map that can store key-value pairs.
 *
 * @template K - The type of keys in the context, must extend KeyLike
 * @template V - The type of values in the context
 */
export type Context<K extends KeyLike = KeyLike, V = unknown> = Map<K, V>;

const ctxClosure = createClosure(Symbol('context'));

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

  return ctxClosure.run(ctx, fn);
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
  const ctx = getRenderCtx() ?? ctxClosure;
  ctx.set(key, value as never);
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
  const result = getRenderCtx()?.get(key) ?? ctxClosure.get(key);

  if (typeof result !== 'undefined') {
    return result as V;
  }

  return fallback;
}

/**
 * Retrieves all key-value pairs from the currently active context.
 * If no context is active, an empty context is returned.
 *
 * @template K - The type of keys in the context, must extend KeyLike
 * @template V - The type of values in the context
 * @returns A new Context instance containing all key-value pairs from the current context,
 *          or an empty Context if no context is active
 */
export function getAllContext<K extends KeyLike, V>() {
  return ctxClosure.all() as Context<K, V>;
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
export function createContext<K extends KeyLike, V>(init?: [K, V][]): Context<K, V> {
  return new Map(init);
}

export type ContextProvider = <R>(fn: () => R) => R;

/**
 * Creates a context provider function that temporarily sets a key-value pair in the context storage
 * and restores the previous value after the provided function executes.
 *
 * @template K - The type of the key (must extend KeyLike)
 * @template V - The type of the value
 * @param key - The key to set in the context
 * @param value - The value to associate with the key
 * @returns A function that takes another function to execute within the modified context
 */
export function contextProvider<K extends KeyLike, V>(key: K, value: V): ContextProvider {
  return <R>(fn: () => R) => {
    const currentValue = getContext(key);
    setContext(key, value);

    try {
      return fn();
    } finally {
      setContext(key, currentValue);
    }
  };
}
