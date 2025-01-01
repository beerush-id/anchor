import { logger } from './logger.js';

/**
 * Sleep for a given time.
 * @param {number} time
 * @returns {Promise<unknown>}
 */
export function sleep(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

/**
 * Tries to execute a function until it returns a value without throwing,
 * or reaching the max number if iterations.
 * Sleeps for a provided interval between each attempt.
 *
 * @template T The type of the returned Promise
 * @param {() => T | Promise<T>} fulfill The function to be fulfilled
 * @param {number} interval The interval to sleep between each attempt (in milliseconds)
 * @param {number} [max=1] The maximum number of attempts
 * @returns {Promise<T>} A Promise with the return value of the first successful call to `fulfill`
 * @throws Will throw an error if unable to fulfill the function after `max` attempts
 */
export async function once<T>(fulfill: () => T | Promise<T>, interval: number, max: number = 1): Promise<T> {
  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      return await fulfill();
    } catch (error) {
      if (attempt == max) {
        throw error;
      }

      await sleep(interval);
    }
  }

  throw new Error('Unable to fulfill after ' + max + ' attempts.');
}

export type Stop = () => void;

/**
 * Loop a function with a given interval in background.
 * @param {() => void} fn
 * @param {number} interval
 * @param max - Maximum number of iterations.
 * @returns {Stop}
 */
export function loop(fn: () => void | Promise<void>, interval: number, max?: number): Stop {
  let timer = 0;

  const start = async () => {
    if (timer) {
      clearTimeout(timer);
    }

    try {
      await fn();

      if (max && --max === 0) return;
      timer = setTimeout(start, interval) as never;
    } catch (error) {
      logger.error('[timer:loop] Failed to run the loop.', error);
    }
  };

  start().catch((error) => {
    logger.error('[timer:loop] Failed to start the loop.', error);
  });

  return () => clearTimeout(timer);
}
