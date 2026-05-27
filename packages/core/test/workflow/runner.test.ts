import { describe, expect, it, vi } from 'vitest';
import { WORKFLOW_STATUS } from '../../src/workflow/constant.js';
import { WorkflowRunner } from '../../src/workflow/runner.js';
import type {
  WorkflowCatch,
  WorkflowEntry,
  WorkflowFinally,
  WorkflowStep,
  WorkflowSwitch,
} from '../../src/workflow/types.js';

function step(path: string, handler: WorkflowStep['handler'], meta?: WorkflowStep['meta']): WorkflowStep {
  return { type: 'step', id: path, path, handler, meta };
}

function catchStep(path: string, handler: WorkflowCatch['handler'], meta?: WorkflowCatch['meta']): WorkflowCatch {
  return { type: 'catch', id: path, path, handler, meta };
}

function finallyStep(
  path: string,
  handler: WorkflowFinally['handler'],
  meta?: WorkflowFinally['meta']
): WorkflowFinally {
  return { type: 'finally', id: path, path, handler, meta };
}

function switchStep(
  path: string,
  matcher: WorkflowSwitch['matcher'],
  switches: Record<string, { steps: WorkflowEntry[] }>,
  meta?: WorkflowSwitch['meta']
): WorkflowSwitch {
  return { type: 'switch', id: path, path, matcher, switches: switches as never as WorkflowSwitch['switches'], meta };
}

