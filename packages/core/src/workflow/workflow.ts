import { mutable } from '../reactive/ref.js';
import { uuid } from '../utils/uuid.js';

/**
 * Base constraint for all workflow I/O — must be a record (object).
 */
export type WorkflowData = Record<string, unknown>;

/**
 * Optional human-readable metadata attached to a workflow or step.
 */
export type WorkflowMeta = {
  name?: string;
  description?: string;
};

/**
 * Shared identity fields present on every step in the pipeline.
 */
export type WorkflowBase = {
  /** Unique machine identifier for this step. */
  id: string;
  /** Structural path in the pipeline tree (e.g. "3.error.1"). */
  path: string;
  /** Optional human-readable metadata. */
  meta?: WorkflowMeta;
};

/**
 * A sequential transform step in the pipeline.
 */
export type WorkflowStep = WorkflowBase & {
  type: 'step';
  handler: (input: WorkflowData) => WorkflowData | Promise<WorkflowData>;
};

/**
 * A conditional branch point in the pipeline.
 */
export type WorkflowSwitch = WorkflowBase & {
  type: 'switch';
  matcher: (input: WorkflowData) => string | number | boolean | Promise<string | number | boolean>;
  switches: Record<string, Workflow<WorkflowData, WorkflowData>>;
};

/**
 * An error recovery step.
 */
export type WorkflowCatch = WorkflowBase & {
  type: 'catch';
  handler: (error: Error, input: WorkflowData) => WorkflowData | Promise<WorkflowData>;
};

/**
 * A finalization step that always runs.
 */
export type WorkflowFinally = WorkflowBase & {
  type: 'finally';
  handler: (input: WorkflowData, error?: Error) => void | Promise<void>;
};

/**
 * Discriminated union of all step types in a workflow pipeline.
 */
export type WorkflowEntry = WorkflowStep | WorkflowSwitch | WorkflowCatch | WorkflowFinally;

/**
 * Represents the state of a single execution step.
 */
export type StepState = {
  status: 'idle' | 'pending' | 'success' | 'error' | 'skipped';
  data?: WorkflowData;
  error?: Error;
};

/**
 * Represents a single running instance of a workflow pipeline.
 */
export type WorkflowInstance = {
  id: string;
  workflow: Workflow<WorkflowData, WorkflowData>;
  input: WorkflowData;
  states: WeakMap<WorkflowEntry, StepState>;
};

export const WORKFLOW_HOOKS = {
  onRegister: new Set<(workflow: Workflow<WorkflowData, WorkflowData>) => void>(),
  onStep: new Set<(step: WorkflowEntry) => void>(),
  onQueue: new Set<(instance: WorkflowInstance) => void>(),
  onDequeue: new Set<(instance: WorkflowInstance, output?: WorkflowData, error?: Error) => void>(),
};

export type Narrow<O, K extends keyof O, V> = O & Record<K, V>;

export type SwitchCases<O extends WorkflowData, K extends keyof O> = {
  [V in
    | (O[K] & (string | number))
    | (true extends O[K] ? 'true' : never)
    | (false extends O[K] ? 'false' : never)
    | 'default']?: V extends 'default'
    ? (resolve: Workflow<O, O>['then']) => any
    : V extends 'true'
      ? (resolve: Workflow<Narrow<O, K, true>, Narrow<O, K, true>>['then']) => any
      : V extends 'false'
        ? (resolve: Workflow<Narrow<O, K, false>, Narrow<O, K, false>>['then']) => any
        : V extends string | number
          ? (resolve: Workflow<Narrow<O, K, V>, Narrow<O, K, V>>['then']) => any
          : never;
};

export type SwitchCasesFn<O extends WorkflowData, U extends string | number | boolean> = {
  [V in
    | (U & (string | number))
    | (true extends U ? 'true' : never)
    | (false extends U ? 'false' : never)
    | 'default']?: (resolve: Workflow<O, O>['then']) => any;
};

/**
 * Extracts the union of output types from all branches in a switch cases map.
 */
export type SwitchOutput<C> = {
  [P in keyof C]: C[P] extends (b: infer _W) => Workflow<infer _I, infer R> ? R : never;
}[keyof C];

/**
 * A typed, callable execution pipeline.
 *
 * Each Workflow instance is a function that accepts an input record and produces
 * a Promise of the output record. The pipeline is built by chaining `.then()`
 * and `.switch()` calls, each producing a new independent Workflow.
 *
 * @template I - The input type accepted when calling the workflow.
 * @template O - The output type produced after all steps execute.
 */
export interface Workflow<I extends WorkflowData, O extends WorkflowData> {
  /**
   * Executes the pipeline with the given input.
   */
  (input: I): Promise<O>;

  /**
   * The unique identifier for this workflow chain.
   */
  readonly id: string;

  /**
   * The accumulated steps in this workflow.
   */
  readonly steps: ReadonlyArray<WorkflowEntry>;

  /**
   * The workflow-level metadata.
   */
  readonly meta?: WorkflowMeta;

