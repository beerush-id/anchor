import { anchor } from '../engine/index.js';
import { $do, mutable, replay, subscribe } from '../reactive/index.js';
import { onCleanup } from '../scope/index.js';
import type { StateSubscriber, StateUnsubscribe } from '../types.js';
import { WORKFLOW_ABORT_REASON, WORKFLOW_STATUS } from './constant.js';
import type { StepState, WorkflowInstance, WorkflowStatus } from './types.js';

export type AsyncReaderState<T> = {
  status: WorkflowStatus;
  data?: T;
  error?: Error;
};

/**
 * A Promise-based state reader that tracks the status and data of an asynchronous operation.
 */
export class AsyncReader<T, D = T | undefined> extends Promise<T> {
  readonly #state: AsyncReaderState<T>;
  readonly #accept: (value: T) => void;
  readonly #reject: (error: Error) => void;

  #pipes = new Set<StateUnsubscribe>();
  #abort!: (reason?: unknown) => void;
  #controller!: AbortController;

  /**
   * Returns the AbortController associated with this reader.
   */
  public get controller() {
    return this.#controller;
  }

  /**
   * Sets the AbortController and attaches abort listeners.
   */
  public set controller(controller: AbortController) {
    if (this.#abort as unknown) this.#abort();

    this.#controller = controller;

    const abort = () => this.abort();
    controller.signal.addEventListener('abort', abort, { once: true });

    this.#abort = (reason) => {
      if (!controller.signal.aborted) {
        controller.abort(reason);
      }

      controller.signal.removeEventListener('abort', abort);
    };
  }

  /**
   * Returns the current reactive state of the reader.
   */
  public get state(): AsyncReaderState<T> {
    return this.#state;
  }

  /**
   * Returns the current data value.
   */
  public get data(): D {
    return this.#state.data as D;
  }

  /**
   * Returns the error if the operation failed.
   */
  public get error(): Error | undefined {
    return this.#state.error;
  }

  /**
   * Returns the current workflow status.
   */
  public get status(): WorkflowStatus {
    return this.#state.status;
  }

  #closed = false;

  constructor(
    controller: AbortController,
    init?: T,
    status: WorkflowStatus = WORKFLOW_STATUS.PENDING,
    private resumable?: boolean
  ) {
    let acceptFn: (value: T) => void;
    let rejectFn: (error: Error) => void;

    super((resolve, reject) => {
      if (resumable) resolve(init as never);
      acceptFn = resolve;
      rejectFn = reject;
    });

    this.#accept = acceptFn!;
    this.#reject = rejectFn!;
    this.controller = controller;

    this.#state = mutable({ status, data: init as T });

    onCleanup(() => this.close());
  }

