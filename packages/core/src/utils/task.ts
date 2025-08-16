import { captureStack } from '../exception.js';

/**
 * Type definition for a task handler function.
 * @template T - The type of context data passed to the handler
 * @param init - The initial context when the task was first scheduled
 * @param current - The most recent context when the task was last scheduled
 * @returns A promise for async operations or void for sync operations
 */
export type TaskHandler<T> = (init: T, current: T) => Promise<void> | void;

/**
 * Type definition for a task scheduler function.
 * @template T - The type of context data that can be passed to the handler
 * @param fn - The task handler function to execute
 * @param context - Optional context data to pass to the handler
 */
export type TaskScheduler<T> = (fn: TaskHandler<T>, context?: T) => void;

/**
 * Type definition for a task destroyer function.
 * Used to clean up and cancel any pending tasks.
 */
export type TaskDestroyer = () => void;

/**
 * Creates a microtask scheduler that batches multiple calls into a single execution.
 *
 * This function returns a scheduler and destroyer pair that allows you to schedule
 * tasks which will be executed after a specified timeout. If multiple tasks are
 * scheduled within the timeout period, only the last one will be executed with
 * the initial and last context values.
 *
 * @template T - The type of context data that can be passed to the handler
 * @param timeout - The timeout in milliseconds before executing the task (default: 10ms)
 * @returns A tuple containing the scheduler and destroyer functions
 *
 * @example
 * ```typescript
 * const [schedule, destroy] = microtask<number>();
 *
 * schedule((init, current) => {
 *   console.log(`Initial value: ${init}, Current value: ${current}`);
 * }, 1);
 *
 * schedule((init, current) => {
 *   console.log(`Initial value: ${init}, Current value: ${current}`);
 * }, 2);
 *
 * // After 100ms, only logs: "Initial value: 1, Current value: 2"
 * ```
 */
export function microtask<T = undefined>(timeout = 10): [TaskScheduler<T>, TaskDestroyer] {
  let initContext: T | undefined = undefined;
  let lastContext: T | undefined = undefined;
  let executor: TaskHandler<T> | undefined = undefined;
  let activeId: number | undefined = undefined;

  const schedule = (fn: TaskHandler<T>, context?: T) => {
    if (typeof context !== 'undefined') {
      if (typeof initContext === 'undefined') {
        initContext = context;
      }

      lastContext = context;
    }

    if (typeof executor !== 'function') {
      activeId = setTimeout(async () => {
        const execFn = executor;
        const initValue = initContext;
        const lastValue = lastContext;

        executor = initContext = lastContext = activeId = undefined;

        if (typeof execFn === 'function') {
          try {
            await execFn(initValue as T, lastValue as T);
          } catch (error) {
            captureStack.error.external('Scheduler execution failed.', error as Error);
          }
        }
      }, timeout) as never;
    }

    executor = fn;
  };

  const destroy = () => {
    clearTimeout(activeId);
    executor = initContext = lastContext = activeId = undefined;
  };

  return [schedule, destroy];
}
