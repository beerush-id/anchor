import type { WORKFLOW_STATUS } from './constant.js';
import type { WorkflowReader } from './reader.js';

/**
 * Base constraint for all workflow I/O — must be a record (object).
 */
export type WorkflowData = Record<string, unknown>;
/**
 * A generic interface to support structural duck-typing for modern validators (Zod, Valibot)
 * or raw validation functions.
 */
// biome-ignore lint/suspicious/noExplicitAny: Expect any.
export type SchemaLike<T = any> =
  // biome-ignore lint/suspicious/noExplicitAny: Expect any.
  | { parse: (val: any, ...args: any[]) => T | Promise<T> }
  // biome-ignore lint/suspicious/noExplicitAny: Expect any.
  | ((val: any, ...args: any[]) => T | Promise<T>);
/**
 * Extracts the resulting type from a schema.
 */
export type InferSchema<S> = S extends { _output: infer O }
  ? O
  : // biome-ignore lint/suspicious/noExplicitAny: Expect any.
    S extends { parse: (val: any, ...args: any[]) => infer T }
    ? Awaited<T>
    : // biome-ignore lint/suspicious/noExplicitAny: Expect any.
      S extends (val: any, ...args: any[]) => infer T
      ? Awaited<T>
      : never;
/**
 * Extracts the input requirement from a schema.
 */
export type InferInSchema<S> = S extends { _input: infer I } ? I : InferSchema<S>;
/**
 * Optional human-readable metadata attached to a workflow or step.
 * Supports duck-typed schema validation for input and output, alongside free-form metadata.
 */
export type WorkflowMeta<In = unknown, Out = unknown> = {
  name?: string;
  description?: string;
  input?: In;
  output?: Out;
  [key: string]: unknown;
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
 * The status of a workflow step.
 */
export type WorkflowStatus = (typeof WORKFLOW_STATUS)[keyof typeof WORKFLOW_STATUS];

/**
 * Represents the state of a single execution step.
 */
export type StepState = {
  id: string;
  status: WorkflowStatus;

  name?: string;
  description?: string;

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
  controller: AbortController;
};
export type Narrow<O, K extends keyof O, V> = O & Record<K, V>;
export type SwitchCases<O extends WorkflowData, K extends keyof O> = {
  [V in
    | (O[K] & (string | number))
    | (true extends O[K] ? 'true' : never)
    | (false extends O[K] ? 'false' : never)
    | 'default']?: V extends 'default'
    ? // biome-ignore lint/suspicious/noExplicitAny: Expect any.
      (resolve: Workflow<O, O>['then']) => any
    : V extends 'true'
      ? // biome-ignore lint/suspicious/noExplicitAny: Expect any.
        (resolve: Workflow<Narrow<O, K, true>, Narrow<O, K, true>>['then']) => any
      : V extends 'false'
        ? // biome-ignore lint/suspicious/noExplicitAny: Expect any.
          (resolve: Workflow<Narrow<O, K, false>, Narrow<O, K, false>>['then']) => any
        : V extends string | number
          ? // biome-ignore lint/suspicious/noExplicitAny: Expect any.
            (resolve: Workflow<Narrow<O, K, V>, Narrow<O, K, V>>['then']) => any
          : never;
};
export type SwitchCasesFn<O extends WorkflowData, U extends string | number | boolean> = {
  [V in
    | (U & (string | number))
    | (true extends U ? 'true' : never)
    | (false extends U ? 'false' : never)
    // biome-ignore lint/suspicious/noExplicitAny: Expect any.
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
  (input: I): WorkflowReader<O>;

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
  then<R extends WorkflowData, In extends O = O>(
    fn: (input: In) => R | Promise<R>,
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
  catch<R extends WorkflowData, In extends O = O>(
    fn: (error: Error, input: In) => R | Promise<R>,
    meta?: WorkflowMeta
  ): Workflow<I, O | Awaited<R>>;

  /**
   * Adds a finalization step that runs whether the workflow succeeded or failed.
   * Does not modify the output value, but can perform cleanup.
   *
   * @param fn - A cleanup function.
   * @param meta - Optional metadata.
   */
  finally<In extends O = O>(
    fn: (input: In, error?: Error) => void | Promise<void>,
    meta?: WorkflowMeta
  ): Workflow<I, O>;

  /**
   * Browser-only: Executes the workflow once, deferring evaluation until the microtask queue flushes.
   *
   * @param input - The input value.
   * @returns A WorkflowReader tracking the execution.
   */
  once(input: I): WorkflowReader<O>;

  /**
   * Browser-only: Executes the workflow reactively whenever the getter dependencies change,
   * starting immediately.
   *
   * @param getInput - A function that reactively provides the input, or a static input.
   * @param debounce - The debounce time in milliseconds for input changes.
   * @returns A WorkflowReader tracking the debounced execution.
   */
  with(getInput: () => I, debounce?: number): WorkflowReader<O>;

  /**
   * Browser-only: Executes the workflow reactively whenever the getter dependencies change,
   * but defers the initial execution until manually triggered or a dependency updates.
   *
   * @param getInput - A function that reactively provides the input, or a static input.
   * @param debounce - The debounce time in milliseconds for input changes.
   * @returns A WorkflowReader tracking the deferred execution.
   */
  when(getInput: () => I, debounce?: number): WorkflowReader<O>;
}

/**
 * Creates a new workflow pipeline or clones an existing one.
 *
 * @param meta - Optional metadata describing the workflow.
 * @returns A callable Workflow that accepts input and produces a Promise of the output.
 */
export type ResolveInput<I, M> = M extends { input: SchemaLike }
  ? InferInSchema<M['input']> extends WorkflowData
    ? InferInSchema<M['input']>
    : I
  : I;
export type ResolveOutput<I, M> = M extends { input: SchemaLike }
  ? InferSchema<M['input']> extends WorkflowData
    ? InferSchema<M['input']>
    : I
  : I;
