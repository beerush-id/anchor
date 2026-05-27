import { anchor } from '../engine/index.js';
import { mutable } from '../reactive/index.js';
import { uuid } from '../utils/index.js';
import { WORKFLOW_STATUS } from './constant.js';
import { type AnyStepper, WorkflowStepper } from './stepper.js';
import type { SchemaLike, WorkflowData, WorkflowEntry, WorkflowStatus } from './types.js';

export type RunnerState<I, O> = {
  error?: Error;
  input?: I;
  output?: O;

  status: WorkflowStatus;
};

export type RunnerOptions<I, O> = {
  input?: I;
  output?: O;
};

export type AnyRunner = WorkflowRunner<WorkflowData, WorkflowData>;

export class WorkflowRunner<I, O> {
  public id = uuid();

  readonly #state: RunnerState<I, O> = mutable(
    {
      status: WORKFLOW_STATUS.IDLE,
    },
    { recursive: false }
  );

  public get type() {
    return this.step.type;
  }
  public get path() {
    return this.step.path;
  }
  public get name() {
    return this.step.meta?.name;
  }
  public get description() {
    return this.step.meta?.description;
  }
  public get status(): WorkflowStatus {
    return this.#state.status;
  }
  public get error(): Error | undefined {
    return this.#state.error;
  }
  public get input(): I {
    return this.#state.input as I;
  }
  public get output(): O {
    return this.#state.output as O;
  }

  #branches?: Map<string, AnyStepper>;

  constructor(
    private step: WorkflowEntry,
    private signal: AbortSignal,
    options?: RunnerOptions<I, O>
  ) {
    this.#state.input = options?.input as I;
    this.#state.output = options?.output as O;

    if (step.type === 'switch') {
      this.#branches = new Map();

      for (const [key, branch] of Object.entries(step.switches)) {
        const stepper = new WorkflowStepper(branch.steps as WorkflowEntry[], {
          signal,
          passive: true,
        });
        this.#branches?.set(key, stepper);
      }
    }
  }

  public async run(input: I, error?: Error, all?: boolean): Promise<O> {
    if (this.signal.aborted) return this.output as O;

    const { input: schemaIn, output: schemaOut } = (this.step.meta ?? {}) as {
      input?: SchemaLike;
      output?: SchemaLike;
    };

    this.#state.input = input as I;
    this.#state.status = WORKFLOW_STATUS.PENDING;

    try {
      const parsedInput =
        typeof schemaIn === 'function' ? await schemaIn(input) : schemaIn ? await schemaIn.parse(input) : input;

      let output: O | undefined;

      switch (this.step.type) {
        case 'step':
          output = (await this.step.handler(parsedInput as WorkflowData)) as O;
          break;
        case 'catch':
          output = (await this.step.handler(error!, parsedInput as WorkflowData)) as O;
          break;
        case 'switch': {
          const discriminator = String(await this.step.matcher(parsedInput as WorkflowData));

          for (const [n, b] of this.#branches!.entries()) {
            if (n !== discriminator) b.reset().skip();
          }

          const branch = this.#branches!.get(discriminator) ?? this.#branches!.get('default');

          if (!branch) {
            const error = new Error(`Switch error: no case for ${discriminator}.`);
            anchor.assign(this.#state, {
              status: WORKFLOW_STATUS.ERROR,
              error,
            });
            break;
          }

          output = (await (all
            ? branch.all(parsedInput as WorkflowData)
            : branch.run(parsedInput as WorkflowData))) as O;

          if (this.signal?.aborted) {
            this.#state.status = WORKFLOW_STATUS.ABORTED;
            return this.output as O;
          }

          anchor.assign(this.#state, {
            output,
            status: branch.status,
            error: branch.error,
          });

          return this.output as O;
        }
        case 'finally':
          await this.step.handler(input as WorkflowData, error);
          break;
        default:
          {
            const error = new Error(`Step error: invalid step type.`);
            anchor.assign(this.#state, {
              status: WORKFLOW_STATUS.ERROR,
              error,
            });
          }

          return this.output as O;
      }

      if (this.signal?.aborted) {
        this.#state.status = WORKFLOW_STATUS.ABORTED;
        return this.output as O;
      }

      const parsedOutput =
        typeof schemaOut === 'function' ? await schemaOut(output) : schemaOut ? await schemaOut.parse(output) : output;

      anchor.assign(this.#state, {
        status: WORKFLOW_STATUS.SUCCESS,
        output: parsedOutput as O,
      });
    } catch (error) {
      if (this.signal?.aborted) {
        this.#state.status = WORKFLOW_STATUS.ABORTED;
        return this.output as O;
      }

      anchor.assign(this.#state, {
        status: WORKFLOW_STATUS.ERROR,
        error: error as Error,
      });
    }

    return this.output as O;
  }

  public skip(error?: Error) {
    if (this.step.type === 'switch') {
      for (const branch of this.#branches!.values()) {
        branch.skip(error);
      }
    }

    anchor.assign(this.#state, {
      status: WORKFLOW_STATUS.SKIPPED,
      error: error,
    });

    return this;
  }

  public reset() {
    if (this.signal?.aborted) return this;

    anchor.remove(this.#state, 'input', 'output', 'error');
    this.#state.status = WORKFLOW_STATUS.IDLE;

    if (this.step.type === 'switch') {
      for (const branch of this.#branches!.values()) {
        branch.reset();
      }
    }

    return this;
  }
}
