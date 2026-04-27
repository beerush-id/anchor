import { getAsyncContext, setAsyncContext } from './context.js';
import type { RefStack } from './types.js';

export const STACK_SYMBOL = Symbol('call-stack');

/**
 * Creates a new reference stack scope for managing reactive references.
 *
 * @returns A new RefStack object with initialized index and empty states map
 */
export function createStack(): RefStack {
  return {
    index: 0,
    states: new Map(),
  };
}

/**
 * Executes a function within a specific reference stack context.
 *
 * @template T - The return type of the executed function
 * @param scope - The reference scope to use during execution
 * @param fn - The function to execute within the given scope
 * @returns The result of the executed function
 */
export function withStack<T>(scope: RefStack, fn: () => T) {
  const prevStack = getAsyncContext<RefStack>(STACK_SYMBOL);
  setAsyncContext(STACK_SYMBOL, scope);

  try {
    return fn();
  } finally {
    setAsyncContext(STACK_SYMBOL, prevStack);
  }
}

/**
 * Retrieves the current reference stack context.
 *
 * @returns The current RefStack if one exists, undefined otherwise
 */
export function getCurrentStack() {
  return getAsyncContext<RefStack>(STACK_SYMBOL);
}
