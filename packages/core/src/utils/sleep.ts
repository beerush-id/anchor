/**
 * Creates a promise that resolves after a specified delay.
 * @param delay - The time to wait in milliseconds before resolving the promise.
 * @returns A promise that resolves with `undefined` after the delay.
 */
export function sleep(delay: number) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Create a promise that resolves after queueMicroTask.
 * @returns A promise that resolves with `undefined`.
 */
export function afterTask() {
  return sleep(0);
}
