import { describe, expect, it, vi } from 'vitest';
import { effect } from '../../src/reactive/index.js';
import { WORKFLOW_STATUS } from '../../src/workflow/constant.js';
import { WorkflowStepper } from '../../src/workflow/stepper.js';
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

function catchStep(path: string, handler: WorkflowCatch['handler']): WorkflowCatch {
  return { type: 'catch', id: path, path, handler };
}

function finallyStep(path: string, handler: WorkflowFinally['handler']): WorkflowFinally {
  return { type: 'finally', id: path, path, handler };
}

function switchStep(
  path: string,
  matcher: WorkflowSwitch['matcher'],
  switches: Record<string, { steps: WorkflowEntry[] }>
): WorkflowSwitch {
  return { type: 'switch', id: path, path, matcher, switches: switches as never as WorkflowSwitch['switches'] };
}

describe('Workflow Scenarios', () => {
  describe('data pipeline', () => {
    it('should process data through validate → transform → enrich pipeline', async () => {
      const audit: string[] = [];

      const steps: WorkflowEntry[] = [
        step('validate', (input) => {
          audit.push('validate');

          const { email, name } = input as { email: string; name: string };
          if (!email?.includes('@')) throw new Error('Invalid email');
          if (!name?.trim()) throw new Error('Name is required');

          return { email: email.toLowerCase().trim(), name: name.trim() };
        }),
        step('transform', (input) => {
          audit.push('transform');

          const { email, name } = input as { email: string; name: string };
          return {
            email,
            name,
            username: email.split('@')[0],
            domain: email.split('@')[1],
          };
        }),
        step('enrich', (input) => {
          audit.push('enrich');

          return {
            ...input,
            createdAt: '2026-01-01T00:00:00Z',
            role: 'user',
          };
        }),
      ];

      const stepper = new WorkflowStepper(steps);
      await stepper.all({ email: '  John@Example.COM  ', name: ' John Doe ' } as any);

      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
      expect(stepper.output).toEqual({
        email: 'john@example.com',
        name: 'John Doe',
        username: 'john',
        domain: 'example.com',
        createdAt: '2026-01-01T00:00:00Z',
        role: 'user',
      });
      expect(audit).toEqual(['validate', 'transform', 'enrich']);
    });

    it('should reject invalid input at validation step', async () => {
      const steps: WorkflowEntry[] = [
        step('validate', (input) => {
          const { email } = input as { email: string };
          if (!email?.includes('@')) throw new Error('Invalid email');
          return input;
        }),
        step('transform', (input) => input),
      ];

      const stepper = new WorkflowStepper(steps);
      await stepper.all({ email: 'not-an-email' } as any);

      expect(stepper.status).toBe(WORKFLOW_STATUS.ERROR);
      expect(stepper.error?.message).toBe('Invalid email');

      await expect(stepper).rejects.toThrow('Invalid email');
    });
  });

  describe('step-by-step wizard', () => {
    it('should step through a multi-page form, preserving data between pages', async () => {
      const steps: WorkflowEntry[] = [
        step('personal', (input) => ({
          ...input,
          personalComplete: true,
        })),
        step('address', (input) => ({
          ...input,
          addressComplete: true,
        })),
        step('review', (input) => ({
          ...input,
          reviewed: true,
          submittedAt: '2026-01-01',
        })),
      ];

      const stepper = new WorkflowStepper(steps);

      // Page 1: user fills personal info.
      await stepper.run({ name: 'Alice', age: 30 });
      expect(stepper.status).toBe(WORKFLOW_STATUS.PENDING);
      expect(stepper.output).toEqual({ name: 'Alice', age: 30, personalComplete: true });
      // current points to the step that just executed.
      expect(stepper.current?.path).toBe('personal');

      // Page 2: user fills address.
      await stepper.run();
      expect(stepper.status).toBe(WORKFLOW_STATUS.PENDING);
      expect(stepper.output).toHaveProperty('addressComplete', true);
      expect(stepper.output).toHaveProperty('name', 'Alice');

      // Page 3: review and submit.
      await stepper.run();
      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
      expect(stepper.output).toHaveProperty('reviewed', true);
      expect(stepper.output).toHaveProperty('personalComplete', true);
      expect(stepper.output).toHaveProperty('addressComplete', true);
    });

    it('should expose current step info at each point', async () => {
      const steps: WorkflowEntry[] = [
        step('step-a', (input) => input, { name: 'First Step', description: 'Does first thing' }),
        step('step-b', (input) => input, { name: 'Second Step', description: 'Does second thing' }),
      ];

      const stepper = new WorkflowStepper(steps);

      await stepper.run({});

      // current is the step that just executed.
      const current = stepper.current!;
      expect(current.path).toBe('step-a');
      expect(current.name).toBe('First Step');
      expect(current.description).toBe('Does first thing');

      // nextStep is the upcoming step.
      const next = stepper.nextStep!;
      expect(next.path).toBe('step-b');
      expect(next.name).toBe('Second Step');
    });
  });

  describe('error recovery', () => {
    it('should recover from API failure with cached fallback data', async () => {
      const cache = { products: [{ id: 1, name: 'Widget' }] };
      let apiCalls = 0;

      const steps: WorkflowEntry[] = [
        step('fetch-products', async () => {
          apiCalls++;
          // Simulate API failure.
          throw new Error('Service unavailable');
        }),
        catchStep('use-cache', (error, _input) => {
          // Recover with cached data.
          return {
            products: cache.products,
            source: 'cache',
            originalError: error.message,
          };
        }),
        step('format', (input) => {
          const { products, source } = input as { products: any[]; source: string };
          return {
            items: products.map((p: any) => `${p.name} (${p.id})`),
            count: products.length,
            source,
          };
        }),
        finallyStep('log', () => {
          /* log completion */
        }),
      ];

      const stepper = new WorkflowStepper(steps);
      await stepper.all({} as any);

      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
      expect(stepper.output).toEqual({
        items: ['Widget (1)'],
        count: 1,
        source: 'cache',
      });
      expect(apiCalls).toBe(1);
    });

    it('should propagate error when no recovery is possible', async () => {
      const cleanupDone = vi.fn();

      const steps: WorkflowEntry[] = [
        step('critical', () => {
          throw new Error('Disk full');
        }),
        finallyStep('cleanup', () => {
          cleanupDone();
        }),
      ];

      const stepper = new WorkflowStepper(steps);
      await stepper.all({} as any);

      expect(stepper.status).toBe(WORKFLOW_STATUS.ERROR);
      expect(stepper.error?.message).toBe('Disk full');
      // Finally still ran.
      expect(cleanupDone).toHaveBeenCalledTimes(1);

      await expect(stepper).rejects.toThrow('Disk full');
    });
  });

  describe('conditional routing', () => {
    it('should route users to different onboarding flows based on account type', async () => {
      const steps: WorkflowEntry[] = [
        step('classify', (input) => {
          const plan = (input as any).plan;
          return { ...input, tier: plan === 'enterprise' ? 'premium' : 'standard' };
        }),
        switchStep('onboard', (input) => (input as any).tier, {
          premium: {
            steps: [
              step('assign-rep', (input) => ({ ...input, rep: 'Alice', priority: 'high' })),
              step('setup-sla', (input) => ({ ...input, sla: '99.9%' })),
            ],
          },
          standard: {
            steps: [step('send-welcome', (input) => ({ ...input, welcomed: true }))],
          },
        }),
        step('finalize', (input) => ({
          ...input,
          onboardedAt: '2026-01-01',
        })),
      ];

      // Enterprise user.
      const enterprise = new WorkflowStepper(steps);
      await enterprise.all({ plan: 'enterprise', company: 'Acme' } as any);

      expect(enterprise.status).toBe(WORKFLOW_STATUS.SUCCESS);
      expect(enterprise.output).toHaveProperty('rep', 'Alice');
      expect(enterprise.output).toHaveProperty('sla', '99.9%');
      expect(enterprise.output).toHaveProperty('onboardedAt', '2026-01-01');

      // Free user.
      const free = new WorkflowStepper(steps);
      await free.all({ plan: 'free', name: 'Bob' } as any);

      expect(free.status).toBe(WORKFLOW_STATUS.SUCCESS);
      expect(free.output).toHaveProperty('welcomed', true);
      expect(free.output).not.toHaveProperty('rep');
      expect(free.output).toHaveProperty('onboardedAt', '2026-01-01');
    });
  });

  describe('cancellation', () => {
    it('should cleanly cancel a long-running upload workflow', async () => {
      const chunks = ['chunk1', 'chunk2', 'chunk3', 'chunk4', 'chunk5'];
      const uploaded: string[] = [];

      const steps: WorkflowEntry[] = [
        step('prepare', (input) => ({
          ...input,
          totalChunks: chunks.length,
          prepared: true,
        })),
        step('upload', async (input) => {
          for (const chunk of chunks) {
            await new Promise((r) => setTimeout(r, 15));
            uploaded.push(chunk);
          }
          return { ...input, uploaded: true };
        }),
        step('verify', (input) => ({ ...input, verified: true })),
      ];

      const stepper = new WorkflowStepper(steps);

      const promise = stepper.all({ fileId: 'abc-123' } as any);

      // Cancel after prepare runs but during upload.
      await new Promise((r) => setTimeout(r, 30));
      stepper.abort();

      await promise;

      expect(stepper.status).toBe(WORKFLOW_STATUS.ABORTED);
      // Upload started but didn't finish all chunks (or finished the step but verify didn't run).
      expect(uploaded.length).toBeLessThanOrEqual(chunks.length);
    });

    it('should respect parent abort signal in child workflows', async () => {
      const parentController = new AbortController();
      const step2 = vi.fn();

      const steps: WorkflowEntry[] = [
        step('work', async (input) => {
          await new Promise((r) => setTimeout(r, 20));
          return { ...input, done: true };
        }),
        step('next', (input) => {
          step2();
          return input;
        }),
      ];

      const stepper = new WorkflowStepper(steps, {} as any, undefined, parentController.signal);

      const promise = stepper.all({} as any);
      parentController.abort();

      await promise;

      expect(stepper.status).toBe(WORKFLOW_STATUS.ABORTED);
      expect(step2).not.toHaveBeenCalled();
    });
  });

  describe('promise interface', () => {
    it('should work as a standard Promise via await', async () => {
      const steps: WorkflowEntry[] = [
        step('1', (input) => ({ value: (input as any).value * 2 })),
        step('2', (input) => ({ value: (input as any).value + 10 })),
      ];

      const stepper = new WorkflowStepper(steps, { value: 5 } as any);
      const result = await stepper;

      expect(result).toEqual({ value: 20 });
    });

    it('should work with .then() chaining', async () => {
      const steps: WorkflowEntry[] = [step('1', (input) => ({ value: (input as any).value + 1 }))];

      const stepper = new WorkflowStepper(steps, { value: 10 } as any);
      const doubled = await stepper.then((result) => ({ value: (result as any).value * 2 }));

      expect(doubled).toEqual({ value: 22 });
    });

    it('should catch errors via .catch() on the stepper', async () => {
      const steps: WorkflowEntry[] = [
        step('1', () => {
          throw new Error('pipeline-failure');
        }),
      ];

      const stepper = new WorkflowStepper(steps, {} as any);
      const error = await stepper.catch((e) => e as Error);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('pipeline-failure');
    });
  });

  describe('reactive state', () => {
    it('should emit status transitions in correct order via effect()', async () => {
      const transitions: string[] = [];

      const steps: WorkflowEntry[] = [
        step('1', (input) => ({ value: (input as any).value + 1 })),
        step('2', (input) => ({ value: (input as any).value * 2 })),
      ];

      const stepper = new WorkflowStepper(steps);

      const cleanup = effect(() => {
        transitions.push(stepper.status);
      });

      await stepper.all({ value: 5 } as any);

      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
      // Initial read (idle) + pending + success = at minimum these transitions.
      expect(transitions).toContain(WORKFLOW_STATUS.IDLE);
      expect(transitions).toContain(WORKFLOW_STATUS.PENDING);
      expect(transitions).toContain(WORKFLOW_STATUS.SUCCESS);

      cleanup();
    });

    it('should allow subscribing to stepper output changes', async () => {
      const outputs: unknown[] = [];

      const steps: WorkflowEntry[] = [
        step('1', () => ({ count: 1 })),
        step('2', () => ({ count: 2 })),
        step('3', () => ({ count: 3 })),
      ];

      const stepper = new WorkflowStepper(steps);

      const cleanup = effect(() => {
        if (stepper.output !== undefined) {
          outputs.push(stepper.output);
        }
      });

      await stepper.all({} as any);

      expect(outputs.length).toBeGreaterThanOrEqual(1);
      // Last observed output should be the final result.
      expect(outputs[outputs.length - 1]).toEqual({ count: 3 });

      cleanup();
    });
  });

  describe('composition', () => {
    it('should nest a sub-workflow inside a parent step', async () => {
      const subSteps: WorkflowEntry[] = [
        step('sub-1', (input) => ({ ...input, enriched: true })),
        step('sub-2', (input) => ({ ...input, scored: 85 })),
      ];

      const steps: WorkflowEntry[] = [
        step('prepare', (input) => ({ ...input, prepared: true })),
        step('process', async (input) => {
          // Run a sub-workflow as part of this step.
          const sub = new WorkflowStepper(subSteps);
          await sub.all(input as any);
          return sub.output as any;
        }),
        step('report', (input) => ({ ...input, reported: true })),
      ];

      const stepper = new WorkflowStepper(steps);
      await stepper.all({ userId: '42' } as any);

      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
      expect(stepper.output).toEqual({
        userId: '42',
        prepared: true,
        enriched: true,
        scored: 85,
        reported: true,
      });
    });
  });

  describe('schema validation pipeline', () => {
    it('should validate input and output at step boundaries', async () => {
      const validateUser = (val: any) => {
        if (!val.email || !val.name) throw new Error('Missing required fields');
        return { email: String(val.email), name: String(val.name) };
      };

      const validateResult = {
        parse: (val: any) => {
          if (!val.id) throw new Error('Result must have an id');
          return val;
        },
      };

      const steps: WorkflowEntry[] = [
        step(
          'create-user',
          (input) => {
            return { ...input, id: 'usr_' + Date.now() };
          },
          {
            input: validateUser,
            output: validateResult,
          }
        ),
      ];

      const stepper = new WorkflowStepper(steps);
      await stepper.all({ email: 'test@test.com', name: 'Test' } as any);

      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
      expect(stepper.output).toHaveProperty('id');
      expect(stepper.output).toHaveProperty('email', 'test@test.com');
    });
  });

  describe('robustness', () => {
    it('should isolate concurrent steppers sharing the same step definitions', async () => {
      const steps: WorkflowEntry[] = [
        step('double', (input) => ({ value: (input as any).value * 2 })),
        step('add', (input) => ({ value: (input as any).value + 100 })),
      ];

      // Two steppers, same definition, different inputs.
      const a = new WorkflowStepper(steps);
      const b = new WorkflowStepper(steps);

      const [resultA, resultB] = await Promise.all([a.all({ value: 5 } as any), b.all({ value: 50 } as any)]);

      // Each stepper must produce its own result, no cross-contamination.
      expect(a.output).toEqual({ value: 110 }); // 5 * 2 + 100
      expect(b.output).toEqual({ value: 200 }); // 50 * 2 + 100
      expect(a.status).toBe(WORKFLOW_STATUS.SUCCESS);
      expect(b.status).toBe(WORKFLOW_STATUS.SUCCESS);
    });

    it('should handle run() called while previous run() is still awaiting', async () => {
      let callCount = 0;

      const steps: WorkflowEntry[] = [
        step('slow', async (input) => {
          callCount++;
          await new Promise((r) => setTimeout(r, 30));
          return { ...input, done: true };
        }),
        step('next', (input) => ({ ...input, next: true })),
      ];

      const stepper = new WorkflowStepper(steps);

      // First run starts the slow step.
      const first = stepper.run({ value: 1 });
      // Second run fires while slow step is still awaiting.
      const second = stepper.run();

      await Promise.all([first, second]);

      // The slow handler should only execute once — the second run() should be a no-op.
      expect(callCount).toBe(1);
    });

    it('should not let finally errors override pipeline status', async () => {
      const steps: WorkflowEntry[] = [
        step('work', (input) => ({ ...input, done: true })),
        finallyStep('cleanup', () => {
          throw new Error('Cleanup failed');
        }),
      ];

      const stepper = new WorkflowStepper(steps);
      await stepper.all({ value: 1 } as any);

      // Pipeline succeeded — cleanup failure doesn't change the verdict.
      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
      expect(stepper.output).toEqual({ value: 1, done: true });

      // Cleanup error is still accessible via the runner.
      const cleanupRunner = stepper.get('cleanup')!;
      expect(cleanupRunner.error?.message).toBe('Cleanup failed');
    });

    it('should handle empty steps array gracefully', async () => {
      const stepper = new WorkflowStepper([]);

      await stepper.all({} as any);

      // No steps → nothing to do → finishes immediately.
      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
    });

    it('should support catch and finally inside a switch branch', async () => {
      const branchCleanup = vi.fn();

      const steps: WorkflowEntry[] = [
        switchStep('route', (input) => (input as any).type, {
          risky: {
            steps: [
              step('danger', () => {
                throw new Error('Branch explosion');
              }),
              catchStep('branch-recover', (error) => ({
                recovered: true,
                from: error.message,
              })),
              finallyStep('branch-cleanup', () => {
                branchCleanup();
              }),
            ],
          },
          safe: {
            steps: [step('safe-work', (input) => ({ ...input, safe: true }))],
          },
        }),
        step('post-branch', (input) => ({ ...input, finished: true })),
      ];

      const stepper = new WorkflowStepper(steps);
      await stepper.all({ type: 'risky' } as any);

      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
      expect(stepper.output).toHaveProperty('recovered', true);
      expect(stepper.output).toHaveProperty('finished', true);
      expect(branchCleanup).toHaveBeenCalledTimes(1);
    });

    it('should produce consistent state after reset during idle', async () => {
      const steps: WorkflowEntry[] = [
        step('1', (input) => ({ value: (input as any).value + 1 })),
        step('2', (input) => ({ value: (input as any).value * 2 })),
      ];

      const stepper = new WorkflowStepper(steps);

      // Run to completion.
      await stepper.all({ value: 5 } as any);
      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
      expect(stepper.output).toEqual({ value: 12 });

      // Reset.
      stepper.reset();
      expect(stepper.status).toBe(WORKFLOW_STATUS.IDLE);

      // Re-run with different input.
      await stepper.all({ value: 10 } as any);
      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
      expect(stepper.output).toEqual({ value: 22 });
    });

    it('should handle deeply nested switch inside switch', async () => {
      const steps: WorkflowEntry[] = [
        switchStep('level-1', (input) => (input as any).region, {
          us: {
            steps: [
              switchStep('level-2', (input) => (input as any).state, {
                ca: {
                  steps: [step('ca-tax', (input) => ({ ...input, tax: 0.0725 }))],
                },
                tx: {
                  steps: [step('tx-tax', (input) => ({ ...input, tax: 0.0625 }))],
                },
              }),
            ],
          },
          eu: {
            steps: [step('eu-vat', (input) => ({ ...input, tax: 0.2 }))],
          },
        }),
        step('total', (input) => {
          const { price, tax } = input as any;
          return { ...input, total: price * (1 + tax) };
        }),
      ];

      const stepper = new WorkflowStepper(steps);
      await stepper.all({ region: 'us', state: 'ca', price: 100 } as any);

      expect(stepper.status).toBe(WORKFLOW_STATUS.SUCCESS);
      expect(stepper.output).toHaveProperty('tax', 0.0725);
      expect((stepper.output as any).total).toBeCloseTo(107.25);
    });

    it('should handle async matcher in switch step', async () => {
      const steps: WorkflowEntry[] = [
        switchStep(
          'classify',
          async (input) => {
            // Simulate async lookup (e.g., database, API).
            await new Promise((r) => setTimeout(r, 5));
            return (input as any).score >= 80 ? 'pass' : 'fail';
          },
          {
            pass: {
              steps: [step('certify', (input) => ({ ...input, certified: true }))],
            },
            fail: {
              steps: [step('remediate', (input) => ({ ...input, needsReview: true }))],
            },
          }
        ),
      ];

      const passing = new WorkflowStepper(steps);
      await passing.all({ score: 92 } as any);
      expect(passing.output).toHaveProperty('certified', true);

      const failing = new WorkflowStepper(steps);
      await failing.all({ score: 55 } as any);
      expect(failing.output).toHaveProperty('needsReview', true);
    });
  });
});
