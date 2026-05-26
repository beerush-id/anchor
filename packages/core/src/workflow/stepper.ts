import { anchor } from '../engine/index.js';
import { mutable, replay, subscribe } from '../reactive/index.js';
import { onCleanup } from '../scope/index.js';
import type { StateSubscriber, StateUnsubscribe } from '../types.js';
import { uuid } from '../utils/index.js';
import { WORKFLOW_STATUS } from './constant.js';
import { type RunnerState, WorkflowRunner } from './runner.js';
import type { SchemaLike, WorkflowData, WorkflowEntry, WorkflowStatus } from './types.js';

export type StepperState<I, O> = RunnerState<I, O> & {
  seed?: WorkflowData;
  current?: string;
};

export class WorkflowStepper<I extends WorkflowData, O extends WorkflowData, D = O | undefined> extends Promise<O> {
  public id = uuid();

  #locked = false;
  #closed = false;
  #controller = new AbortController();

  #schemaIn?: SchemaLike;
  #schemaOut?: SchemaLike;
  #initialized = false;

  readonly #accept: (value: O | PromiseLike<O>) => void;
  readonly #reject: (reason?: unknown) => void;
  readonly #unlinkSignal?: () => void;

  readonly #pipes = new Set<StateUnsubscribe>();
  readonly #steps: Map<string, WorkflowRunner<WorkflowData, WorkflowData>> = new Map();
  readonly #state: StepperState<I, O> = mutable(
    {
      status: WORKFLOW_STATUS.IDLE,
    },
    { recursive: false }
  );

  public get data(): D {
    return (this.#state.output ?? this.#state.seed) as D;
  }
  public get status() {
    return this.#state.status;
  }
  public get error() {
    return this.#state.error;
  }
  public get input(): I {
    return this.#state.input as I;
  }
  public get output(): O {
    return this.#state.output as O;
  }
  public get state() {
    return this.#state;
  }

  public get current(): WorkflowRunner<WorkflowData, WorkflowData> | undefined {
    return this.#steps.get(this.#state.current!);
  }

  public get nextStep() {
    if (this.current?.status === WORKFLOW_STATUS.PENDING) return this.current;

    const keys = Array.from(this.#steps.keys());
    if (!this.#state.current) return this.#steps.get(keys[0]);

    const next = keys[keys.indexOf(this.#state.current!) + 1];
    return this.#steps.get(next);
  }

  constructor(steps: WorkflowEntry[], input?: I, output?: O, signal?: AbortSignal, passive?: boolean) {
    let acceptFn: (value: O | PromiseLike<O>) => void;
    let rejectFn: (reason?: unknown) => void;

    super((resolve, reject) => {
      acceptFn = resolve;
      rejectFn = reject;

      if (passive) resolve(output!);
    });

    this.#accept = acceptFn!;
    this.#reject = rejectFn!;

    for (const step of steps) {
      this.#steps.set(
        step.path,
        new WorkflowRunner(step, this.#controller.signal, undefined as never, undefined as never)
      );
    }

    this.#state.input = input as I;
    this.#state.output = output as O;

    if (signal) {
      const selfAbort = () => this.abort();
      this.#unlinkSignal = () => signal.removeEventListener('abort', selfAbort);
      signal.addEventListener('abort', selfAbort);
    }

    onCleanup(() => this.close(this.status));
  }

  // biome-ignore lint/suspicious/noThenProperty: Expect override.
  public then<TResult1 = O, TResult2 = never>(
    onfulfilled?: ((value: O) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    if (this.status === WORKFLOW_STATUS.IDLE && !this.#closed) {
      this.all(this.input);
    }

    return super.then(onfulfilled, onrejected);
  }

  public get(name: string) {
    return this.#steps.get(name);
  }

  public async all(input: I): Promise<O> {
    if (this.#closed) return this.output;

    this.#state.input = input as I;
    this.#state.status = WORKFLOW_STATUS.PENDING;

    while (this.status === WORKFLOW_STATUS.PENDING) {
      await this.run(undefined, true);
      if (this.#controller.signal.aborted) break;
    }

    return this.output as O;
  }

  public async run(input?: WorkflowData, all?: boolean): Promise<O> {
    if (this.#locked || this.#closed || this.#controller.signal.aborted) return this.output;

    this.#locked = true;
    // Assign input if not already assigned.
    if (input) this.#state.input = input as I;

    if (!this.#initialized) {
      this.#initialized = true;

      if (this.#schemaIn) {
        try {
          this.#state.input = await (typeof this.#schemaIn === 'function' ? this.#schemaIn : this.#schemaIn.parse)(
            this.input
          );
        } catch (error) {
          this.#state.error = error as Error;
          return this.finish();
        }
      }
    }

    try {
      // Assign pending status if not already pending.
      if (this.status !== WORKFLOW_STATUS.PENDING) this.#state.status = WORKFLOW_STATUS.PENDING;

      // Get the next step to run.
      let nextStep = this.nextStep;

      // If there are no more steps, return the output.
      if (!nextStep) {
        await this.finalize();
        return this.finish();
      }

      // Set the current step.
      this.#state.current = nextStep.path;

      if (nextStep.type === 'catch' && !this.error) {
        nextStep.skip();
        nextStep = this.nextStep;

        while (nextStep?.type === 'catch') {
          nextStep.skip();
          this.#state.current = nextStep.path;
          nextStep = this.nextStep;
        }

        if (!nextStep) {
          await this.finalize();
          return this.finish();
        }

        this.#state.current = nextStep.path;
      }

      // Get the input for the next step, fallback to the current output or an empty object.
      let nextInput = this.output ?? this.input ?? {};

      // Run the next step.
      let output = (await nextStep.run(nextInput, this.error, all)) as O;
      this.#state.error = nextStep.error;

      // If there is an error, recover it and continue.
      if (this.#state.error) {
        nextStep = this.nextStep;
        nextInput = this.output ?? this.input ?? {};

        while (nextStep && this.#state.error) {
          if (this.#controller.signal.aborted) return this.output;

          if (nextStep.type !== 'catch') {
            if (nextStep.type === 'finally') break;

            this.#state.current = nextStep.path;
            nextStep.skip(this.#state.error);
            nextStep = this.nextStep;

            continue;
          }

          this.#state.current = nextStep.path;
          output = (await nextStep.run(nextInput, this.#state.error)) as O;
          this.#state.error = nextStep.error;

          if (!nextStep.error) {
            if (!output) {
              this.#state.error = new Error(`Step Error: invalid output.`);
            } else {
              this.#state.output = output as O;
            }
          }

          nextStep = this.nextStep;
          nextInput = this.output ?? this.input ?? {};
        }

        if (!nextStep) {
          await this.finalize();
          return this.finish();
        }
      }

      if (this.#controller.signal.aborted) return this.output;

      if (nextStep.type !== 'finally' && !nextStep.error) {
        if (!output) {
          this.#state.error = new Error(`Step Error: invalid output.`);
        } else {
          this.#state.output = output as O;
        }
      }

      nextStep = this.nextStep;
      if (!nextStep) {
        await this.finalize();
        return this.finish();
      }

      if (nextStep.type === 'finally') {
        nextInput = this.output ?? this.input ?? {};

        while (nextStep) {
          if (this.#controller.signal.aborted) return this.output;

          this.#state.current = nextStep.path;
          await nextStep.run(nextInput, this.error);

          nextStep = this.nextStep;
          nextInput = this.output ?? this.input ?? {};
        }

        if (!nextStep) {
          await this.finalize();
          return this.finish();
        }
      }

      return this.output as O;
    } finally {
      this.#locked = false;
    }
  }

  public skip(error?: Error) {
    if (this.#closed) return this;

    anchor.assign(this.#state, {
      status: WORKFLOW_STATUS.SKIPPED,
      error: error,
    });

    for (const step of this.#steps.values()) {
      step.skip(error);
    }

    this.#accept(this.output);
    return this;
  }

  public finish() {
    this.#state.status = this.#state.error ? WORKFLOW_STATUS.ERROR : WORKFLOW_STATUS.SUCCESS;

    if (this.status === WORKFLOW_STATUS.ERROR) {
      this.#reject(this.error);
    } else {
      this.#accept(this.output);
    }

    return this.output;
  }

  public async finalize() {
    if (!this.#schemaOut || !this.output) return;

    try {
      this.#state.output = await (typeof this.#schemaOut === 'function' ? this.#schemaOut : this.#schemaOut.parse)(
        this.output
      );
    } catch (error) {
      this.#state.error = error as Error;
    }
  }

  public abort(reason?: unknown) {
    if (this.#closed) return;

    this.close(WORKFLOW_STATUS.ABORTED, this.error, reason);
    this.#unlinkSignal?.();
    this.#accept(this.output);
  }

  public close(status: WorkflowStatus = WORKFLOW_STATUS.SUCCESS, error?: Error, reason?: unknown) {
    if (this.#closed) return;

    this.#closed = true;

    anchor.assign(this.#state, { status, error });

    this.#controller.abort(reason);
    this.#unlinkSignal?.();
    this.destroy();

    if (error) {
      this.#reject(this.error);
    } else {
      this.#accept(this.output);
    }
  }

  public reset() {
    if (this.#controller.signal.aborted || this.#closed) return this;

    for (const step of this.#steps.values()) {
      step.reset();
    }

    this.#state.input = undefined;
    this.#state.output = undefined;
    this.#state.current = undefined;
    this.#state.error = undefined;
    this.#state.status = WORKFLOW_STATUS.IDLE;
    return this;
  }

  public seed(seed: D, input?: SchemaLike, output?: SchemaLike) {
    this.#state.seed = seed as WorkflowData;
    this.#schemaIn = input;
    this.#schemaOut = output;

    return this;
  }

  public subscribe(handler: StateSubscriber<O>) {
    if (this.#closed) return () => {};

    const unsubscribe = subscribe<WorkflowData>(this.#state, handler as StateSubscriber<WorkflowData>);
    this.#pipes.add(unsubscribe);
    return unsubscribe;
  }

  public pipeTo(target: WorkflowStepper<I, O>) {
    if (this.#closed) return this;

    this.subscribe((_, event) => {
      if (event.type === 'init') {
        anchor.assign(target.state, this.state);
        return;
      }

      replay(target.state, event);
    });

    return this;
  }

  private destroy() {
    this.#pipes.forEach((unsubscribe) => unsubscribe());
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
