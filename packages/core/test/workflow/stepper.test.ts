import { describe, expect, it, vi } from 'vitest';
import { WORKFLOW_STATUS } from '../../src/workflow/constant.js';
import { WorkflowStepper } from '../../src/workflow/stepper.js';
import type {
  WorkflowCatch,
  WorkflowEntry,
  WorkflowFinally,
  WorkflowStep,
  WorkflowSwitch,
} from '../../src/workflow/types.js'; // Helpers to build step entries without the plan() factory.

// Helpers to build step entries without the plan() factory.
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

describe('WorkflowStepper', () => {
  describe('normal flow', () => {
    it('should execute steps sequentially via run()', async () => {
      const steps: WorkflowEntry[] = [
        step('1', (input) => ({ value: (input as any).value + 1 })),
        step('2', (input) => ({ value: (input as any).value * 2 })),
        step('3', (input) => ({ value: (input as any).value + 10 })),
      ];

      // Not passive — stepper promise stays pending, then() won't interfere.
      const stepper = new WorkflowStepper(steps, { input: { value: 5 } });

      await stepper.step({ value: 5 });
      expect(stepper.status).toBe(WORKFLOW_STATUS.PENDING);
      expect(stepper.output).toEqual({ value: 6 });

      await stepper.step();
      expect(stepper.status).toBe(WORKFLOW_STATUS.PENDING);
      expect(stepper.output).toEqual({ value: 12 });

      await stepper.step();
      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
      expect(stepper.output).toEqual({ value: 22 });
    });

    it('should execute all steps via all()', async () => {
      const steps: WorkflowEntry[] = [
        step('1', (input) => ({ value: (input as any).value + 1 })),
        step('2', (input) => ({ value: (input as any).value * 2 })),
      ];

      const stepper = new WorkflowStepper(steps);
      await stepper.run({ value: 5 } as any);

      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
      expect(stepper.output).toEqual({ value: 12 });
    });

    it('should auto-execute via await (implicit then)', async () => {
      const steps: WorkflowEntry[] = [step('1', (input) => ({ value: (input as any).value + 1 }))];

      const stepper = new WorkflowStepper(steps, { input: { value: 10 } });
      const result = await stepper;

      expect(result).toEqual({ value: 11 });
      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
    });
  });

  describe('error recovery', () => {
    it('should auto-recover when catch is present', async () => {
      const skipped = vi.fn();

      const steps: WorkflowEntry[] = [
        step('1', () => {
          throw new Error('fail');
        }),
        step('2', (input) => {
          skipped();
          return input;
        }),
        catchStep('3', (_error, _input) => ({ value: 999 })),
        step('4', (input) => ({ value: (input as any).value + 1 })),
      ];

      const stepper = new WorkflowStepper(steps, { input: { value: 1 } });

      // Call 1: step 1 errors → recovery skips step 2, catch recovers → returns
      await stepper.step({ value: 1 });
      expect(stepper.status).toBe(WORKFLOW_STATUS.PENDING);
      expect(stepper.error).toBeUndefined();
      expect(stepper.output).toEqual({ value: 999 });
      expect(skipped).not.toHaveBeenCalled();

      // Call 2: step 4 executes → finish
      await stepper.step();
      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
      expect(stepper.output).toEqual({ value: 1000 });
    });

    it('should finish with error if no catch is present', async () => {
      const skipped = vi.fn();

      const steps: WorkflowEntry[] = [
        step('1', () => {
          throw new Error('fail');
        }),
        step('2', () => {
          skipped();
          return {};
        }),
        step('3', () => {
          skipped();
          return {};
        }),
      ];

      const stepper = new WorkflowStepper(steps);

      await stepper.step({});
      expect(stepper.status).toBe(WORKFLOW_STATUS.ERROR);
      expect(stepper.error?.message).toBe('fail');
      expect(skipped).not.toHaveBeenCalled();

      await expect(stepper).rejects.toThrow('fail');
    });

    it('should try next catch if first catch fails', async () => {
      const steps: WorkflowEntry[] = [
        step('1', () => {
          throw new Error('original');
        }),
        catchStep('2', () => {
          throw new Error('catch-fail');
        }),
        catchStep('3', (_error, _input) => ({ recovered: true })),
      ];

      const stepper = new WorkflowStepper(steps);

      await stepper.step({});
      expect(stepper.error).toBeUndefined();
      expect(stepper.output).toEqual({ recovered: true });
    });

    it('should finish with error if all catches fail', async () => {
      const steps: WorkflowEntry[] = [
        step('1', () => {
          throw new Error('original');
        }),
        catchStep('2', () => {
          throw new Error('catch1-fail');
        }),
        catchStep('3', () => {
          throw new Error('catch2-fail');
        }),
      ];

      const stepper = new WorkflowStepper(steps);

      await stepper.step({});
      expect(stepper.status).toBe(WORKFLOW_STATUS.ERROR);
      expect(stepper.error?.message).toBe('catch2-fail');

      await expect(stepper).rejects.toThrow('catch2-fail');
    });

    it('should not execute second catch if first catch recovers', async () => {
      const secondCatch = vi.fn();

      const steps: WorkflowEntry[] = [
        step('1', () => {
          throw new Error('fail');
        }),
        catchStep('2', () => ({ fixed: true })),
        catchStep('3', (_e, i) => {
          secondCatch();
          return i;
        }),
      ];

      const stepper = new WorkflowStepper(steps);

      await stepper.step({});
      expect(stepper.output).toEqual({ fixed: true });
      expect(secondCatch).not.toHaveBeenCalled();
    });
  });

  describe('finally handling', () => {
    it('should run finally after success', async () => {
      const finallyFn = vi.fn();

      const steps: WorkflowEntry[] = [
        step('1', (input) => ({ value: (input as any).value + 1 })),
        finallyStep('2', (input, error) => {
          finallyFn(input, error);
        }),
      ];

      const stepper = new WorkflowStepper(steps);

      await stepper.step({ value: 5 });
      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
      expect(stepper.output).toEqual({ value: 6 });
      expect(finallyFn).toHaveBeenCalledTimes(1);
      expect(finallyFn).toHaveBeenCalledWith(expect.objectContaining({ value: 6 }), undefined);
    });

    it('should run finally after error (no catch)', async () => {
      const finallyFn = vi.fn();

      const steps: WorkflowEntry[] = [
        step('1', () => {
          throw new Error('fail');
        }),
        finallyStep('2', (input, error) => {
          finallyFn(input, error);
        }),
      ];

      const stepper = new WorkflowStepper(steps);

      await stepper.step({});
      expect(stepper.status).toBe(WORKFLOW_STATUS.ERROR);
      expect(finallyFn).toHaveBeenCalledTimes(1);
      expect(finallyFn).toHaveBeenCalledWith(expect.anything(), expect.any(Error));

      await expect(stepper).rejects.toThrow('fail');
    });

    it('should run finally after error recovery via catch', async () => {
      const finallyFn = vi.fn();

      const steps: WorkflowEntry[] = [
        step('1', () => {
          throw new Error('fail');
        }),
        catchStep('2', () => ({ recovered: true })),
        finallyStep('3', (input, error) => {
          finallyFn(input, error);
        }),
      ];

      const stepper = new WorkflowStepper(steps);

      await stepper.step({});
      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
      expect(stepper.output).toEqual({ recovered: true });
      expect(finallyFn).toHaveBeenCalledTimes(1);
    });

    it('should preserve output through finally', async () => {
      const steps: WorkflowEntry[] = [
        step('1', () => ({ preserved: true })),
        finallyStep('2', () => {
          /* cleanup */
        }),
      ];

      const stepper = new WorkflowStepper(steps);

      await stepper.step({});
      expect(stepper.output).toEqual({ preserved: true });
    });
  });

  describe('switch', () => {
    it('should propagate through switch branch one step at a time', async () => {
      // Matcher uses external state so re-evaluation works after branch output changes stepper.output.
      const route = { value: 'x' };

      const steps: WorkflowEntry[] = [
        step('1', (input) => input),
        switchStep('2', () => route.value, {
          x: {
            steps: [
              step('2.x.1', (input) => ({ ...input, x1: true })),
              step('2.x.2', (input) => ({ ...input, x2: true })),
            ],
          },
        }),
        step('3', (input) => ({ ...input, done: true })),
      ];

      const stepper = new WorkflowStepper(steps);

      // Step 1: passthrough
      await stepper.step({ route: 'x' });
      expect(stepper.output).toEqual({ route: 'x' });

      // Switch → branch x → x1
      await stepper.step();
      expect(stepper.status).toBe(WORKFLOW_STATUS.PENDING);

      // Switch → branch x → x2 → branch completes
      await stepper.step();
      expect(stepper.status).toBe(WORKFLOW_STATUS.PENDING);

      // Step 3 → finish
      await stepper.step();
      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
      expect(stepper.output).toHaveProperty('done', true);
    });

    it('should run entire branch via all()', async () => {
      const steps: WorkflowEntry[] = [
        step('1', (input) => input),
        switchStep('2', () => 'x', {
          x: {
            steps: [
              step('2.x.1', (input) => ({ ...input, x1: true })),
              step('2.x.2', (input) => ({ ...input, x2: true })),
            ],
          },
        }),
        step('3', (input) => ({ ...input, done: true })),
      ];

      const stepper = new WorkflowStepper(steps);
      await stepper.run({ route: 'x' } as any);

      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
      expect(stepper.output).toHaveProperty('done', true);
    });

    it('should fall back to default branch', async () => {
      const steps: WorkflowEntry[] = [
        switchStep('1', () => 'unknown', {
          a: { steps: [step('1.a.1', () => ({ branch: 'a' }))] },
          default: { steps: [step('1.default.1', () => ({ branch: 'default' }))] },
        }),
      ];

      const stepper = new WorkflowStepper(steps);
      await stepper.run({} as any);

      expect(stepper.output).toEqual({ branch: 'default' });
    });

    it('should error if no branch matches and no default', async () => {
      const steps: WorkflowEntry[] = [
        switchStep('1', () => 'unknown', {
          a: { steps: [step('1.a.1', () => ({ branch: 'a' }))] },
        }),
      ];

      const stepper = new WorkflowStepper(steps);
      await stepper.run({} as any);

      expect(stepper.status).toBe(WORKFLOW_STATUS.ERROR);
      expect(stepper.error?.message).toContain('no case for unknown');

      await expect(stepper).rejects.toThrow(/no case for unknown/);
    });

    it('should handle mid-flight branch change via matcher re-evaluation', async () => {
      const state = { route: 'x' };

      const steps: WorkflowEntry[] = [
        switchStep('1', () => state.route, {
          x: {
            steps: [step('1.x.1', () => ({ from: 'x1' })), step('1.x.2', () => ({ from: 'x2' }))],
          },
          y: {
            steps: [step('1.y.1', () => ({ from: 'y1' })), step('1.y.2', () => ({ from: 'y2' }))],
          },
        }),
      ];

      const stepper = new WorkflowStepper(steps);

      // Switch → x → x1
      await stepper.step({});
      expect(stepper.output).toEqual({ from: 'x1' });

      // User changes state mid-flight
      state.route = 'y';

      // Switch re-evaluates → y → y1
      await stepper.step();
      expect(stepper.output).toEqual({ from: 'y1' });

      // Continue y → y2 → finish
      await stepper.step();
      expect(stepper.output).toEqual({ from: 'y2' });
    });

    it('should propagate branch errors to parent recovery', async () => {
      const steps: WorkflowEntry[] = [
        switchStep('1', () => 'x', {
          x: {
            steps: [
              step('1.x.1', () => {
                throw new Error('branch-error');
              }),
            ],
          },
        }),
        catchStep('2', () => ({ recovered: true })),
      ];

      const stepper = new WorkflowStepper(steps);
      await stepper.run({} as any);

      expect(stepper.error).toBeUndefined();
      expect(stepper.output).toEqual({ recovered: true });
    });
  });

  describe('abort', () => {
    it('should stop execution on abort', async () => {
      const step2 = vi.fn();

      const steps: WorkflowEntry[] = [
        step('1', async () => {
          await new Promise((r) => setTimeout(r, 10));
          return { done: true };
        }),
        step('2', (input) => {
          step2();
          return input;
        }),
      ];

      const stepper = new WorkflowStepper(steps);
      stepper.abort();

      // run() bails immediately when aborted
      const output = await stepper.step({});
      expect(stepper.status).toBe(WORKFLOW_STATUS.ABORTED);
      expect(step2).not.toHaveBeenCalled();
    });

    it('should not allow reset after abort', () => {
      const steps: WorkflowEntry[] = [step('1', (input) => input)];

      const stepper = new WorkflowStepper(steps);
      stepper.abort();
      stepper.reset();

      expect(stepper.status).toBe(WORKFLOW_STATUS.ABORTED);
    });
  });

  describe('skip', () => {
    it('should skip all steps and resolve', () => {
      const steps: WorkflowEntry[] = [step('1', (input) => input), step('2', (input) => input)];

      const stepper = new WorkflowStepper(steps);
      stepper.skip(new Error('parent-skip'));

      expect(stepper.status).toBe(WORKFLOW_STATUS.SKIPPED);

      const step1 = stepper.get('1')!;
      const step2 = stepper.get('2')!;
      expect(step1.status).toBe(WORKFLOW_STATUS.SKIPPED);
      expect(step2.status).toBe(WORKFLOW_STATUS.SKIPPED);
    });
  });

  describe('passive mode', () => {
    it('should resolve promise immediately with initial output', async () => {
      const steps: WorkflowEntry[] = [step('1', (input) => ({ value: (input as any).value + 1 }))];

      const stepper = new WorkflowStepper(steps, { input: { value: 5 }, output: { value: 0 }, passive: true });

      // Passive resolves the promise immediately.
      // await stepper triggers then() → all() runs if IDLE.
      const result = await stepper;
      expect(result).toEqual({ value: 0 });
      await Promise.resolve();

      // After await, all() ran. Stepper is finished.
      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
    });
  });

  describe('reset', () => {
    it('should reset state to IDLE', async () => {
      const steps: WorkflowEntry[] = [
        step('1', (input) => ({ value: (input as any).value + 1 })),
        step('2', (input) => ({ value: (input as any).value + 1 })),
      ];

      const stepper = new WorkflowStepper(steps, { input: { value: 0 } });

      await stepper.step({ value: 0 });
      expect(stepper.status).toBe(WORKFLOW_STATUS.PENDING);

      stepper.reset();
      expect(stepper.status).toBe(WORKFLOW_STATUS.IDLE);
      expect(stepper.current).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should finish immediately when run() is called after all steps completed', async () => {
      const steps: WorkflowEntry[] = [step('1', (input) => ({ value: (input as any).value + 1 }))];

      const stepper = new WorkflowStepper(steps);

      await stepper.step({ value: 5 });
      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
      expect(stepper.output).toEqual({ value: 6 });

      // run() again — no steps remain, hits the early finish().
      await stepper.step();
      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
    });

    it('should set error when a step returns falsy output', async () => {
      const steps: WorkflowEntry[] = [step('1', () => undefined as any)];

      const stepper = new WorkflowStepper(steps);

      await stepper.step({});
      expect(stepper.status).toBe(WORKFLOW_STATUS.ERROR);
      expect(stepper.error?.message).toContain('invalid output');

      await expect(stepper).rejects.toThrow('invalid output');
    });

    it('should set error when a catch handler returns falsy output', async () => {
      const steps: WorkflowEntry[] = [
        step('1', () => {
          throw new Error('fail');
        }),
        catchStep('2', () => undefined as any),
      ];

      const stepper = new WorkflowStepper(steps);

      await stepper.step({});
      expect(stepper.status).toBe(WORKFLOW_STATUS.ERROR);
      expect(stepper.error?.message).toContain('invalid output');

      await expect(stepper).rejects.toThrow('invalid output');
    });

    it('should break all() loop when aborted mid-execution', async () => {
      const step2 = vi.fn();

      const steps: WorkflowEntry[] = [
        step('1', async (input) => {
          await new Promise((r) => setTimeout(r, 10));
          return input;
        }),
        step('2', (input) => {
          step2();
          return input;
        }),
      ];

      const stepper = new WorkflowStepper(steps);

      // Start all(), abort immediately — step 1 is async so all() yields control.
      const promise = stepper.run({} as any);
      stepper.abort();

      await promise;
      expect(step2).not.toHaveBeenCalled();
      expect(stepper.status).toBe(WORKFLOW_STATUS.ABORTED);
    });

    it('should abort during recovery loop', async () => {
      const steps: WorkflowEntry[] = [
        step('1', () => {
          throw new Error('fail');
        }),
        step('2', (input) => input),
        step('3', (input) => input),
        step('4', (input) => input),
        catchStep('5', (_e, input) => input),
      ];

      const stepper = new WorkflowStepper(steps);

      // Abort before running — recovery loop should bail at signal check.
      stepper.abort();

      await stepper.step({});
      expect(stepper.status).toBe(WORKFLOW_STATUS.ABORTED);
    });

    it('should use this.input as fallback when output is undefined', async () => {
      const steps: WorkflowEntry[] = [step('1', (input) => ({ value: (input as any).value + 1 }))];

      // No initial output — nextInput falls back to this.input.
      const stepper = new WorkflowStepper(steps, { input: { value: 10 } } as any);

      await stepper.step({ value: 10 });
      expect(stepper.output).toEqual({ value: 11 });
    });

    it('should use empty object as fallback when both output and input are undefined', async () => {
      const steps: WorkflowEntry[] = [step('1', (input) => ({ keys: Object.keys(input) }))];

      // No input, no output — nextInput falls back to {}.
      const stepper = new WorkflowStepper(steps);

      await stepper.step();
      expect(stepper.output).toEqual({ keys: [] });
    });

    it('should execute finally steps via stepping (multiple run calls)', async () => {
      const finallyFn = vi.fn();

      const steps: WorkflowEntry[] = [
        step('1', (input) => ({ value: (input as any).value + 1 })),
        step('2', (input) => ({ value: (input as any).value * 2 })),
        finallyStep('3', (input, error) => {
          finallyFn(input, error);
        }),
      ];

      const stepper = new WorkflowStepper(steps);

      // Step 1.
      await stepper.step({ value: 5 });
      expect(stepper.status).toBe(WORKFLOW_STATUS.PENDING);

      // Step 2 → detects finally next → enters finally loop → finishes.
      await stepper.step();
      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
      expect(stepper.output).toEqual({ value: 12 });
      expect(finallyFn).toHaveBeenCalledTimes(1);
    });

    it('should unlink external signal on abort', async () => {
      const externalController = new AbortController();
      const steps: WorkflowEntry[] = [step('1', (input) => input)];

      const stepper = new WorkflowStepper(steps, { signal: externalController.signal });

      // Abort via external signal — triggers unlinkSignal.
      externalController.abort();

      expect(stepper.status).toBe(WORKFLOW_STATUS.ABORTED);
    });

    it('should abort during active recovery loop', async () => {
      let abortStepper: (() => void) | undefined;

      const steps: WorkflowEntry[] = [
        step('1', () => {
          throw new Error('fail');
        }),
        catchStep('2', (_e) => {
          // Abort and re-throw — error persists, loop iterates, abort check fires.
          abortStepper?.();
          throw new Error('catch-fail');
        }),
        catchStep('3', (_e, input) => input),
      ];

      const stepper = new WorkflowStepper(steps);
      abortStepper = () => stepper.abort();

      await stepper.step({});
      expect(stepper.status).toBe(WORKFLOW_STATUS.ABORTED);
      await expect(stepper).rejects.toThrow('fail');
    });

    it('should abort during finally loop', async () => {
      let abortStepper: (() => void) | undefined;

      const steps: WorkflowEntry[] = [
        step('1', (input) => input),
        finallyStep('2', async () => {
          abortStepper?.();
          await new Promise((r) => setTimeout(r, 10));
        }),
        finallyStep('3', () => {
          /* should not run */
        }),
      ];

      const stepper = new WorkflowStepper(steps);
      abortStepper = () => stepper.abort();

      await stepper.step({});
      expect(stepper.status).toBe(WORKFLOW_STATUS.ABORTED);
    });

    it('should use fallback inputs in recovery and finally paths', async () => {
      // No input passed to constructor or run() — forces the {} fallback
      // on all ?? chains: lines 141, 169, 189, 198.
      const steps: WorkflowEntry[] = [
        step('1', () => {
          throw new Error('fail');
        }),
        catchStep('2', () => {
          throw new Error('catch-fail');
        }),
        catchStep('3', () => ({ recovered: true })),
        finallyStep('4', () => {
          /* cleanup */
        }),
        finallyStep('5', () => {
          /* cleanup */
        }),
      ];

      const stepper = new WorkflowStepper(steps);

      // No input → this.input = undefined, this.output = undefined.
      await stepper.step();
      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
      expect(stepper.output).toEqual({ recovered: true });
    });

    it('should use {} fallback in finally loop when output and input are undefined', async () => {
      const finallyFns = [vi.fn(), vi.fn()];

      const steps: WorkflowEntry[] = [
        step('1', () => {
          throw new Error('fail');
        }),
        finallyStep('2', (input, error) => {
          finallyFns[0](input, error);
        }),
        finallyStep('3', (input, error) => {
          finallyFns[1](input, error);
        }),
      ];

      const stepper = new WorkflowStepper(steps);

      // No input → this.input = undefined, this.output = undefined.
      // Error with no catch → finally loop entered with both nullish.
      await stepper.step();
      expect(stepper.status).toBe(WORKFLOW_STATUS.ERROR);
      expect(finallyFns[0]).toHaveBeenCalledTimes(1);
      expect(finallyFns[1]).toHaveBeenCalledTimes(1);

      await expect(stepper).rejects.toThrow('fail');
    });
  });

  describe('reader interface', () => {
    it('should return output via data getter', async () => {
      const steps: WorkflowEntry[] = [step('1', () => ({ value: 42 }))];

      const stepper = new WorkflowStepper(steps);
      await stepper.run({});

      expect(stepper.data).toEqual({ value: 42 });
      expect(stepper.data).toBe(stepper.output);
    });

    it('should fall back to seed when output is undefined', () => {
      const stepper = new WorkflowStepper([]);
      stepper.seed({ fallback: true } as any);

      expect(stepper.data).toEqual({ fallback: true });
    });

    it('should prefer output over seed', async () => {
      const steps: WorkflowEntry[] = [step('1', () => ({ fromStep: true }))];

      const stepper = new WorkflowStepper(steps);
      stepper.seed({ fromSeed: true } as any);

      await stepper.run({});

      expect(stepper.data).toEqual({ fromStep: true });
    });

    it('should expose reactive state', () => {
      const stepper = new WorkflowStepper([]);
      const state = stepper.state;

      expect(state).toBeDefined();
      expect(state.status).toBe(WORKFLOW_STATUS.IDLE);
    });

    it('should subscribe to state changes', async () => {
      const events: string[] = [];

      const steps: WorkflowEntry[] = [step('1', () => ({ done: true }))];

      const stepper = new WorkflowStepper(steps);
      const unsubscribe = stepper.subscribe((_, event) => {
        events.push(event.type);
      });

      await stepper.run({});

      expect(events.length).toBeGreaterThan(0);
      unsubscribe();
    });

    it('should pipe state to another stepper', async () => {
      const steps: WorkflowEntry[] = [step('1', () => ({ piped: true }))];

      const source = new WorkflowStepper(steps);
      const target = new WorkflowStepper([]);

      source.pipeTo(target);
      await source.run({});

      expect(target.state.status).toBe(WORKFLOW_STATUS.SUCCESS);
    });

    it('should clean up on close', async () => {
      const steps: WorkflowEntry[] = [step('1', () => ({ done: true }))];

      const stepper = new WorkflowStepper(steps);
      stepper.subscribe(() => {});

      stepper.close();

      // After close, run and all are no-ops.
      await stepper.step({});
      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
    });

    it('should return no-op unsubscribe when closed', () => {
      const stepper = new WorkflowStepper([]);
      stepper.close();

      const unsubscribe = stepper.subscribe(() => {});
      expect(typeof unsubscribe).toBe('function');
      unsubscribe(); // Should not throw.
    });

    it('should skip pipeTo when closed', () => {
      const source = new WorkflowStepper([]);
      const target = new WorkflowStepper([]);

      source.close();
      const result = source.pipeTo(target);

      expect(result).toBe(source);
    });

    it('should no-op all() when closed', async () => {
      const handler = vi.fn(() => ({ done: true }));
      const stepper = new WorkflowStepper([step('1', handler)]);

      stepper.close();
      await stepper.run({});

      expect(handler).not.toHaveBeenCalled();
    });

    it('should no-op skip() when closed', () => {
      const stepper = new WorkflowStepper([step('1', () => ({}))]);

      stepper.close();
      const result = stepper.skip();

      expect(result).toBe(stepper);
    });

    it('should no-op abort() when closed', () => {
      const stepper = new WorkflowStepper([step('1', () => ({}))]);

      stepper.close();
      stepper.abort(); // Should not throw.

      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
    });

    it('should no-op double close()', () => {
      const stepper = new WorkflowStepper([]);

      stepper.close();
      stepper.close(); // Should not throw.

      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
    });
  });

  describe('consecutive catch skipping', () => {
    it('should skip multiple consecutive catch steps when no error', async () => {
      const catch1 = vi.fn((_err: Error, input: Record<string, unknown>) => ({ value: input.value }));
      const catch2 = vi.fn((_err: Error, input: Record<string, unknown>) => ({ value: input.value }));

      const steps: WorkflowEntry[] = [
        step('add', (input) => ({ value: (input as { value: number }).value + 1 })),
        catchStep('catch1', catch1),
        catchStep('catch2', catch2),
        step('double', (input) => ({ value: (input as { value: number }).value * 2 })),
      ];

      const stepper = new WorkflowStepper(steps);
      const output = await stepper.run({ value: 5 });

      expect(output).toEqual({ value: 12 });
      expect(catch1).not.toHaveBeenCalled();
      expect(catch2).not.toHaveBeenCalled();
      expect(stepper.get('catch1')?.status).toBe(WORKFLOW_STATUS.SKIPPED);
      expect(stepper.get('catch2')?.status).toBe(WORKFLOW_STATUS.SKIPPED);
      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
    });
  });

  describe('switch abort', () => {
    it('should abort during switch branch execution', async () => {
      const steps: WorkflowEntry[] = [
        switchStep('route', (input) => (input as { mode: string }).mode, {
          slow: {
            steps: [
              step('slow-step', async (input) => {
                await new Promise((r) => setTimeout(r, 100));
                return { ...input, done: true };
              }),
            ],
          },
        }),
      ];

      const stepper = new WorkflowStepper(steps);
      const promise = stepper.run({ mode: 'slow' });

      // Abort while the branch is running.
      setTimeout(() => stepper.abort(), 10);

      await promise;
      expect(stepper.status).toBe(WORKFLOW_STATUS.ABORTED);
    });
  });

  describe('step(path)', () => {
    it('should jump to and execute a specific step by path', async () => {
      const steps: WorkflowEntry[] = [
        step('1', (input) => ({ ...input, a: true })),
        step('2', (input) => ({ ...input, b: true })),
        step('3', (input) => ({ ...input, c: true })),
      ];

      const stepper = new WorkflowStepper(steps);

      // Run first two steps normally.
      await stepper.step({ value: 1 });
      await stepper.step();
      expect(stepper.output).toEqual({ value: 1, a: true, b: true });

      // Jump back to step '2' — re-executes it.
      await stepper.step('2');
      expect(stepper.output).toHaveProperty('b', true);
    });

    it('should return output when path does not exist', async () => {
      const steps: WorkflowEntry[] = [step('1', (input) => ({ ...input, a: true }))];

      const stepper = new WorkflowStepper(steps);
      await stepper.step({ value: 1 });

      const result = await stepper.step('nonexistent');
      expect(result).toBe(stepper.output);
    });

    it('should jump to first step when path is the first entry', async () => {
      const steps: WorkflowEntry[] = [
        step('1', (input) => ({ ...input, a: true })),
        step('2', (input) => ({ ...input, b: true })),
      ];

      const stepper = new WorkflowStepper(steps);

      await stepper.run({ value: 1 });
      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);

      // Jump back to step '1' — idx is 0, so current becomes undefined.
      stepper.reset();
      await stepper.step('1', { value: 99 });
      expect(stepper.output).toEqual({ value: 99, a: true });
    });
  });

  describe('snapshot / hydrate', () => {
    it('should snapshot the full stepper state', async () => {
      const steps: WorkflowEntry[] = [
        step('1', (input) => ({ ...input, a: true })),
        step('2', (input) => ({ ...input, b: true })),
      ];

      const stepper = new WorkflowStepper(steps);
      await stepper.run({ value: 1 });

      const snap = stepper.snapshot();
      expect(snap.status).toBe(WORKFLOW_STATUS.SUCCESS);
      expect(snap.input).toEqual({ value: 1 });
      expect(snap.output).toEqual({ value: 1, a: true, b: true });
      expect(snap.steps).toHaveLength(2);
      expect(snap.steps[0].path).toBe('1');
      expect(snap.steps[1].path).toBe('2');
    });

    it('should hydrate from a snapshot and resume', async () => {
      const steps: WorkflowEntry[] = [
        step('1', (input) => ({ ...input, a: true })),
        step('2', (input) => ({ ...input, b: true })),
        step('3', (input) => ({ ...input, c: true })),
      ];

      // Run first step, snapshot.
      const stepper1 = new WorkflowStepper(steps);
      await stepper1.step({ value: 1 });
      const snap = stepper1.snapshot();

      // Hydrate a new stepper from the snapshot.
      const stepper2 = new WorkflowStepper(steps, { passive: true });
      stepper2.hydrate(snap);

      expect(stepper2.status).toBe(WORKFLOW_STATUS.PENDING);
      expect(stepper2.output).toEqual({ value: 1, a: true });

      // Resume from step 2.
      await stepper2.step();
      expect(stepper2.output).toEqual({ value: 1, a: true, b: true });
    });

    it('should not hydrate a closed stepper', async () => {
      const steps: WorkflowEntry[] = [step('1', (input) => ({ ...input, a: true }))];

      const stepper = new WorkflowStepper(steps, { passive: true });
      await stepper.run({ value: 1 });
      stepper.close();

      // Stepper is closed. Hydrate is a no-op.
      const result = stepper.hydrate({
        status: WORKFLOW_STATUS.PENDING,
        input: { value: 99 },
        steps: [],
      });

      expect(result).toBe(stepper);
      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
    });

    it('should snapshot error as message string', async () => {
      const steps: WorkflowEntry[] = [
        step('1', () => {
          throw new Error('snap-error');
        }),
      ];

      const stepper = new WorkflowStepper(steps, { passive: true });
      await stepper.step({});

      const snap = stepper.snapshot();
      expect(snap.error).toBe('snap-error');
    });

    it('should hydrate error from message string', () => {
      const steps: WorkflowEntry[] = [step('1', (input) => input)];

      const stepper = new WorkflowStepper(steps, { passive: true });
      stepper.hydrate({
        status: WORKFLOW_STATUS.ERROR,
        input: {},
        error: 'hydrated-error',
        steps: [],
      });

      expect(stepper.error).toBeInstanceOf(Error);
      expect(stepper.error?.message).toBe('hydrated-error');
    });
  });
});
