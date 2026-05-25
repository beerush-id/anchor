import { createObserver, mutable } from '../reactive/index.js';
import { onCleanup } from '../scope/index.js';
import { isBrowser, microtask } from '../utils/index.js';
import { uuid } from '../utils/uuid.js';
import { WORKFLOW_STATUS } from './constant.js';
import { type WorkflowReader, workflowReader } from './reader.js';
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

/**
 * Clones an existing workflow's steps into a new independent pipeline.
 *
 * The new workflow shares the step definitions but has its own identity,
 * allowing divergent chains via additional `.then()` or `.switch()` calls.
 *
 * @param workflow - The existing workflow to clone steps from.
 * @param meta - Optional metadata to attach to the new workflow.
 */
export function plan<I extends WorkflowData, O extends WorkflowData>(
  workflow: Workflow<I, O>,
  meta?: WorkflowMeta
): Workflow<I, O>;
/**
 * Creates a new workflow pipeline with schema-validated input and output types.
 *
 * The input and output types are inferred from the schemas provided in the metadata.
 *
 * @param meta - Metadata containing `input` and/or `output` schemas.
 */
export function plan<M extends WorkflowMeta>(
  meta: M
): Workflow<ResolveInput<WorkflowData, M>, ResolveOutput<WorkflowData, M>>;
/**
 * Creates a new empty workflow pipeline.
 *
 * The input type defaults to `WorkflowData` unless explicitly provided
 * as a type parameter. The output type mirrors the input until
 * transformed by `.then()` steps.
 *
 * @param meta - Optional metadata to attach to the workflow.
 */
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

function resolveInit<O>(initOrDebounce?: O | number, debounce?: number) {
  const hasInit = typeof initOrDebounce === 'object';
  return {
    init: hasInit ? (initOrDebounce as O) : undefined,
    debounce: hasInit ? debounce : (initOrDebounce as number | undefined),
  };
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
  const fn = ((input: I, init?: O) => {
    return initialize(input, init, true).reader;
  }) as Workflow<I, O>;

  const initialize = (input: I, init?: O, run?: boolean, resumable?: boolean) => {
    const states = new WeakMap<WorkflowEntry, StepState>();

    for (const step of steps) {
      states.set(
        step,
        mutable<StepState>(
          {
            id: uuid(),
            name: step.meta?.name ?? step.path,
            description: step.meta?.description,
            status: 'idle',
          },
          { recursive: false }
        )
      );
    }

    const instance: WorkflowInstance = {
      input,
      states,
      id: uuid(),
      workflow: fn as Workflow<WorkflowData, WorkflowData>,
      controller: new AbortController(),
    };

    const reader = workflowReader(instance, init, run ? WORKFLOW_STATUS.PENDING : WORKFLOW_STATUS.IDLE, resumable);

    let shouldReset = false;

    const start = (startInput: I) => {
      if (shouldReset) {
        for (const step of steps) {
          const state = states.get(step)!;

          state.id = uuid();
          state.data = undefined;
          state.error = undefined;
          state.status = WORKFLOW_STATUS.IDLE;
        }

        reader.state.status = WORKFLOW_STATUS.PENDING;
        reader.state.error = undefined;
        reader.state.data = init;
        reader.controller = instance.controller = new AbortController();
      }

      for (const hook of WORKFLOW_HOOKS.onQueue) hook(instance);

      execute(instance, steps, startInput, reader as WorkflowReader<WorkflowData>).then(
        (output) => {
          reader.accept(output as O, shouldReset);
          for (const hook of WORKFLOW_HOOKS.onDequeue) hook(instance, output);
          shouldReset = true;
        },
        (error) => {
          reader.reject(error, shouldReset);
          for (const hook of WORKFLOW_HOOKS.onDequeue) hook(instance, undefined, error);
          shouldReset = true;
        }
      );
    };

    if (run) start(input);

    return { reader, start };
  };

  Object.defineProperty(fn, 'id', { value: id, enumerable: true });
  Object.defineProperty(fn, 'steps', { value: steps, enumerable: true });
  Object.defineProperty(fn, 'meta', { value: workflowMeta, enumerable: true });

  for (const hook of WORKFLOW_HOOKS.onRegister) hook(fn as Workflow<WorkflowData, WorkflowData>);

  // biome-ignore lint/suspicious/noThenProperty: expect promise-like.
  fn.then = (<R extends WorkflowData, In extends O = O>(
    handler: (input: In) => R | Promise<R>,
    meta?: WorkflowMeta
  ) => {
    const path = `${prefix}${steps.length + 1}`;

    const step: WorkflowStep = {
      id: uuid(),
      path,
      type: 'step',
      handler: handler as (input: WorkflowData) => WorkflowData | Promise<WorkflowData>,
      meta,
    };

    for (const hook of WORKFLOW_HOOKS.onStep) hook(step);

    return createWorkflow(id, prefix, [...steps, step], workflowMeta);
  }) as Workflow<I, O>['then'];

  fn.switch = ((
    keyOrMatcher: string | ((input: O) => string | number | boolean | Promise<string | number | boolean>),
    cases: Record<string, Workflow<WorkflowData, WorkflowData>>,
    meta?: WorkflowMeta
  ) => {
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
  }) as Workflow<I, O>['switch'];

  fn.catch = (<R extends WorkflowData, In extends O = O>(
    handler: (error: Error, input: In) => R | Promise<R>,
    meta?: WorkflowMeta
  ) => {
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
  }) as Workflow<I, O>['catch'];

  fn.finally = (<In extends O = O>(
    handler: (input: In, error?: Error) => void | Promise<void>,
    meta?: WorkflowMeta
  ) => {
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
  }) as Workflow<I, O>['finally'];

  const prepare = (getInput: () => I, init?: O, deferred?: boolean, debounce = 0) => {
    const { reader, start } = initialize(getInput(), init, false);

    if (!deferred) {
      reader.state.status = WORKFLOW_STATUS.PENDING;
    }

    if (isBrowser()) {
      const observer = createObserver(() => {
        observer.reset();
        dispatch();
      });

      const [schedule, cancel] = microtask(debounce);

      const dispatch = (coalesce = true) => {
        const input = observer.run(getInput);

        if (!coalesce) {
          start(input);
          return;
        }

        schedule(() => {
          start(input);
        });
      };

      if (deferred) {
        observer.run(getInput);
      } else {
        dispatch(false);
      }

      onCleanup(() => {
        cancel();
        observer.destroy();
      });
    }

    return reader;
  };

  fn.once = ((input: I, init?: O) => {
    return prepare(() => input, init);
  }) as Workflow<I, O>['once'];

  fn.with = ((getInput: () => I, initOrDebounce?: O | number, debounce?: number) => {
    const r = resolveInit(initOrDebounce, debounce);
    return prepare(getInput, r.init, false, r.debounce ?? 0);
  }) as Workflow<I, O>['with'];

  fn.when = ((getInput: () => I, initOrDebounce?: O | number, debounce?: number) => {
    const r = resolveInit(initOrDebounce, debounce);
    return prepare(getInput, r.init, true, r.debounce ?? 0);
  }) as Workflow<I, O>['when'];

  fn.later = ((initOrDebounce?: O | number, debounce?: number) => {
    const ri = resolveInit(initOrDebounce, debounce);
    const { reader, start } = initialize(undefined as unknown as I, ri.init, false, true);
    // biome-ignore lint/suspicious/noExplicitAny: <Expect any>
    const r = reader as any;

    if (ri.debounce) {
      const [schedule, cancel] = microtask(ri.debounce);

      r.dispatch = (input: I) =>
        schedule(() => {
          r.resume();
          start(input);
        });

      onCleanup(cancel);

      return reader as WorkflowReader<O> & { dispatch: (input: I) => void };
    }

    r.dispatch = (input: I) => {
      r.resume();
      start(input);
    };
    return reader as WorkflowReader<O> & { dispatch: (input: I) => void };
  }) as Workflow<I, O>['later'];

  return fn;
}

