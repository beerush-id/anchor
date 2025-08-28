import { isFunction } from '@beerush/utils';

export type DebugFn = (...args: unknown[]) => void;

let currentDebugger: DebugFn | undefined = undefined;

/**
 * Sets the current debugger function and returns a restore function.
 * The restore function can be called to revert to the previous debugger.
 *
 * @param debugFn - The debugger function to set, or undefined to disable debugging
 * @returns A function that restores the previous debugger when called
 * @throws {Error} If debugFn is neither a function nor undefined
 */
export function setDebugger(debugFn: DebugFn | undefined) {
  if (typeof debugFn !== 'function' && debugFn !== undefined) {
    throw new Error('Debug function must be a function or undefined');
  }

  let restored = false;

  const prevDebugger = currentDebugger;
  currentDebugger = debugFn;

  return () => {
    if (!restored) {
      currentDebugger = prevDebugger;
      restored = true;
    }
  };
}

/**
 * Executes a function with a specified debugger, temporarily replacing the current debugger.
 * The original debugger is restored after the function execution, even if an error occurs.
 *
 * @template R - The return type of the function
 * @param fn - The function to execute with the custom debugger
 * @param debugFn - The debugger function to use during execution
 * @returns The result of the executed function
 */
export function withDebugger<R>(fn: () => R, debugFn: DebugFn): R {
  const restoreDebugger = setDebugger(debugFn);

  let result: R | undefined = undefined;

  try {
    result = fn();
  } catch (error) {
    currentDebugger?.(error);
  }

  restoreDebugger();
  return result as R;
}

/**
 * Debugger interface that extends a function with additional logging methods.
 * Each method logs a message with a specific prefix and color coding.
 */
export interface Debugger {
  /**
   * Generic debug function that can accept any number of arguments.
   * @param args - Arguments to be passed to the debug function
   */
  (...args: unknown[]): void;

  /**
   * Logs a success message with a green checkmark prefix.
   * @param message - The message to log
   * @param extras - Additional arguments to log
   */
  ok(message: string, ...extras: unknown[]): void;

  /**
   * Logs an informational message with a blue info symbol prefix.
   * @param message - The message to log
   * @param extras - Additional arguments to log
   */
  info(message: string, ...extras: unknown[]): void;

  /**
   * Logs a conditional message with a cyan filled square (▣) if condition is true,
   * or a gray empty square (▢) if condition is false.
   * @param message - The message to log
   * @param condition - The condition to evaluate
   * @param extras - Additional arguments to log
   */
  check(message: string, condition: boolean, ...extras: unknown[]): void;

  /**
   * Logs an error message with a red cross prefix.
   * @param message - The message to log
   * @param extras - Additional arguments to log
   */
  error(message: string, ...extras: unknown[]): void;

  /**
   * Logs a warning message with a yellow exclamation mark prefix.
   * @param message - The message to log
   * @param extras - Additional arguments to log
   */
  warning(message: string, ...extras: unknown[]): void;
}

const debugFn = ((...args: unknown[]) => {
  if (!isFunction(currentDebugger)) return;
  return currentDebugger(...args);
}) as Debugger;

debugFn.ok = (message: string, ...extras: unknown[]) => {
  if (!isFunction(currentDebugger)) return;
  return ((currentDebugger as Debugger).ok ?? currentDebugger)(`\x1b[32m✓ ${message}\x1b[0m`, ...extras);
};

debugFn.info = (message: string, ...extras: unknown[]) => {
  if (!isFunction(currentDebugger)) return;
  return ((currentDebugger as Debugger).info ?? currentDebugger)(`\x1b[34mℹ ${message}\x1b[0m`, ...extras);
};

debugFn.check = (message: string, condition: boolean, ...extras: unknown[]) => {
  if (!isFunction(currentDebugger)) return;
  if (condition) {
    return (((currentDebugger as Debugger).check as Debugger['info']) ?? currentDebugger)(
      `\x1b[36m▣ ${message}\x1b[0m`,
      ...extras
    );
  }
  return (((currentDebugger as Debugger).check as Debugger['info']) ?? currentDebugger)(
    `\x1b[37m▢ ${message}\x1b[0m`,
    ...extras
  );
};

debugFn.error = (message: string, ...extras: unknown[]) => {
  if (!isFunction(currentDebugger)) return;
  return ((currentDebugger as Debugger).error ?? currentDebugger)(`\x1b[31m✕ ${message}\x1b[0m`, ...extras);
};

debugFn.warning = (message: string, ...extras: unknown[]) => {
  if (!isFunction(currentDebugger)) return;
  return ((currentDebugger as Debugger).warning ?? currentDebugger)(`\x1b[33m! ${message}\x1b[0m`, ...extras);
};

export const debug = debugFn as Debugger;
