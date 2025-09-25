import { captureStack } from '../exception.js';

export type PushHandler = () => void;
export type PushFn = () => void;
export type Pusher = (fn: PushHandler) => PushFn;

/**
 * Creates a micro push system that allows registering and executing a single handler function.
 *
 * @returns A tuple containing:
 *   - push: A function that registers a handler and returns an exec function
 *   - clear: A function that clears the currently registered handler
 *
 * The push function registers a handler that can be executed once through the returned exec function.
 * If a new handler is registered, the previous one is replaced.
 * The clear function removes the current handler, making it unable to be executed.
 *
 * This is useful for situations where you have multiple async operations that need to perform an identical final
 * operation such as set the loading state to false after all operations have completed.
 */
export function micropush() {
  let handle: PushHandler | undefined;

  const push: Pusher = (fn: PushHandler) => {
    if (typeof fn !== 'function') {
      const error = new Error('Invalid argument.');
      captureStack.error.argument('The given argument is not a function.', error, push);
      return () => {};
    }

    handle = fn;

    return () => {
      if (handle === fn) {
        try {
          handle();
        } catch (error) {
          captureStack.error.external('Push execution failed.', error as Error);
        } finally {
          handle = undefined;
        }
      }
    };
  };

  const clear = () => {
    handle = undefined;
  };

  return [push, clear] as const;
}
