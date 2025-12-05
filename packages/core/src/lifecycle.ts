import { closure } from './utils/index.js';

const DEFAULT_CLEANUP_HANDLER = (_handler: () => void) => {};

const CLEANUP_SYMBOL = Symbol('cleanup-store');
closure.set(CLEANUP_SYMBOL, DEFAULT_CLEANUP_HANDLER);

/**
 * Registers a cleanup handler that will be called when the application shuts down.
 *
 * @param handler - A function to be executed during cleanup
 * @returns The result of calling the current cleanup handler implementation
 */
export function onCleanup(handler: () => void) {
  const cleanupHandler = closure.get<typeof DEFAULT_CLEANUP_HANDLER>(CLEANUP_SYMBOL);

  if (typeof cleanupHandler === 'function') {
    return cleanupHandler(handler);
  } else {
    return DEFAULT_CLEANUP_HANDLER(handler);
  }
}

/**
 * Sets a custom cleanup handler function that will be used by onCleanup.
 *
 * @param handler - A function that takes a cleanup handler and handles its registration
 * This allows for customization of how cleanup handlers are managed.
 */
export function setCleanUpHandler(handler: (handler: () => void) => void) {
  closure.set(CLEANUP_SYMBOL, handler);
}
