import { $do, anchor, mutable, type StateSubscriber, subscribe } from '@anchorlib/core';
import { getAbortSignal } from './context.js';
import { IRPC_STATUS } from './enum.js';
import { ERROR_CODE, ERROR_MESSAGE } from './error.js';
import type { IRPCReadable, IRPCStatus, StreamConstructor } from './types.js';

/**
 * A reactive state wrapper that implements the standard Promise interface.
 *
 * RemoteState acts as a dual-layer abstraction:
 * 1. For asynchronous execution, it operates as a `Promise<T>` that resolves upon completion or rejects upon failure.
 * 2. For reactive environments, it exposes an `.subscribe()` method to react to intermediate data mutations.
 *
 * @template T - The type of data held by the state.
 */
export class RemoteState<T> extends Promise<T> {
  readonly #state: IRPCReadable<T>;
  readonly #accept: (value: T) => void;
  readonly #reject: (error: Error) => void;

  #closed = false;

  public get state(): IRPCReadable<T> {
    return this.#state;
  }

  /**
   * The current data payload of the state.
   */
  public get data(): T {
    return this.#state.data;
  }
  public set data(data: T) {
    if (this.#closed) return;
    this.#state.data = data;
  }

  /**
   * The current error encountered by the state, if any.
   */
  public get error(): Error | undefined {
    return this.#state.error;
  }
  public set error(error: Error | undefined) {
    if (this.#closed) return;
    this.#state.error = error;
  }

  /**
   * The execution status of the state (PENDING, SUCCESS, ERROR).
   * Transitioning to a terminal status (SUCCESS or ERROR) will automatically resolve or reject the underlying Promise.
   */
  public get status(): IRPCStatus {
    return this.#state.status;
  }
  public set status(status: IRPCStatus) {
    if (this.#closed) return;

    this.state.status = status;

    if (status === IRPC_STATUS.ERROR) {
      this.reject();
    } else if (status === IRPC_STATUS.SUCCESS) {
      this.accept();
    }
  }

  /**
   * Initializes a new RemoteState with an optional initial payload.
   *
   * @param init - An optional starting value for the data payload.
   */
  constructor(init?: T) {
    let acceptFn: (value: T) => void;
    let rejectFn: (error: Error) => void;

    super((resolve, reject) => {
      acceptFn = resolve;
      rejectFn = reject;
    });

    this.#accept = acceptFn!;
    this.#reject = rejectFn!;

    this.#state = mutable({
      data: init as T,
      error: undefined,
      status: IRPC_STATUS.PENDING,
    });
  }

  public accept(value?: T): void;
  public accept(...args: [T]) {
    $do(() => {
      if (this.#closed) return;

      const value = args.length ? args[0] : this.data;

      this.#closed = true;
      this.#state.status = IRPC_STATUS.SUCCESS;
      this.#state.data = value;
      this.#accept(value);
      this.destroy();
    });
  }

  public reject(error?: Error): void;
  public reject(...args: [Error]) {
    $do(() => {
      if (this.#closed) return;

      const error = args.length ? args[0] : new Error(this.error?.message ?? 'Unknown Error');

      if (args.length) {
        this.#state.error = {
          name: ERROR_MESSAGE[ERROR_CODE.UNKNOWN],
          message: error.message,
        };
      }

      this.#closed = true;
      this.#state.status = IRPC_STATUS.ERROR;
      this.#reject(error);
      this.destroy();
    });
  }

  public abort() {
    $do(() => {
      this.#closed = true;
      this.#state.status = IRPC_STATUS.ABORTED;
      this.#accept(this.data);
      this.destroy();
    });
  }

  /**
   * Subscribes to changes emitted by the internal state.
   *
   * @param handler - A callback function invoked whenever the state mutates.
   * @returns An unsubscribe function to terminate the listener.
   */
  public subscribe(handler: StateSubscriber<IRPCReadable<T>>) {
    return subscribe(this.state, handler);
  }

  /**
   * Closes the reactive state and terminates the underlying Promise.
   */
  public close() {
    if (this.#closed) return;
    this.#closed = true;
    this.destroy();
  }

  /**
   * Starts the reactive state pipeline on the client side.
   * This method is intended to be overridden by subclasses for custom initialization logic.
   * On the server side, this method is a no-op.
   */
  public start(): this {
    return this;
  }

  /**
   * Destroys the reactive state bindings.
   */
  protected destroy() {
    anchor.destroy(this.state);
  }

  /**
   * Ensures that chained Promise operations return standard Promises
   * rather than instantiating new RemoteState subclasses.
   */
  static get [Symbol.species]() {
    return Promise;
  }
}

/**
 * A utility factory to structurally instantiate an active `RemoteState` pipeline natively
 * decoupled from standard Promise chains. This elegantly captures constructor functions
 * pushing events into the state before terminating mechanically via secure internal hooks.
 *
 * @template T - The type of the streamed payload data.
 * @param construct - The isolated stream constructor callback that natively operates the pipeline.
 * @param init - An optional initial value to prime the state payload inherently.
 * @returns A fully active RemoteState inherently bound to the callbacks executing natively.
 */
export function stream<T>(construct: StreamConstructor<T>, init?: T) {
  const state = new RemoteState<T>(init);
  const abortSignal = getAbortSignal();

  const accept = ((...values: [T]) => {
    if (values.length > 0) {
      state.data = values[0];
    }

    state.status = IRPC_STATUS.SUCCESS;
    abortSignal?.removeEventListener('abort', abort);
  }) as (value?: T) => void;

  const reject = (error: Error) => {
    state.error = error;
    state.status = IRPC_STATUS.ERROR;
    abortSignal?.removeEventListener('abort', abort);
  };
  const abort = () => state.abort();

  abortSignal?.addEventListener('abort', abort, { once: true });

  try {
    const cleanup = construct(state, accept, reject);

    if (cleanup instanceof Promise) {
      cleanup
        .then((futureCleanup) => {
          if (typeof futureCleanup === 'function') {
            if (abortSignal?.aborted || state.status !== IRPC_STATUS.PENDING) {
              $do(futureCleanup);
            } else {
              abortSignal?.addEventListener('abort', () => $do(futureCleanup), { once: true });
            }
          }
        })
        .catch(reject);
    } else {
      if (typeof cleanup === 'function') {
        if (abortSignal?.aborted || state.status !== IRPC_STATUS.PENDING) {
          $do(cleanup);
        } else {
          abortSignal?.addEventListener('abort', () => $do(cleanup), { once: true });
        }
      }
    }
  } catch (error) {
    reject(error as Error);
  }

  return state;
}
