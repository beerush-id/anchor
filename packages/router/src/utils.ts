/**
 * Creates a promise that resolves after a specified timeout.
 *
 * @param timeout - The delay in milliseconds
 * @returns A promise that resolves after the timeout
 *
 * @example
 * ```ts
 * await delay(1000); // Wait for 1 second
 * ```
 */
export function delay(timeout: number) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

/**
 * Calculates the delay for retry attempts.
 *
 * Supports linear and exponential backoff strategies.
 *
 * @param mode - The retry mode ('linear' or 'exponential')
 * @param attempt - The current attempt number (0-indexed)
 * @param baseDelay - The base delay in milliseconds
 * @returns The calculated delay in milliseconds
 *
 * @example
 * ```ts
 * // Linear: 1000, 1000, 1000, ...
 * getDelay('linear', 0, 1000); // 1000
 *
 * // Exponential: 1000, 2000, 4000, 8000, ...
 * getDelay('exponential', 0, 1000); // 1000
 * getDelay('exponential', 1, 1000); // 2000
 * getDelay('exponential', 2, 1000); // 4000
 * ```
 */
export function getDelay(mode: 'linear' | 'exponential', attempt: number, baseDelay: number) {
  if (mode === 'exponential') {
    return baseDelay * 2 ** attempt;
  }

  return baseDelay;
}

/**
 * Wraps a promise with a timeout.
 *
 * Rejects with an error if the promise doesn't resolve within the timeout.
 *
 * @template T - The type of value the promise resolves to
 * @param promise - The promise to wrap
 * @param timeout - The timeout in milliseconds
 * @returns A promise that resolves or rejects based on the first to complete
 * @throws An error with message 'Operation timed out' if timeout is reached
 *
 * @example
 * ```ts
 * try {
 *   const result = await withTimeout(fetch('/api/data'), 5000);
 * } catch (error) {
 *   console.error('Request timed out');
 * }
 * ```
 */
export async function withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), timeout)),
  ]);
}
