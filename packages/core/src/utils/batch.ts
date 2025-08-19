import { captureStack } from '../exception.js';

/**
 * Type definition for a batch handler function.
 * @returns {void}
 */
export type BatchHandler = () => void;

/**
 * Type definition for a batch scheduler function.
 * @param {BatchHandler} fn - The function to be scheduled for batch execution.
 * @returns {void}
 */
export type BatchScheduler = (fn: BatchHandler) => void;

/**
 * Type definition for a batch resetter function.
 * @returns {void}
 */
export type BatchResetter = () => void;

/**
 * Creates a micro-batch scheduler that executes functions in batches after a specified delay.
 *
 * @param {number} delay - The delay in milliseconds before executing the batch. Defaults to 10ms.
 * @returns {[BatchScheduler, BatchResetter]} A tuple containing the scheduler and resetter functions.
 *
 * @example
 * const [schedule, reset] = microbatch(50);
 *
 * schedule(() => console.log('Task 1'));
 * schedule(() => console.log('Task 2'));
 *
 * // Both tasks will be executed together after 50ms
 *
 * // To cancel pending executions:
 * // reset();
 */
export function microbatch(delay: number = 10): [BatchScheduler, BatchResetter] {
  const BATCHES = new Set<() => void>();
  let activeId: number | undefined = undefined;

  const schedule = (fn: () => void) => {
    if (BATCHES.has(fn)) return;

    if (!BATCHES.size) {
      activeId = setTimeout(() => {
        for (const handler of BATCHES) {
          try {
            handler();
          } catch (error) {
            captureStack.error.external('Batch execution failed.', error as Error);
          }
        }

        BATCHES.clear();
      }, delay) as never;
    }

    BATCHES.add(fn);
  };

  const reset = () => {
    BATCHES.clear();
    clearTimeout(activeId);
  };

  return [schedule, reset];
}
