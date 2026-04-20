import { IRPC_BASE_CONTEXT } from './enum.js';
import type { IRPCContext, IRPCContextProvider } from './types.js';

let syncContext: IRPCContext<unknown, unknown> | undefined;

const defaultProvider: IRPCContextProvider = {
  run(ctx, fn) {
    if (typeof window === 'undefined') {
      console.warn(
        '[IRPC] No context provider set. Call setContextProvider(new AsyncLocalStorage()) ' +
          'to isolate context across concurrent requests.',
      );
    }

    const prev = syncContext;
    syncContext = ctx;
    try {
      return fn();
    } finally {
      syncContext = prev;
    }
  },
  getStore() {
    return syncContext as IRPCContext<never, never>;
  },
};

let currentStore: IRPCContextProvider = defaultProvider;

/**
 * Sets the global context store for the IRPC system.
 * This store is used to manage context data across requests.
 * @param store - The context store implementation to use
 */
export function setContextProvider(store: IRPCContextProvider) {
  if (typeof store !== 'object' || store === null || typeof store.run !== 'function' || typeof store.getStore !== 'function') {
    throw new TypeError('[IRPC] Context provider must implement run() and getStore() methods.');
  }
  currentStore = store;
}

/**
 * Executes a function with the provided context.
 * If a context store is available, it runs the function within that context.
 * Otherwise, it executes the function directly.
 * @param ctx - The context to run the function with
 * @param fn - The function to execute
 * @returns The result of the executed function
 */
export function withContext<R>(ctx: IRPCContext<string | symbol, unknown>, fn: () => R) {
  return currentStore.run(ctx, fn);
}

/**
 * Creates a new context map with optional initial values.
 * @param init - Optional initial key-value pairs for the context
 * @returns A new Map instance representing the context
 */
export function createContext<K extends string | symbol, V>(init?: [K, V][]) {
  return new Map<K, V>(init);
}

/**
 * Sets a value in the current context.
 * @param key - The key to set in the context
 * @param value - The value to associate with the key
 */
export function setContext<V, K extends string | symbol = string>(key: K, value: V): void {
  const context = currentStore.getStore();
  context?.set(key, value);
}

/**
 * Gets a value from the current context.
 * @param key - The key to retrieve from the context
 * @param fallback - Optional fallback value if the key is not found
 * @returns The value associated with the key, or the fallback value if not found
 */
export function getContext<V, K extends string | symbol = string>(key: K, fallback?: V): V | undefined {
  const context = currentStore.getStore();
  const result = context?.get(key);

  if (typeof result === 'undefined' && typeof fallback !== 'undefined') return fallback;

  return result as V;
}

export function getAbortSignal(): AbortSignal | undefined {
  return getContext(IRPC_BASE_CONTEXT.ABORT_CONTROLLER);
}
