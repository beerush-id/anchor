import { awaited } from '../context.js';

/**
 * Creates a promise that resolves after a specified delay.
 * @param delay - The time to wait in milliseconds before resolving the promise.
 * @returns A promise that resolves with `undefined` after the delay.
 */
export function sleep(delay: number) {
  return awaited(() => new Promise((resolve) => setTimeout(resolve, delay)));
}