describe('WorkflowRunner', () => {
  it('should create runner with options', () => {
    const input = {};
    const output = {};
    const entry = step('1', (input) => ({ value: (input as any).value + 1 }));
    const controller = new AbortController();
    const runner = new WorkflowRunner(entry, controller.signal, { input, output });

    expect(runner.input).toBe(input);
    expect(runner.output).toBe(output);
  });

  it('should execute a step handler', async () => {
    const entry = step('1', (input) => ({ value: (input as any).value + 1 }));
    const controller = new AbortController();
    const runner = new WorkflowRunner(entry, controller.signal);

    await runner.run({ value: 5 } as any);

    expect(runner.status).toBe(WORKFLOW_STATUS.SUCCESS);
    expect(runner.output).toEqual({ value: 6 });
  });

  it('should catch handler errors', async () => {
    const entry = step('1', () => {
      throw new Error('handler-error');
    });
    const controller = new AbortController();
    const runner = new WorkflowRunner(entry, controller.signal);

    await runner.run({} as any);

    expect(runner.status).toBe(WORKFLOW_STATUS.ERROR);
    expect(runner.error?.message).toBe('handler-error');
  });

  it('should execute catch handler with error', async () => {
    const entry = catchStep('1', (error, _input) => ({
      recovered: true,
      original: error.message,
    }));
    const controller = new AbortController();
    const runner = new WorkflowRunner(entry, controller.signal);

    const pipelineError = new Error('upstream-fail');
    await runner.run({} as any, pipelineError);

    expect(runner.status).toBe(WORKFLOW_STATUS.SUCCESS);
    expect(runner.output).toEqual({ recovered: true, original: 'upstream-fail' });
  });

  it('should execute finally handler with error', async () => {
    const finallyFn = vi.fn();
    const entry = finallyStep('1', (input, error) => {
      finallyFn(input, error);
    });
    const controller = new AbortController();
    const runner = new WorkflowRunner(entry, controller.signal);

    const pipelineError = new Error('upstream-fail');
    await runner.run({ data: 'test' } as any, pipelineError);

    expect(runner.status).toBe(WORKFLOW_STATUS.SUCCESS);
    expect(finallyFn).toHaveBeenCalledWith(expect.objectContaining({ data: 'test' }), pipelineError);
  });

  it('should bail on aborted signal', async () => {
    const handler = vi.fn(() => ({ done: true }));
    const entry = step('1', handler);
    const controller = new AbortController();
    const runner = new WorkflowRunner(entry, controller.signal);

    controller.abort();
    await runner.run({} as any);

    expect(handler).not.toHaveBeenCalled();
    expect(runner.status).toBe(WORKFLOW_STATUS.IDLE);
  });

  it('should skip and cascade to branches', () => {
    const branchEntry = switchStep('1', () => 'a', {
      a: { steps: [step('1.a.1', () => ({ done: true }))] },
      b: { steps: [step('1.b.1', () => ({ done: true }))] },
    });
    const controller = new AbortController();
    const runner = new WorkflowRunner(branchEntry, controller.signal);

    runner.skip(new Error('skip-reason'));
    expect(runner.status).toBe(WORKFLOW_STATUS.SKIPPED);
    expect(runner.error?.message).toBe('skip-reason');
  });

  it('should reset state', async () => {
    const entry = step('1', (input) => ({ value: (input as any).value + 1 }));
    const controller = new AbortController();
    const runner = new WorkflowRunner(entry, controller.signal);

    await runner.run({ value: 5 } as any);
    expect(runner.status).toBe(WORKFLOW_STATUS.SUCCESS);

    runner.reset();
    expect(runner.status).toBe(WORKFLOW_STATUS.IDLE);
  });

  it('should error for invalid step type', async () => {
    const entry = { type: 'invalid', id: '1', path: '1' } as any;
    const controller = new AbortController();
    const runner = new WorkflowRunner(entry, controller.signal);

    await runner.run({} as any);
    expect(runner.status).toBe(WORKFLOW_STATUS.ERROR);
    expect(runner.error?.message).toContain('invalid step type');
  });

  it('should expose name, description, and input from step metadata', async () => {
    const entry = step('1', (input) => input, {
      name: 'test-step',
      description: 'A test step',
    });
    const controller = new AbortController();
    const runner = new WorkflowRunner(entry, controller.signal);

    await runner.run({ value: 42 } as any);

    expect(runner.name).toBe('test-step');
    expect(runner.description).toBe('A test step');
    expect(runner.input).toEqual({ value: 42 });
  });

  it('should reset switch runner and cascade to branches', async () => {
    const branchEntry = switchStep('1', () => 'a', {
      a: { steps: [step('1.a.1', (input) => ({ ...input, a: true }))] },
      b: { steps: [step('1.b.1', (input) => ({ ...input, b: true }))] },
    });
    const controller = new AbortController();
    const runner = new WorkflowRunner(branchEntry, controller.signal);

    await runner.run({} as any);
    expect(runner.status).toBe(WORKFLOW_STATUS.SUCCESS);

    runner.reset();
    expect(runner.status).toBe(WORKFLOW_STATUS.IDLE);
  });

  it('should validate input with function schema', async () => {
    const inputSchema = (val: any) => ({ ...val, validated: true });
    const entry = step('1', (input) => input, { input: inputSchema });
    const controller = new AbortController();
    const runner = new WorkflowRunner(entry, controller.signal);

    await runner.run({ value: 1 } as any);

    expect(runner.status).toBe(WORKFLOW_STATUS.SUCCESS);
    expect(runner.output).toEqual({ value: 1, validated: true });
  });

  it('should validate output with .parse() schema', async () => {
    const outputSchema = { parse: (val: any) => ({ ...val, parsed: true }) };
    const entry = step('1', (input) => input, { output: outputSchema });
    const controller = new AbortController();
    const runner = new WorkflowRunner(entry, controller.signal);

    await runner.run({ value: 1 } as any);

    expect(runner.status).toBe(WORKFLOW_STATUS.SUCCESS);
    expect(runner.output).toEqual({ value: 1, parsed: true });
  });

  it('should skip reset when signal is aborted', async () => {
    const entry = step('1', (input) => ({ value: (input as any).value + 1 }));
    const controller = new AbortController();
    const runner = new WorkflowRunner(entry, controller.signal);

    await runner.run({ value: 5 } as any);
    expect(runner.status).toBe(WORKFLOW_STATUS.SUCCESS);

    controller.abort();
    runner.reset();

    // Should remain SUCCESS — reset is a no-op when aborted.
    expect(runner.status).toBe(WORKFLOW_STATUS.SUCCESS);
  });

  it('should validate input with .parse() schema', async () => {
    const inputSchema = { parse: (val: any) => ({ ...val, parsed: true }) };
    const entry = step('1', (input) => input, { input: inputSchema });
    const controller = new AbortController();
    const runner = new WorkflowRunner(entry, controller.signal);

    await runner.run({ value: 1 } as any);

    expect(runner.status).toBe(WORKFLOW_STATUS.SUCCESS);
    expect(runner.output).toEqual({ value: 1, parsed: true });
  });

  it('should validate output with function schema', async () => {
    const outputSchema = (val: any) => ({ ...val, transformed: true });
    const entry = step('1', (input) => input, { output: outputSchema });
    const controller = new AbortController();
    const runner = new WorkflowRunner(entry, controller.signal);

    await runner.run({ value: 1 } as any);

    expect(runner.status).toBe(WORKFLOW_STATUS.SUCCESS);
    expect(runner.output).toEqual({ value: 1, transformed: true });
  });
});
