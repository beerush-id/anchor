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
