import { createObserver } from '../reactive/index.js';
import { onCleanup } from '../scope/index.js';
import { microtask } from '../utils/index.js';
import { uuid } from '../utils/uuid.js';
import { WORKFLOW_STATUS } from './constant.js';
import { WorkflowStepper } from './stepper.js';

import type {
  ResolveInput,
  ResolveOutput,
  SchemaLike,
  Workflow,
  WorkflowCatch,
  WorkflowData,
  WorkflowEntry,
  WorkflowFinally,
  WorkflowInstance,
  WorkflowMeta,
  WorkflowStep,
  WorkflowStepContext,
  WorkflowSwitch,
} from './types.js';
import { isBrowser } from '../module.js';

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
  const enqueue = (stepper: WorkflowStepper<I, O>, input: I) => {
    for (const hook of WORKFLOW_HOOKS.onQueue) {
      hook(stepper as never);
    }

    stepper.run(input).then(() => {
      for (const hook of WORKFLOW_HOOKS.onDequeue) {
        hook(stepper as never, stepper.output, stepper.error);
      }
    });
  };

  const fn = ((input: I, init?: O) => {
    const stepper = new WorkflowStepper<I, O>(steps, {
      seed: init,
      schema: {
        input: workflowMeta?.input as SchemaLike,
        output: workflowMeta?.output as SchemaLike,
      },
    });
    enqueue(stepper, input);
    return stepper;
  }) as Workflow<I, O>;

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
      handler: handler as (input: WorkflowData, ctx: WorkflowStepContext) => WorkflowData | Promise<WorkflowData>,
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
      handler: handler as (
        error: Error,
        input: WorkflowData,
        ctx: WorkflowStepContext
      ) => WorkflowData | Promise<WorkflowData>,
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
      handler: handler as (
        input: WorkflowData,
        error: Error | undefined,
        ctx: WorkflowStepContext
      ) => void | Promise<void>,
      meta,
    };

    for (const hook of WORKFLOW_HOOKS.onStep) hook(entry);

    return createWorkflow(id, prefix, [...steps, entry], workflowMeta);
  }) as Workflow<I, O>['finally'];

  const prepare = (getInput: () => I, init?: O, deferred?: boolean, debounce = 0) => {
    const stepper = new WorkflowStepper<I, O>(steps, {
      seed: init,
      passive: true,
      schema: {
        input: workflowMeta?.input as SchemaLike,
        output: workflowMeta?.output as SchemaLike,
      },
    });

    if (!deferred) {
      stepper.state.status = WORKFLOW_STATUS.PENDING;
    }

    if (isBrowser()) {
      const observer = createObserver(() => {
        // observer.reset();
        dispatch();
      });

      const [schedule, cancel] = microtask(debounce);

      const dispatch = (coalesce = true) => {
        const input = observer.run(getInput);

        if (!coalesce) {
          stepper.reset();
          enqueue(stepper, input);
          return;
        }

        schedule(() => {
          stepper.reset();
          enqueue(stepper, input);
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

    return stepper;
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
    const stepper = new WorkflowStepper<I, O>(steps, {
      seed: ri.init,
      passive: true,
      schema: {
        input: workflowMeta?.input as SchemaLike,
        output: workflowMeta?.output as SchemaLike,
      },
    });
    const s = stepper as never as WorkflowStepper<I, O> & { dispatch: (input: I) => void };

    if (ri.debounce) {
      const [schedule, cancel] = microtask(ri.debounce);

      s.dispatch = (input: I) =>
        schedule(() => {
          stepper.reset();
          enqueue(stepper, input);
        });

      onCleanup(cancel);

      return s;
    }

    s.dispatch = (input: I) => {
      stepper.reset();
      enqueue(stepper, input);
    };
    return s;
  }) as Workflow<I, O>['later'];

  return fn;
}
