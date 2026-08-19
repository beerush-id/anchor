import { isBrowser } from '../module.js';
import { createObserver } from '../reactive/index.js';
import { mutable, writable } from '../reactive/ref.js';
import { awaited } from '../scope/index.js';
import { ASYNC_STATUS } from '../shared/constant.js';
import type { AsyncHandler, AsyncOptions, AsyncState, Linkable, RetriableOptions } from '../types.js';

export function query<T extends Linkable, E extends Error = Error>(
  fn: AsyncHandler<T>
): AsyncState<T, E> & { data?: T };
export function query<T extends Linkable, E extends Error = Error>(
  fn: AsyncHandler<T>,
  init: T,
  options?: AsyncOptions
): AsyncState<T, E>;

/**
 * Creates a reactive state container for managing asynchronous operations with built-in cancellation support.
 *
 * This function initializes a state object that tracks the status of an async operation (idle, pending, success, error)
 * and provides methods to start and abort the operation. The state automatically handles cancellation using
 * AbortController and updates its status accordingly.
 *
 * @template T - The type of data that the async operation will return
 * @template E - The type of error that the async operation might throw (defaults to generic Error)
 *
 * @param fn - An async function that performs the actual operation and accepts an AbortSignal for cancellation
 * @param init - The initial value for the data property
 * @param options - Configuration options for the async state behavior
 * @param options.deferred - If true, the async operation won't start automatically when the state is created
 *
 * @returns An immutable state object containing:
 *   - data: The current data value (initial or from successful async operation)
 *   - status: Current status of the async operation (idle, pending, success, or error)
 *   - start: Function to initiate the async operation
 *   - abort: Function to cancel the ongoing async operation
 *   - error: The error object if the operation failed
 */
export function query<T extends Linkable, E extends Error = Error>(
  fn: AsyncHandler<T>,
  init?: T,
  options?: AsyncOptions
): Readonly<AsyncState<T, E>> {
  let controller: AbortController | undefined;
  let abortError: E | undefined;
  let activePromise: Promise<T | undefined> | undefined;

  const observer = createObserver(() => {
    // observer.reset();
    start();
  });

  const start = (async (newInit) => {
    if (writer.status === ASYNC_STATUS.Pending) {
      controller?.abort();
      abortError = undefined;
    }

    if (newInit) {
      writer.data = mutable(newInit, options);
    }

    controller = new AbortController();
    Object.assign(writer, { status: ASYNC_STATUS.Pending, error: undefined });

    try {
      activePromise = awaited(
        !options?.deferred
          ? observer.runAsync(() => cancelable(fn, controller!.signal))
          : cancelable(fn, controller.signal)
      ) as unknown as Promise<T | undefined>;

      const data = await activePromise;
      Object.assign(writer, { status: ASYNC_STATUS.Success, data: data ? mutable(data, options) : data });

      return data;
    } catch (error) {
      if (controller.signal.aborted && abortError) {
        Object.assign(writer, { status: ASYNC_STATUS.Aborted, error: abortError });
      } else {
        Object.assign(writer, { status: ASYNC_STATUS.Error, error: error as E });
      }
    } finally {
      controller = undefined;
      abortError = undefined;
    }
  }) as AsyncState<T, E>['start'];

  const abort = ((error) => {
    if (controller?.signal.aborted) return;

    Object.assign(writer, { status: ASYNC_STATUS.Aborted, error: undefined });

    abortError = error;
    controller?.abort(error);
  }) as AsyncState<T, E>['abort'];

  const state = mutable<AsyncState<T, E>>(
    {
      data: (init ? mutable(init, options) : undefined) as T,
      status: ASYNC_STATUS.Idle,
      start,
      abort,
      get promise() {
        return activePromise ?? (Promise.resolve(undefined) as Promise<T | undefined>);
      },
    },
    { immutable: true, recursive: false }
  );
  const writer = writable(state);

  if (!options?.deferred) {
    if (isBrowser()) {
      state.start();
    } else {
      writer.status = ASYNC_STATUS.Pending;
    }
  }

  return state as AsyncState<T, E>;
}