  /**
   * Adds a transform step to the pipeline.
   *
   * @param fn - A function that receives the current output and produces the next value.
   * @param meta - Optional metadata for this step.
   * @returns A new Workflow with the output type updated to match the step's return type.
   */
  then<R extends WorkflowData>(
    fn: (input: O) => R | Promise<R>,
    meta?: WorkflowMeta
  ): Workflow<I, [R] extends [never] ? O : Awaited<R>>;

  /**
   * Adds a conditional branch point based on a discriminant key.
   *
   * At runtime, reads `value[key]` and executes the matching branch's pipeline.
   * Falls back to `default` if no named case matches. Throws if no case matches
   * and no default is provided.
   *
   * @param key - The property key to switch on.
   * @param cases - A map of discriminant values to branch builder functions.
   * @param meta - Optional metadata for this switch point.
   * @returns A new Workflow with the output type as the union of all branch outputs.
   */
  switch<K extends keyof O & string, C extends SwitchCases<O, K>>(
    key: K,
    cases: C,
    meta?: WorkflowMeta
  ): Workflow<I, SwitchOutput<C> & WorkflowData>;

  /**
   * Adds a conditional branch point using a custom matcher function.
   *
   * @param matcher - A function that returns the branch key to execute.
   * @param cases - A map of discriminant values to branch builder functions.
   * @param meta - Optional metadata for this switch point.
   * @returns A new Workflow with the output type as the union of all branch outputs.
   */
  switch<U extends string | number | boolean, C extends SwitchCasesFn<O, U>>(
    matcher: (input: O) => U | Promise<U>,
    cases: C,
    meta?: WorkflowMeta
  ): Workflow<I, SwitchOutput<C> & WorkflowData>;

  /**
   * Adds an error recovery step. If a previous step throws, this handler is called.
   * If it returns a value, the workflow recovers and continues with that value.
   *
   * @param fn - A function that handles the error and returns a fallback output.
   * @param meta - Optional metadata.
   */
  catch<R extends WorkflowData>(
    fn: (error: Error, input: O) => R | Promise<R>,
    meta?: WorkflowMeta
  ): Workflow<I, O | Awaited<R>>;

  /**
   * Adds a finalization step that runs whether the workflow succeeded or failed.
   * Does not modify the output value, but can perform cleanup.
   *
   * @param fn - A cleanup function.
   * @param meta - Optional metadata.
   */
  finally(fn: (input: O, error?: Error) => void | Promise<void>, meta?: WorkflowMeta): Workflow<I, O>;
}

/**
 * Creates a new workflow pipeline or clones an existing one.
 *
 * @param meta - Optional metadata describing the workflow.
 * @returns A callable Workflow that accepts input and produces a Promise of the output.
 */
export function plan<I extends WorkflowData>(meta?: WorkflowMeta): Workflow<I, I>;
export function plan<I extends WorkflowData, O extends WorkflowData>(
  workflow: Workflow<I, O>,
  meta?: WorkflowMeta
): Workflow<I, O>;
export function plan(
  arg1?: Workflow<WorkflowData, WorkflowData> | WorkflowMeta,
  arg2?: WorkflowMeta
): Workflow<WorkflowData, WorkflowData> {
  const isWorkflow = arg1 && typeof arg1 === 'function' && 'steps' in arg1;
  const meta = isWorkflow ? arg2 : arg1;
  const steps = isWorkflow ? [...arg1.steps] : [];

  return createWorkflow(uuid(), '', steps, meta);
}

/**
 * Internal factory that produces a callable Workflow function with
 * `.then()` and `.switch()` methods attached as properties.
 *
 * @param id - The unique identifier for this workflow.
 * @param prefix - The path prefix for child step addressing.
 * @param steps - The accumulated steps for this workflow.
 * @param workflowMeta - The workflow-level metadata, propagated through chains.
 */
