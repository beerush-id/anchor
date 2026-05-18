import { mutable } from '../reactive/ref.js';
import { uuid } from '../utils/uuid.js';
import type {
  ResolveInput,
  ResolveOutput,
  SchemaLike,
  StepState,
  Workflow,
  WorkflowCatch,
  WorkflowData,
  WorkflowEntry,
  WorkflowFinally,
  WorkflowInstance,
  WorkflowMeta,
  WorkflowStep,
  WorkflowSwitch,
} from './types.js';

export const WORKFLOW_HOOKS = {
  onRegister: new Set<(workflow: Workflow<WorkflowData, WorkflowData>) => void>(),
  onStep: new Set<(step: WorkflowEntry) => void>(),
  onQueue: new Set<(instance: WorkflowInstance) => void>(),
  onDequeue: new Set<(instance: WorkflowInstance, output?: WorkflowData, error?: Error) => void>(),
};

export function plan<I extends WorkflowData, O extends WorkflowData>(
  workflow: Workflow<I, O>,
  meta?: WorkflowMeta
): Workflow<I, O>;
export function plan<M extends WorkflowMeta>(
  meta: M
): Workflow<ResolveInput<WorkflowData, M>, ResolveOutput<WorkflowData, M>>;
export function plan<I extends WorkflowData = WorkflowData>(meta?: WorkflowMeta): Workflow<I, I>;
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
  fn.then = <R extends WorkflowData, In extends O = O>(
    handler: (input: In) => R | Promise<R>,
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
        // biome-ignore lint/complexity/noBannedTypes: Expect loose.
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

  fn.catch = <R extends WorkflowData, In extends O = O>(
    handler: (error: Error, input: In) => R | Promise<R>,
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

  fn.finally = <In extends O = O>(
    handler: (input: In, error?: Error) => void | Promise<void>,
    meta?: WorkflowMeta
  ): Workflow<I, O> => {
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

  if (instance.workflow.meta?.input) {
    const schema = instance.workflow.meta.input as SchemaLike;
    value = typeof schema === 'function' ? await schema(value) : await schema.parse(value);
  }

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
        if (entry.meta?.input) {
          const schema = entry.meta.input as SchemaLike;
          value = typeof schema === 'function' ? await schema(value) : await schema.parse(value);
        }

        value = await entry.handler(value);

        if (entry.meta?.output) {
          const schema = entry.meta.output as SchemaLike;
          value = typeof schema === 'function' ? await schema(value) : await schema.parse(value);
        }
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

  if (instance.workflow.meta?.output && !currentError) {
    const schema = instance.workflow.meta.output as SchemaLike;
    value = typeof schema === 'function' ? await schema(value) : await schema.parse(value);
  }

  if (currentError) {
    throw currentError;
  }

  return value;
}