/**
 * Creates a cancelable promise from a synchronous function.
 * @param fn - A synchronous function that doesn't require an AbortSignal
 * @param signal - The AbortSignal to watch for cancellation
 * @returns A Promise that resolves with the result of the function or rejects if cancelled
 */
export function cancelable<R>(fn: () => R, signal: AbortSignal): Promise<R>;

/**
 * Creates a cancelable promise from an asynchronous function.
 * @param fn - An asynchronous function that accepts an AbortSignal for cancellation
 * @param signal - The AbortSignal to pass to the function and watch for cancellation
 * @returns A Promise that resolves with the result of the function or rejects if cancelled
 */
export function cancelable<R>(fn: (signal: AbortSignal) => Promise<R>, signal: AbortSignal): Promise<R>;

/**
 * Creates a cancelable promise from either a synchronous or asynchronous function.
 * @param fn - A function that may be synchronous or asynchronous and optionally use an AbortSignal
 * @param signal - The AbortSignal to pass to the function (if it accepts one) and watch for cancellation
 * @returns A Promise that resolves with the result of the function or rejects if cancelled
 */
export function cancelable<R>(fn: (signal: AbortSignal) => Promise<R> | R, signal: AbortSignal): Promise<R> {
  if (signal.aborted) {
    return Promise.reject(signal.reason);
  }

  let resolved = false;

  return new Promise<R>((resolve, reject) => {
    const result = fn(signal);

    const handleAbort = () => {
      if (!resolved) {
        reject(signal.reason);
      }
    };

    if (result instanceof Promise) {
      result
        .then((res) => {
          if (!signal?.aborted) {
            resolve(res);
          }

          resolved = true;
          signal?.removeEventListener('abort', handleAbort);
        })
        .catch((e) => {
          if (!signal?.aborted) {
            reject(e);
          }

          resolved = true;
          signal?.removeEventListener('abort', handleAbort);
        });

      signal?.addEventListener('abort', handleAbort, { once: true });
    } else {
      resolve(result);
      resolved = true;
    }
  });
}

/**
 * Executes an asynchronous function with retry logic and optional timeout.
 *
 * This function wraps an async call and automatically retries it on failure up to a specified
 * number of times with configurable delays between attempts. It also supports timeout and
 * cancellation via AbortController.
 *
 * @template T - The type of the value that the promise resolves to
 *
 * @param call - An asynchronous function that accepts an AbortSignal and returns a Promise
 * @param options - Configuration options for retry behavior and timeout
 *
 * @returns A Promise that resolves with the result of the call, or rejects with an error
 *          if all retry attempts fail or if the timeout is reached
 */
export async function retriable<T>(call: (signal: AbortSignal) => Promise<T> | T, options?: RetriableOptions) {
  const {
    timeout = 0,
    retryMode = 'exponential',
    maxRetries = 0,
    retryDelay = 1000,
    controller = new AbortController(),
  } = { ...options };

  const execute = async (retries = 0) => {
    if (controller.signal.aborted) {
      throw new Error('Call was aborted');
    }

    try {
      return await awaited(call(controller.signal));
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error('Call was aborted');
      }

      if (retries >= maxRetries) {
        throw error;
      }

      const delay = retryMode === 'linear' ? retryDelay : retryDelay * 2 ** retries;
      await awaited(new Promise((resolve) => setTimeout(resolve, delay)));

      return execute(retries + 1);
    }
  };

  if (timeout) {
    let timeId: ReturnType<typeof setTimeout>;

    const timer = new Promise((_, reject) => {
      timeId = setTimeout(() => {
        controller.abort();
        reject(new Error('Call timed out'));
      }, timeout);
    });

    const clearTimer = () => clearTimeout(timeId);
    controller.signal.addEventListener('abort', () => clearTimer);

    try {
      return await awaited(Promise.race([timer, execute()]));
    } finally {
      clearTimer();
      controller.signal.removeEventListener('abort', () => clearTimer);
    }
  }

  return await awaited(execute());
}
