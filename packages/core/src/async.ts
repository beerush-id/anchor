import { anchor } from './anchor.js';
import { mutable } from './ref.js';
import { type AsyncHandler, type AsyncOptions, type AsyncState, AsyncStatus, type Linkable } from './types.js';

export function asyncState<T extends Linkable, E extends Error = Error>(
  fn: AsyncHandler<T>
): AsyncState<T, E> & { data?: T };
export function asyncState<T extends Linkable, E extends Error = Error>(
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
export function asyncState<T extends Linkable, E extends Error = Error>(
  fn: AsyncHandler<T>,
  init?: T,
  options?: AsyncOptions
): AsyncState<T, E> {
  let controller: AbortController | undefined;
  let abortError: E | undefined;
  let activePromise: Promise<T | undefined> | undefined;

  const start = (async (newInit) => {
    if (writer.status === AsyncStatus.Pending) {
      controller?.abort();
      abortError = undefined;
    }

    if (newInit) {
      writer.data = mutable(newInit, options);
    }

    controller = new AbortController();
    writer.status = AsyncStatus.Pending;

    try {
      activePromise = cancelable(fn, controller.signal);
      const data = await activePromise;
      anchor.assign(writer, { status: AsyncStatus.Success, data: data ? mutable(data, options) : data });
      return data;
    } catch (error) {
      if (controller.signal.aborted && abortError) {
        anchor.assign(writer, { status: AsyncStatus.Error, error: abortError });
      } else {
        anchor.assign(writer, { status: AsyncStatus.Error, error: error as E });
      }
    } finally {
      controller = undefined;
      abortError = undefined;
    }
  }) as AsyncState<T, E>['start'];

  const abort = ((error) => {
    if (controller?.signal.aborted) return;

    abortError = error;
    controller?.abort(error);
  }) as AsyncState<T, E>['abort'];

  const state = mutable<AsyncState<T, E>>(
    {
      data: (init ? mutable(init, options) : undefined) as T,
      status: AsyncStatus.Idle,
      start,
      abort,
      get promise() {
        return activePromise ?? Promise.resolve(undefined);
      },
    },
    { immutable: true }
  );
  const writer = anchor.writable(state);

  if (!options?.deferred) {
    state.start();
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
