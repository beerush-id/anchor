import type { ProviderContext, TRec } from './types.js';

export function delay(timeout: number) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

export function getDelay(mode: 'linear' | 'exponential', attempt: number, baseDelay: number) {
  if (mode === 'exponential') {
    return baseDelay * 2 ** attempt;
  }

  return baseDelay;
}

export async function withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), timeout)),
  ]);
}

export async function executeWithOptions(
  provider: (context: ProviderContext<TRec, TRec, TRec>) => Promise<unknown> | unknown,
  context: ProviderContext<TRec, TRec, TRec>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    retryMode?: 'linear' | 'exponential';
    timeout?: number;
  }
): Promise<unknown> {
  const { maxRetries = 0, retryDelay = 0, retryMode = 'linear', timeout } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const promise = provider(context) as Promise<unknown>;

      if (timeout) {
        return await withTimeout(promise, timeout);
      }

      return await promise;
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        await delay(getDelay(retryMode, attempt, retryDelay));
      }
    }
  }

  throw lastError;
}
