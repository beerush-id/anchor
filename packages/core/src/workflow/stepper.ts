import { anchor } from '../engine/index.js';
import { mutable, replay, subscribe, untrack } from '../reactive/index.js';
import { onCleanup } from '../scope/index.js';
import type { StateSubscriber, StateUnsubscribe } from '../types.js';
import { uuid } from '../utils/index.js';
import { WORKFLOW_STATUS } from './constant.js';
import { WorkflowRunner } from './runner.js';
import type {
  AnyRunner,
  AnyStepper,
  SchemaLike,
  StepperOptions,
  StepperSnapshot,
  StepperState,
  WorkflowData,
  WorkflowEntry,
  WorkflowStatus,
} from './types.js';

/**
 * WorkflowStepper is a stateful runner for a sequence of workflow steps.
 * It extends Promise, allowing it to be awaited directly to start execution.
 * It manages step transitions, error handling (catch/finally blocks), and state persistence.
 * @template I The input data type.
 * @template O The output data type.
 */
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
  readonly #steps: Map<string, AnyRunner> = new Map();
  readonly #state: StepperState<I, O> = mutable(
    {
      status: WORKFLOW_STATUS.IDLE,
    },
    { recursive: false }
  );

  /** Returns the current data (output if available, otherwise seed). */
  public get data(): D {
    return (this.#state.output ?? this.#state.seed) as D;
  }
  /** Returns the current workflow status. */
  public get status() {
    return this.#state.status;
  }
  /** Returns the error if the workflow failed. */
  public get error() {
    return this.#state.error;
  }
  /** Returns the initial input data. */
  public get input(): I {
    return this.#state.input as I;
  }
  /** Returns the final output data. */
  public get output(): O {
    return this.#state.output as O;
  }
  /** Returns the internal reactive state. */
  public get state() {
    return this.#state;
  }
  /** Returns the runner for the current step. */
  public get current(): AnyRunner | undefined {
    return this.#steps.get(this.#state.current!);
  }

  public get nextStep() {
    if (this.current?.status === WORKFLOW_STATUS.PENDING) return this.current;

    const keys = Array.from(this.#steps.keys());
    if (!this.#state.current) return this.#steps.get(keys[0]);

    const next = keys[keys.indexOf(this.#state.current!) + 1];
    return this.#steps.get(next);
  }

  constructor(
    steps: WorkflowEntry[],
    public options?: StepperOptions<I, O>
  ) {
    let acceptFn: (value: O | PromiseLike<O>) => void;
    let rejectFn: (reason?: unknown) => void;

    super((resolve, reject) => {
      acceptFn = resolve;
      rejectFn = reject;

      if (options?.passive) resolve(options?.output as O);
    });

    this.#accept = acceptFn!;
    this.#reject = rejectFn!;

    for (const step of steps) {
      this.#steps.set(step.path, new WorkflowRunner(step, this.#controller.signal));
    }

    this.#state.seed = options?.seed as I;
    this.#state.input = options?.input as I;
    this.#state.output = options?.output as O;
    this.#schemaIn = options?.schema?.input;
    this.#schemaOut = options?.schema?.output;

    if (options?.signal) {
      const selfAbort = () => this.abort();
      this.#unlinkSignal = () => options?.signal?.removeEventListener('abort', selfAbort);
      options?.signal.addEventListener('abort', selfAbort);
    }

    onCleanup(() => this.close(this.status));
  }

  /**
   * Standard Promise then implementation.
   * Automatically triggers `run()` if the workflow is IDLE.
   * @param onfulfilled
   * @param onrejected
   */
  // biome-ignore lint/suspicious/noThenProperty: Expect override.
  public then<TResult1 = O, TResult2 = never>(
    onfulfilled?: ((value: O) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    if (this.status === WORKFLOW_STATUS.IDLE && !this.#closed) {
      this.run(this.input);
    }

    return super.then(onfulfilled, onrejected);
  }

  /** Returns a step runner by its path. */
  public get(name: string) {
    return this.#steps.get(name);
  }

  /**
   * Runs the workflow from the beginning or current position until completion.
   * @param input The input data to start with.
   * @returns A promise that resolves with the workflow output.
   */
  public async run(input: I): Promise<O> {
    if (this.#closed) return this.output;

    this.#state.input = input as I;
    this.#state.status = WORKFLOW_STATUS.PENDING;

    while (this.status === WORKFLOW_STATUS.PENDING) {
      await this.step(undefined, true);
      if (this.#controller.signal.aborted) break;
    }

    return this.output as O;
  }

  /**
   * Executes a single step or jumps to a specific step.
   * @param path The path of the step to jump to.
   * @param input Optional input for the step.
   * @returns A promise that resolves with the current output.
   */
  public async step(path: string, input?: WorkflowData): Promise<O>;
  public async step(input?: WorkflowData, all?: boolean): Promise<O>;
  public async step(pathOrInput?: string | WorkflowData, inputOrAll?: WorkflowData | boolean): Promise<O> {
    if (typeof pathOrInput === 'string') {
      const target = this.#steps.get(pathOrInput);
      if (!target) return this.output;

      // Position the cursor so nextStep resolves to the target.
      const keys = Array.from(this.#steps.keys());
      const idx = keys.indexOf(pathOrInput);
      this.#state.current = idx > 0 ? keys[idx - 1] : undefined;

      // Reset the target step so it can be re-executed.
      target.reset();

      return this.step(inputOrAll as WorkflowData);
    }

    const input = pathOrInput;
    const all = inputOrAll as boolean | undefined;

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
      let output = (await nextStep.run(nextInput, this as AnyStepper, this.error, all)) as O;
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
          output = (await nextStep.run(nextInput, this as AnyStepper, this.#state.error)) as O;
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
          await nextStep.run(nextInput, this as AnyStepper, this.error);

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

  /**
   * Skips the remaining steps in the workflow.
   * @param error Optional error to associate with the skip.
   * @returns The stepper instance.
   */
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

  /**
   * Finalizes the workflow status and resolves/rejects the internal promise.
   * @returns The final output.
   */
  public finish() {
    this.#state.status = this.#state.error ? WORKFLOW_STATUS.ERROR : WORKFLOW_STATUS.SUCCESS;

    if (this.status === WORKFLOW_STATUS.ERROR) {
      this.#reject(this.error);
    } else {
      this.#accept(this.output);
    }

    return this.output;
  }

  /** Validates the final output against the output schema if provided. */
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

  /**
   * Aborts the workflow execution.
   * @param reason The reason for aborting.
   */
  public abort(reason?: unknown) {
    if (this.#closed) return;

    this.close(WORKFLOW_STATUS.ABORTED, this.error, reason);
    this.#unlinkSignal?.();
    this.#accept(this.output);
  }

  /**
   * Closes the stepper, cleaning up resources and subscriptions.
   * @param status The final status.
   * @param error Optional error.
   * @param reason Optional abort reason.
   */
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

  /**
   * Resets the workflow to its initial IDLE state.
   * @returns The stepper instance.
   */
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

  /**
   * Seeds the workflow with initial data and schemas.
   * @param seed Initial data.
   * @param input Input validation schema.
   * @param output Output validation schema.
   * @returns The stepper instance.
   */
  public seed(seed: D, input?: SchemaLike, output?: SchemaLike) {
    this.#state.seed = seed as WorkflowData;
    this.#schemaIn = input;
    this.#schemaOut = output;

    return this;
  }

  /**
   * Subscribes to state changes.
   * @param handler The subscriber function.
   * @returns An unsubscribe function.
   */
  public subscribe(handler: StateSubscriber<O>) {
    if (this.#closed) return () => {};

    const unsubscribe = subscribe<WorkflowData>(this.#state, handler as StateSubscriber<WorkflowData>);
    this.#pipes.add(unsubscribe);
    return unsubscribe;
  }

  /**
   * Pipes state changes from this stepper to another stepper.
   * @param target The target stepper.
   * @returns The stepper instance.
   */
  public pipeTo(target: WorkflowStepper<I, O>) {
    if (this.#closed) return this;

    this.subscribe((_, event) => {
      if (event.type === 'init') {
        anchor.assign(target.state, this.state);
        return;
      }

      if (anchor.has(target.state)) replay(target.state, event);
    });

    return this;
  }

  /**
   * Creates a serializable snapshot of the current workflow state.
   * @returns A StepperSnapshot object.
   */
  public snapshot(): StepperSnapshot {
    return untrack(() => {
      const steps = [];

      for (const runner of this.#steps.values()) {
        steps.push(runner.snapshot());
      }

      return {
        status: this.status,
        input: this.input as WorkflowData,
        output: this.output as WorkflowData,
        current: this.#state.current,
        error: this.error?.message,
        steps,
      };
    });
  }

  /**
   * Restores the workflow state from a snapshot.
   * @param snapshot The snapshot to hydrate from.
   * @returns The stepper instance.
   */
  public hydrate({ status, input, output, current, error, steps }: StepperSnapshot) {
    if (this.#closed) return this;

    for (const stepSnap of steps) {
      this.#steps.get(stepSnap.path)?.hydrate(stepSnap);
    }

    this.#initialized = true;
    anchor.assign(this.#state, {
      status,
      input: input as I,
      output: output as O,
      current,
      error: error ? new Error(error) : undefined,
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
