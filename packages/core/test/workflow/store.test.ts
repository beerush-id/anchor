import { beforeEach, describe, expect, it, vi } from 'vitest';
import { plan, WORKFLOW_EVENT, WORKFLOW_STORE } from '../../src/workflow/index.js';

describe('WorkflowStore', () => {
  beforeEach(() => {
    vi.useRealTimers();
    WORKFLOW_STORE.workflows.clear();
    WORKFLOW_STORE.steps.clear();
    WORKFLOW_STORE.runningWorkflows.clear();
  });

  it('should track registered workflows automatically', () => {
    const subscriber = vi.fn();
    const unsubscribe = WORKFLOW_STORE.subscribe(subscriber);

    // Creating a plan automatically registers it
    const workflow = plan<{ value: number }>({ name: 'test-flow' });

    expect(WORKFLOW_STORE.workflows.has(workflow.id)).toBe(true);
    expect(WORKFLOW_STORE.workflows.get(workflow.id)).toBe(workflow);

    expect(subscriber).toHaveBeenCalledWith({
      type: WORKFLOW_EVENT.REGISTER,
      data: workflow,
    });

    unsubscribe();
  });

  it('should track newly created steps automatically', () => {
    const subscriber = vi.fn();
    const unsubscribe = WORKFLOW_STORE.subscribe(subscriber);

    plan<{ val: number }>()
      .then((i) => i)
      .switch('val', {
        1: (resolve) => resolve((i) => i),
      })
      .catch((_err, i) => i)
      .finally(() => {});

    // Plan creates 0 steps. Then adds 1. Switch adds 1 + 1 (the branch step). Catch adds 1. Finally adds 1. Total = 5.
    expect(WORKFLOW_STORE.steps.size).toBe(5);

    expect(subscriber).toHaveBeenCalledWith(expect.objectContaining({ type: WORKFLOW_EVENT.STEP }));

    unsubscribe();
  });

  it('should track running workflows and emit queue/dequeue events', async () => {
    const subscriber = vi.fn();
    const unsubscribe = WORKFLOW_STORE.subscribe(subscriber);

    const workflow = plan<{ val: number }>().then(async (input) => {
      // Small delay to ensure we can assert while it's pending
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { val: input.val + 1 };
    });

    const promise = workflow({ val: 1 });

    // Should be queued
    expect(WORKFLOW_STORE.runningWorkflows.size).toBe(1);
    const instance = Array.from(WORKFLOW_STORE.runningWorkflows)[0];

    expect(subscriber).toHaveBeenCalledWith({
      type: WORKFLOW_EVENT.QUEUE_WORKFLOW,
      instance,
    });

    const result = await promise;
    expect(result.val).toBe(2);
    await Promise.resolve();

    // Should be dequeued
    expect(WORKFLOW_STORE.runningWorkflows.size).toBe(0);
    expect(subscriber).toHaveBeenCalledWith({
      type: WORKFLOW_EVENT.DEQUEUE_WORKFLOW,
      instance,
      output: { val: 2 },
      error: undefined,
    });

    unsubscribe();
  });

  it('should emit dequeue event with error if workflow fails', async () => {
    const subscriber = vi.fn();
    const unsubscribe = WORKFLOW_STORE.subscribe(subscriber);

    const workflow = plan<{ val: number }>().then(() => {
      throw new Error('Test Error');
    });

    await expect(workflow({ val: 1 })).rejects.toThrow('Test Error');

    expect(WORKFLOW_STORE.runningWorkflows.size).toBe(0);
    expect(subscriber).toHaveBeenCalledWith(
      expect.objectContaining({
        type: WORKFLOW_EVENT.DEQUEUE_WORKFLOW,
        error: expect.any(Error),
      })
    );

    unsubscribe();
  });

  it('should throw an error if an invalid subscriber is provided', () => {
    expect(() => {
      WORKFLOW_STORE.subscribe('not-a-function' as any);
    }).toThrow('Invalid handler: handler must be a function.');
  });
});
