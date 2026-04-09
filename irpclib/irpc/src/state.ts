import { anchor, mutable, type StateSubscriber, subscribe } from '@anchorlib/core';
import { IRPC_STATUS } from './enum.js';
import type { IRPCReadable, IRPCStatus } from './types.js';

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
  protected readonly state: IRPCReadable<T>;
  protected readonly accept: (value: T) => void;
  protected readonly reject: (error: Error) => void;

  /**
   * The current data payload of the state.
   */
  public get data(): T {
    return this.state.data;
  }
  public set data(data: T) {
    this.state.data = data;
  }

  /**
   * The current error encountered by the state, if any.
   */
  public get error(): Error | undefined {
    return this.state.error;
  }
  public set error(error: Error | undefined) {
    this.state.error = error;
  }

  /**
   * The execution status of the state (PENDING, SUCCESS, ERROR).
   * Transitioning to a terminal status (SUCCESS or ERROR) will automatically resolve or reject the underlying Promise.
   */
  public get status(): IRPCStatus {
    return this.state.status;
  }
  public set status(status: IRPCStatus) {
    this.state.status = status;

    if (this.status === IRPC_STATUS.ERROR) {
      this.reject(new Error(this.error!.message));
      this.destroy();
    } else if (this.status === IRPC_STATUS.SUCCESS) {
      this.accept(this.data as T);
      this.destroy();
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

    this.accept = acceptFn!;
    this.reject = rejectFn!;

    this.state = mutable({
      data: init as T,
      error: undefined,
      status: IRPC_STATUS.PENDING,
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
 * A callback function type used to natively construct and drive a reactive stream.
 * It provides the initial reactive data reference and terminal resolution hooks
 * without forcing strict async/await boundaries, securely yielding stream operations.
 *
 * @template T - The type of data yielded globally by the stream.
 * @param data - The mutable data payload natively tracked by RemoteState.
 * @param resolve - Callback to statically mark the stream as successfully completed, optionally with a resolved value.
 * @param reject - Callback to forcefully throw a runtime error into the stream structure.
 */
export type StreamConstructor<T> = (
  data: T,
  resolve: (value?: T) => void,
  reject: (error: Error) => void
) => void | Promise<void>;

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

  const accept = ((...values: [T]) => {
    if (values.length > 0) {
      state.data = values[0];
    }

    state.status = IRPC_STATUS.SUCCESS;
  }) as (value?: T) => void;

  const reject = (error: Error) => {
    state.error = error;
    state.status = IRPC_STATUS.ERROR;
  };

  try {
    const result = construct(state.data, accept, reject);

    if (result instanceof Promise) {
      result.catch(reject);
    }
  } catch (error) {
    reject(error as Error);
  }

  return state;
}
