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
export type BatchCleaner = () => void;

export type MicroBatch = [BatchScheduler, BatchCleaner];

/**
 * Creates a micro-batch scheduler that executes functions in batches after a specified delay.
 *
 * @param {number} delay - The delay in milliseconds before executing the batch. Defaults to 10ms.
 * @returns {MicroBatch} A tuple containing the scheduler and resetter functions.
 */
export function microbatch(delay: number = 10): MicroBatch {
  const BATCHES = new Set<() => void>();
  let activeId: number | undefined;

  const execute = () => {
    for (const handler of BATCHES) {
      try {
        handler();
      } catch (error) {
        captureStack.error.external('Batch execution failed.', error as Error);
      }
    }

    BATCHES.clear();
  };

  const schedule = (fn: () => void) => {
    if (BATCHES.has(fn)) return;

    if (!BATCHES.size) {
      if (delay > 0) {
        activeId = setTimeout(execute, delay) as never;
      } else {
        queueMicrotask(execute);
      }
    }

    BATCHES.add(fn);
  };

  const reset = () => {
    BATCHES.clear();
    clearTimeout(activeId);
  };

  return [schedule, reset];
}