  /**
   * Aborts the operation and marks the state as ABORTED.
   */
  public abort() {
    $do(() => {
      if (this.#closed) return;

      this.#closed = true;
      this.#state.status = WORKFLOW_STATUS.ABORTED;
      this.#abort(WORKFLOW_ABORT_REASON.USER_ABORT);
      this.#accept(this.#state.data!);
      this.destroy();
    });
  }

  /**
   * Resolves the reader with a value and marks the state as SUCCESS.
   */
  public accept(value?: T, force?: boolean) {
    $do(() => {
      if (this.#closed && !force) return;

      this.#closed = true;
      this.#state.data = typeof value === 'undefined' ? this.#state.data : value;
      this.#state.status = WORKFLOW_STATUS.SUCCESS;
      this.#abort(WORKFLOW_ABORT_REASON.SUCCESS);
      this.#accept(this.#state.data!);
      this.destroy();
    });
  }

  /**
   * Rejects the reader with an error and marks the state as ERROR.
   */
  public reject(error?: Error, force?: boolean) {
    $do(() => {
      if (this.#closed && !force) return;

      this.#closed = true;
      this.#state.error = typeof error === 'undefined' ? this.#state.error : error;
      this.#state.status = WORKFLOW_STATUS.ERROR;
      this.#abort(WORKFLOW_ABORT_REASON.ERROR);
      this.#reject(this.#state.error ?? new Error('Unknown Error'));
      this.destroy();
    });
  }

  /**
   * Closes the reader, resolving it with the current data.
   */
  public close() {
    if (this.#closed) return;

    this.#closed = true;
    this.#abort(WORKFLOW_ABORT_REASON.SUCCESS);
    this.#accept(this.#state.data!);
    this.destroy();
  }

  /**
   * Subscribes to state changes.
   */
  public subscribe(handler: StateSubscriber<AsyncReaderState<T>>) {
    const unsubscribe = subscribe(this.#state, handler);
    this.#pipes.add(unsubscribe);
    return unsubscribe;
  }

  /**
   * Pipes state changes from this reader to another reader.
   */
  public pipeTo(target: AsyncReader<T>) {
    this.subscribe((_, event) => {
      if (event.type === 'init') {
        anchor.assign(target.state, this.state);
        return;
      }

      replay(target.state, event);
    });

    return this;
  }

  /**
   * Re-opens the reader for further updates if it was previously closed.
   */
  protected resume() {
    this.#closed = false;
  }

  /**
   * Destroys the reactive state unless the reader is resumable.
   */
  protected destroy() {
    if (this.resumable) return;

    for (const unsubscribe of this.#pipes) {
      unsubscribe();
    }

    this.#pipes.clear();
    anchor.destroy(this.#state);
  }

  /**
   * Ensures that chained Promise operations return standard Promises
   * rather than instantiating new RemoteState subclasses.
   */
  static get [Symbol.species]() {
    return Promise;
  }
}

export type WorkflowReaderState<T> = AsyncReaderState<T> & {
  current: StepState;
};

/**
 * Creates an AsyncReader seeded with initial data.
 *
 * The `data` property is typed as `T`, reflecting that a value is
 * always available from construction through resolution.
 *
 * @param controller - The AbortController to associate with this reader.
 * @param init - Initial data for the reader state.
 * @param status - The initial workflow status.
 * @param resumable - Whether the reader can be re-opened after closing.
 */
export function asyncReader<T>(
  controller: AbortController,
  init: T,
  status?: WorkflowStatus,
  resumable?: boolean
): AsyncReader<T, T>;
/**
 * Creates an AsyncReader without initial data.
 *
 * The `data` property is typed as `T | undefined` since no value
 * exists until the operation resolves.
 *
 * @param controller - The AbortController to associate with this reader.
 * @param init - Optional initial data for the reader state.
 * @param status - The initial workflow status.
 * @param resumable - Whether the reader can be re-opened after closing.
 */
export function asyncReader<T>(
  controller: AbortController,
  init?: T,
  status?: WorkflowStatus,
  resumable?: boolean
): AsyncReader<T>;
export function asyncReader<T>(
  controller: AbortController,
  init?: T,
  status?: WorkflowStatus,
  resumable?: boolean
): AsyncReader<T> {
  return new AsyncReader(controller, init, status, resumable) as AsyncReader<T>;
}

/**
 * An AsyncReader specialized for Workflow instances, tracking the current step state.
 */
export class WorkflowReader<T, D = T | undefined> extends AsyncReader<T, D> {
  public instance: WorkflowInstance;

  /**
   * Returns the current workflow reader state.
   */
  public get state(): WorkflowReaderState<T> {
    return super.state as WorkflowReaderState<T>;
  }

  /**
   * Returns the current step state.
   */
  public get current(): StepState {
    return this.state.current;
  }

  /**
   * Updates the current step state.
   */
  public set current(current: StepState) {
    this.state.current = current;
  }

  constructor(
    instance: WorkflowInstance,
    init?: T,
    status: WorkflowStatus = WORKFLOW_STATUS.PENDING,
    resumable?: boolean
  ) {
    super(instance.controller, init, status, resumable);
    this.instance = instance;
  }

  /**
   * Subscribes to workflow state changes.
   */
  public subscribe(handler: StateSubscriber<WorkflowReaderState<T>>) {
    return super.subscribe(handler as StateSubscriber<AsyncReaderState<T>>);
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
 * Creates a WorkflowReader seeded with initial data.
 *
 * The `data` property is typed as `T`, reflecting that a value is
 * always available from construction through resolution.
 *
 * @param instance - The running workflow instance.
 * @param init - Initial data for the reader state.
 * @param status - The initial workflow status.
 * @param resumable - Whether the reader can be re-opened after closing.
 */
export function workflowReader<T>(
  instance: WorkflowInstance,
  init: T,
  status?: WorkflowStatus,
  resumable?: boolean
): WorkflowReader<T, T>;
/**
 * Creates a WorkflowReader without initial data.
 *
 * The `data` property is typed as `T | undefined` since no value
 * exists until the workflow resolves.
 *
 * @param instance - The running workflow instance.
 * @param init - Optional initial data for the reader state.
 * @param status - The initial workflow status.
 * @param resumable - Whether the reader can be re-opened after closing.
 */
export function workflowReader<T>(
  instance: WorkflowInstance,
  init?: T,
  status?: WorkflowStatus,
  resumable?: boolean
): WorkflowReader<T>;
export function workflowReader<T>(
  instance: WorkflowInstance,
  init?: T,
  status?: WorkflowStatus,
  resumable?: boolean
): WorkflowReader<T> {
  return new WorkflowReader<T>(instance, init, status, resumable) as WorkflowReader<T>;
}
