import { anchor } from '../engine/index.js';
import { $do, mutable, subscribe } from '../reactive/index.js';
import { onCleanup } from '../scope/index.js';
import type { StateSubscriber } from '../types.js';
import { WORKFLOW_ABORT_REASON, WORKFLOW_STATUS } from './constant.js';
import type { StepState, WorkflowInstance, WorkflowStatus } from './types.js';

export type AsyncReaderState<T> = {
  status: WorkflowStatus;
  data?: T;
  error?: Error;
};

export class AsyncReader<T> extends Promise<T> {
  readonly #state: AsyncReaderState<T>;
  readonly #accept: (value: T) => void;
  readonly #reject: (error: Error) => void;

  #abort!: (reason?: unknown) => void;
  #controller!: AbortController;

  public get controller() {
    return this.#controller;
  }

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

  public get state(): AsyncReaderState<T> {
    return this.#state;
  }

  public get data(): T | undefined {
    return this.#state.data;
  }

  public get error(): Error | undefined {
    return this.#state.error;
  }

  public get status(): WorkflowStatus {
    return this.#state.status;
  }

  #closed = false;

  constructor(controller: AbortController, init?: T, status: WorkflowStatus = WORKFLOW_STATUS.PENDING) {
    let acceptFn: (value: T) => void;
    let rejectFn: (error: Error) => void;

    super((resolve, reject) => {
      acceptFn = resolve;
      rejectFn = reject;
    });

    this.#accept = acceptFn!;
    this.#reject = rejectFn!;
    this.controller = controller;

    this.#state = mutable({ status, data: init as T });

    onCleanup(() => this.close());
  }

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

  public close() {
    if (this.#closed) return;

    this.#closed = true;
    this.#abort(WORKFLOW_ABORT_REASON.SUCCESS);
    this.#accept(this.#state.data!);
    this.destroy();
  }

  public subscribe(handler: StateSubscriber<AsyncReaderState<T>>) {
    return subscribe(this.#state, handler);
  }

  protected destroy() {
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

export class WorkflowReader<T> extends AsyncReader<T> {
  public instance: WorkflowInstance;

  public get state(): WorkflowReaderState<T> {
    return super.state as WorkflowReaderState<T>;
  }

  public get current(): StepState {
    return this.state.current;
  }

  public set current(current: StepState) {
    this.state.current = current;
  }

  constructor(instance: WorkflowInstance, init?: T, status: WorkflowStatus = WORKFLOW_STATUS.PENDING) {
    super(instance.controller, init, status);
    this.instance = instance;
  }

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