/**
 * Executes a pipeline of steps sequentially, piping each step's output
 * as the next step's input.
 *
 * @param instance - The running instance tracking step states.
 * @param steps - The ordered list of steps to execute.
 * @param input - The initial input value.
 * @param reader - The reader for reporting progress and accepting output.
 * @returns The final output after all steps have executed.
 */
async function execute(
  instance: WorkflowInstance,
  steps: WorkflowEntry[],
  input: WorkflowData,
  reader: WorkflowReader<WorkflowData>
): Promise<WorkflowData> {
  let value: WorkflowData = input;
  let currentError: Error | undefined;

  if (instance.workflow.meta?.input) {
    const schema = instance.workflow.meta.input as SchemaLike;
    value = typeof schema === 'function' ? await schema(value) : await schema.parse(value);
  }

  for (const entry of steps) {
    if (instance.controller.signal.aborted) {
      break;
    }

    const state = instance.states.get(entry)!;
    reader.current = state;

    try {
      if (currentError && entry.type !== 'catch' && entry.type !== 'finally') {
        state.error = currentError;
        state.status = 'skipped';
        continue; // Skip normal steps when in error state
      }

      state.data = value;
      state.status = 'pending';

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

        value = (await branch(value)) as WorkflowData;
      } else if (entry.type === 'catch') {
        if (currentError) {
          value = await entry.handler(currentError, value);
          currentError = undefined; // Recovered
        }
      } else if (entry.type === 'finally') {
        await entry.handler(value, currentError);
      }

      state.data = value;
      state.status = 'success';
    } catch (err) {
      currentError = err instanceof Error ? err : new Error(String(err));
      state.error = currentError;
      state.status = 'error';
    }
  }

  if (instance.workflow.meta?.output && !currentError && !instance.controller.signal.aborted) {
    const schema = instance.workflow.meta.output as SchemaLike;
    value = typeof schema === 'function' ? await schema(value) : await schema.parse(value);
  }

  if (currentError) {
    throw currentError;
  }

  return value;
}
