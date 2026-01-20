import { captureStack } from '../exception.js';

/**
 * Type representing a debounce handler function that takes no arguments and returns void.
 */
export type DebounceHandler = () => void;

/**
 * Type representing a debounce scheduler function that accepts a debounce handler to be scheduled.
 */
export type DebounceScheduler = (fn: DebounceHandler) => void;

/**
 * Type representing a debounce cleaner function that clears any pending debounce operations.
 */
export type DebounceCleaner = () => void;

/**
 * Type representing a debouncer tuple containing both the scheduler and cleaner functions.
 */
export type Debouncer = [DebounceScheduler, DebounceCleaner];

/**
 * Creates a debounced function pair consisting of a scheduler and a cleaner.
 *
 * @param delay - The delay in milliseconds to wait before executing the scheduled function. Defaults to 10ms.
 * @returns A tuple containing the scheduler function at index 0 and the cleaner function at index 1.
 */
export function debouncer(delay = 10): Debouncer {
  let handler: DebounceHandler | undefined;
  let activeId: number | undefined;

  const schedule = ((fn) => {
    if (typeof fn !== 'function') {
      const error = new Error('Invalid argument.');
      captureStack.error.argument('The given argument is not a function.', error, schedule);
    }

    clearTimeout(activeId);

    handler = fn;

    if (typeof fn === 'function') {
      activeId = setTimeout(() => {
        try {
          handler?.();
        } catch (error) {
          captureStack.error.external('Debounce execution failed.', error as Error);
        } finally {
          handler = activeId = undefined;
        }
      }, delay);
    }
  }) as DebounceScheduler;

  const cleanup = (() => {
    clearTimeout(activeId);
    handler = activeId = undefined;
  }) as DebounceCleaner;

  return [schedule, cleanup];
}
