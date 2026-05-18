import { mutable } from '../reactive/ref.js';
import { safeRun } from '../scope/index.js';
import type { Workflow, WorkflowData, WorkflowEntry, WorkflowInstance } from './workflow.js';
import { WORKFLOW_HOOKS } from './workflow.js';

export const WORKFLOW_EVENT = {
  REGISTER: 'REGISTER',
  STEP: 'STEP',
  QUEUE_WORKFLOW: 'QUEUE_WORKFLOW',
  DEQUEUE_WORKFLOW: 'DEQUEUE_WORKFLOW',
} as const;

export type WorkflowEvent =
  | { type: typeof WORKFLOW_EVENT.REGISTER; data: Workflow<WorkflowData, WorkflowData> }
  | { type: typeof WORKFLOW_EVENT.STEP; data: WorkflowEntry }
  | { type: typeof WORKFLOW_EVENT.QUEUE_WORKFLOW; instance: WorkflowInstance }
  | { type: typeof WORKFLOW_EVENT.DEQUEUE_WORKFLOW; instance: WorkflowInstance; output?: WorkflowData; error?: Error };

export type WorkflowStoreSubscriber = (event: WorkflowEvent) => void;

export class WorkflowStore {
  #subscribers = new Set<WorkflowStoreSubscriber>();

  public steps = safeRun(() => mutable(new Map<string, WorkflowEntry>(), { recursive: false }));
  public workflows = safeRun(() =>
    mutable(new Map<string, Workflow<WorkflowData, WorkflowData>>(), { recursive: false })
  );
  public runningWorkflows = safeRun(() => mutable(new Set<WorkflowInstance>(), { recursive: false }));

  constructor() {
    WORKFLOW_HOOKS.onRegister.add((workflow) => {
      this.register(workflow);
    });

    WORKFLOW_HOOKS.onStep.add((step) => {
      this.steps.set(step.id, step);
      this.broadcast({ type: WORKFLOW_EVENT.STEP, data: step });
    });

    WORKFLOW_HOOKS.onQueue.add((instance) => {
      this.runningWorkflows.add(instance);
      this.broadcast({ type: WORKFLOW_EVENT.QUEUE_WORKFLOW, instance });
    });

    WORKFLOW_HOOKS.onDequeue.add((instance, output, error) => {
      this.runningWorkflows.delete(instance);
      this.broadcast({ type: WORKFLOW_EVENT.DEQUEUE_WORKFLOW, instance, output, error });
    });
  }

  public register(workflow: Workflow<WorkflowData, WorkflowData>) {
    this.workflows.set(workflow.id, workflow);
    this.broadcast({ type: WORKFLOW_EVENT.REGISTER, data: workflow });
  }

  public subscribe(handler: WorkflowStoreSubscriber) {
    if (typeof handler !== 'function') {
      throw new Error('Invalid handler: handler must be a function.');
    }
    this.#subscribers.add(handler);
    return () => this.#subscribers.delete(handler);
  }

  private broadcast(event: WorkflowEvent) {
    for (const subscriber of this.#subscribers) {
      subscriber(event);
    }
  }
}

export const WORKFLOW_STORE = new WorkflowStore();
