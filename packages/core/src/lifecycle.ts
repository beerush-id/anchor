import { captureStack } from './exception.js';
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
 * Registers a cleanup handler that will be called globally when the application shuts down.
 *
 * This function directly calls the current global cleanup handler with the provided handler function.
 * Unlike onCleanup which may have customized behavior, this function bypasses any custom cleanup
 * handling and directly invokes the stored cleanup mechanism.
 *
 * @param handler - A function to be executed during global cleanup
 */
export function onGlobalCleanup(handler: () => void) {
  const cleanupHandler = closure.get<typeof DEFAULT_CLEANUP_HANDLER>(CLEANUP_SYMBOL);
  cleanupHandler?.(handler);
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

/**
 * Creates a lifecycle manager that can handle cleanup operations.
 *
 * The lifecycle manager provides two methods:
 * - run: Executes a function within a scope where cleanup handlers are collected
 * - destroy: Executes all collected cleanup handlers and clears them
 *
 * When run() is called, it temporarily overrides the global cleanup handler
 * to collect cleanup functions registered via onCleanup() during execution.
 * After the function completes, the original cleanup handler is restored.
 *
 * @returns An object with run and destroy methods for lifecycle management
 */
export function createLifecycle() {
  const cleanupHandlers = new Set<() => void>();

  return {
    /**
     * Runs a function while collecting cleanup handlers.
     *
     * During execution of the provided function, any calls to onCleanup()
     * will register handlers in this lifecycle's collection rather than
     * the global one. After execution, the previous global handler is restored.
     *
     * @param fn - The function to execute
     * @returns The result of the executed function
     */
    run<R>(fn: () => R) {
      const prevCleanupHandler = closure.get<typeof DEFAULT_CLEANUP_HANDLER>(CLEANUP_SYMBOL);

      closure.set(CLEANUP_SYMBOL, (handler: () => void) => {
        if (typeof handler !== 'function') {
          const error = new Error('Invalid cleanup handler');
          captureStack.error.argument('Cleanup handler must be a function', error, this.run);
          return;
        }

        cleanupHandlers.add(handler);
      });

      try {
        return fn();
      } finally {
        closure.set(CLEANUP_SYMBOL, prevCleanupHandler);
      }
    },

    /**
     * Runs an async function while collecting cleanup handlers.
     *
     * Similar to run(), but awaits the Promise before restoring the
     * previous cleanup handler. This ensures cleanup handlers registered
     * during async operations are properly scoped.
     *
     * @param fn - The async function to execute
     * @returns A Promise resolving to the result of the executed function
     */
    async runAsync<R>(fn: () => Promise<R>): Promise<R> {
      const prevCleanupHandler = closure.get<typeof DEFAULT_CLEANUP_HANDLER>(CLEANUP_SYMBOL);

      closure.set(CLEANUP_SYMBOL, (handler: () => void) => {
        if (typeof handler !== 'function') {
          const error = new Error('Invalid cleanup handler');
          captureStack.error.argument('Cleanup handler must be a function', error, this.run);
          return;
        }

        cleanupHandlers.add(handler);
      });

      try {
        return await fn();
      } finally {
        closure.set(CLEANUP_SYMBOL, prevCleanupHandler);
      }
    },

    /**
     * Executes all collected cleanup handlers and clears the collection.
     *
     * Each handler registered during run() calls will be executed once,
     * then the collection is cleared.
     */
    destroy() {
      cleanupHandlers.forEach((handler) => handler());
      cleanupHandlers.clear();
    },
  };
}