function createWorkflow<I extends WorkflowData, O extends WorkflowData>(
  id: string,
  prefix: string,
  steps: WorkflowEntry[],
  workflowMeta?: WorkflowMeta
): Workflow<I, O> {
  const fn = (async (input: I) => {
    const states = new WeakMap<WorkflowEntry, StepState>();
    for (const step of steps) {
      states.set(step, mutable<StepState>({ status: 'idle' }, { recursive: false }));
    }

    const instance: WorkflowInstance = {
      id: uuid(),
      workflow: fn as Workflow<WorkflowData, WorkflowData>,
      input,
      states,
    };

    for (const hook of WORKFLOW_HOOKS.onQueue) hook(instance);

    try {
      const output = await execute(instance, steps, input);
      for (const hook of WORKFLOW_HOOKS.onDequeue) hook(instance, output);
      return output;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      for (const hook of WORKFLOW_HOOKS.onDequeue) hook(instance, undefined, error);
      throw error;
    }
  }) as Workflow<I, O>;

  Object.defineProperty(fn, 'id', { value: id, enumerable: true });
  Object.defineProperty(fn, 'steps', { value: steps, enumerable: true });
  Object.defineProperty(fn, 'meta', { value: workflowMeta, enumerable: true });

  for (const hook of WORKFLOW_HOOKS.onRegister) hook(fn as Workflow<WorkflowData, WorkflowData>);

  // biome-ignore lint/suspicious/noThenProperty: expect promise-like.
  fn.then = <R extends WorkflowData>(
    handler: (input: O) => R | Promise<R>,
    meta?: WorkflowMeta
  ): Workflow<I, [R] extends [never] ? O : Awaited<R>> => {
    const path = `${prefix}${steps.length + 1}`;

    const step: WorkflowStep = {
      id: uuid(),
      path,
      type: 'step',
      handler: handler as (input: WorkflowData) => WorkflowData | Promise<WorkflowData>,
      meta,
    };

    for (const hook of WORKFLOW_HOOKS.onStep) hook(step);

    return createWorkflow(id, prefix, [...steps, step], workflowMeta) as unknown as Workflow<
      I,
      [R] extends [never] ? O : Awaited<R>
    >;
  };

  fn.switch = (
    keyOrMatcher: string | ((input: O) => string | number | boolean | Promise<string | number | boolean>),
    cases: Record<string, Workflow<WorkflowData, WorkflowData>>,
    meta?: WorkflowMeta
  ): Workflow<I, O> => {
    const path = `${prefix}${steps.length + 1}`;
    const switches: Record<string, Workflow<WorkflowData, WorkflowData>> = {};

    for (const [caseKey, builder] of Object.entries(cases)) {
      if (typeof builder === 'function') {
        const branchPrefix = `${path}.${caseKey}.`;
        const branchWorkflow = createWorkflow<WorkflowData, WorkflowData>(uuid(), branchPrefix, []);
        switches[caseKey] = (builder as Function)(branchWorkflow.then.bind(branchWorkflow));
      }
    }

    const matcher =
      typeof keyOrMatcher === 'function'
        ? (keyOrMatcher as (input: WorkflowData) => string | number | boolean | Promise<string | number | boolean>)
        : (input: WorkflowData) => input[keyOrMatcher as string] as string | number | boolean;

    const entry: WorkflowSwitch = {
      id: uuid(),
      path,
      type: 'switch',
      matcher,
      switches,
      meta,
    };

    for (const hook of WORKFLOW_HOOKS.onStep) hook(entry);

    return createWorkflow(id, prefix, [...steps, entry], workflowMeta);
  };

  fn.catch = <R extends WorkflowData>(
    handler: (error: Error, input: O) => R | Promise<R>,
    meta?: WorkflowMeta
  ): Workflow<I, O> => {
    const path = `${prefix}${steps.length + 1}`;
    const entry: WorkflowCatch = {
      id: uuid(),
      path,
      type: 'catch',
      handler: handler as (error: Error, input: WorkflowData) => WorkflowData | Promise<WorkflowData>,
      meta,
    };

    for (const hook of WORKFLOW_HOOKS.onStep) hook(entry);

    return createWorkflow(id, prefix, [...steps, entry], workflowMeta);
  };

  fn.finally = (handler: (input: O, error?: Error) => void | Promise<void>, meta?: WorkflowMeta): Workflow<I, O> => {
    const path = `${prefix}${steps.length + 1}`;
    const entry: WorkflowFinally = {
      id: uuid(),
      path,
      type: 'finally',
      handler: handler as (input: WorkflowData, error?: Error) => void | Promise<void>,
      meta,
    };

    for (const hook of WORKFLOW_HOOKS.onStep) hook(entry);

    return createWorkflow(id, prefix, [...steps, entry], workflowMeta);
  };

  return fn;
}

/**
 * Executes a pipeline of steps sequentially, piping each step's output
 * as the next step's input.
 *
 * @param instance - The running instance tracking step states.
 * @param steps - The ordered list of steps to execute.
 * @param input - The initial input value.
 * @returns The final output after all steps have executed.
 */
async function execute(instance: WorkflowInstance, steps: WorkflowEntry[], input: WorkflowData): Promise<WorkflowData> {
  let value: WorkflowData = input;
  let currentError: Error | undefined;

  for (const entry of steps) {
    const state = instance.states.get(entry);

    try {
      if (currentError && entry.type !== 'catch' && entry.type !== 'finally') {
        state!.status = 'skipped';
        state!.error = currentError;
        continue; // Skip normal steps when in error state
      }

      state!.status = 'pending';
      state!.data = value;

      if (entry.type === 'step') {
        value = await entry.handler(value);
      } else if (entry.type === 'switch') {
        const discriminant = String(await entry.matcher(value));
        const branch = entry.switches[discriminant] ?? entry.switches.default;

        if (!branch) {
          throw new Error(`Workflow switch "${entry.path}" has no case for "${discriminant}" and no default.`);
        }

        value = await branch(value);
      } else if (entry.type === 'catch') {
        if (currentError) {
          value = await entry.handler(currentError, value);
          currentError = undefined; // Recovered
        }
      } else if (entry.type === 'finally') {
        await entry.handler(value, currentError);
      }

      state!.status = 'success';
      state!.data = value;
    } catch (err) {
      currentError = err instanceof Error ? err : new Error(String(err));
      state!.status = 'error';
      state!.error = currentError;
    }
  }

  if (currentError) {
    throw currentError;
  }

  return value;
}
