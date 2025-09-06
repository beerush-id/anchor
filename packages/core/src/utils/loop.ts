import { captureStack } from '../exception.js';

export type LoopFn = (fn: () => void) => Promise<number>;
export type StopFn = () => void;
export type MicroLooper = [LoopFn, StopFn];

/**
 * Creates a micro loop that executes a function repeatedly with a fixed time delay.
 * Each iteration is executed asynchronously and the loop continues until the maximum number of iterations is reached.
 *
 * @param timeout - The interval in milliseconds between each execution
 * @param steps - The maximum number of iterations to execute
 * @returns A tuple containing the loop function and stop function
 */
export function microloop(timeout: number, steps: number): MicroLooper {
  let isRunning = false;
  let currentStep = 0;
  let currentInterval = 0;
  let currentResolver: ((value: number) => void) | undefined = undefined;

  const loop = (fn: () => void) => {
    if (isRunning) {
      captureStack.warning.external(
        'Duplicated loop detected:',
        'Attempted to run a looper with a running looper.',
        'Multi loop not allowed',
        loop
      );
      return Promise.resolve(0);
    }

    isRunning = true;

    return new Promise<number>((resolve) => {
      currentResolver = resolve;
      currentInterval = setInterval(() => {
        currentStep++;

        try {
          fn();

          if (currentStep >= steps) {
            stop();
          }
        } catch (error) {
          captureStack.error.external('Walker execution failed.', error as Error);
          stop();
        }
      }, timeout) as never;
    });
  };

  const stop = () => {
    clearInterval(currentInterval);
    currentResolver?.(currentStep);

    isRunning = false;
    currentStep = 0;
    currentInterval = 0;
  };

  return [loop, stop];
}
