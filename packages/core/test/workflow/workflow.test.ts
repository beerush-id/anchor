import { beforeEach, describe, expect, it, vi } from 'vitest';
import { plan, WORKFLOW_HOOKS, type WorkflowSwitch } from '../../src/workflow/index.js';

describe('Workflow API', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  describe('plan', () => {
    it('should create a basic sequential workflow', async () => {
      const workflow = plan<{ value: number }>()
        .then((input) => ({ value: input.value + 1 }))
        .then((input) => ({ value: input.value * 2 }));

      const result = await workflow({ value: 5 });
      expect(result.value).toBe(12);
    });

    it('should attach metadata to workflow and steps', () => {
      const workflow = plan<{ data: string }>({ name: 'test-flow' })
        .then((input) => input, { name: 'step-1' })
        .then((input) => input, { name: 'step-2' });

      expect(workflow.meta?.name).toBe('test-flow');
      expect(workflow.steps).toHaveLength(2);
      expect(workflow.steps[0].meta?.name).toBe('step-1');
      expect(workflow.steps[0].path).toBe('1');
      expect(workflow.steps[1].meta?.name).toBe('step-2');
      expect(workflow.steps[1].path).toBe('2');
    });
    it('should clone an existing workflow if passed to plan()', async () => {
      const base = plan<{ val: number }>().then((input) => ({ val: input.val + 1 }));
      const forked = plan(base).then((input) => ({ val: input.val * 2 }));

      const res1 = await base({ val: 1 });
      expect(res1.val).toBe(2);

      const res2 = await forked({ val: 1 });
      expect(res2.val).toBe(4);
    });
  });

  describe('switch (key-based)', () => {
    const workflow = plan<{ status: 'success' | 'error' | 'pending'; data: string }>().switch('status', {
      success: (resolve) => resolve((input) => ({ result: `Done: ${input.data}` })),
      error: (resolve) => resolve((input) => ({ result: `Fail: ${input.data}` })),
      default: (resolve) => resolve((input) => ({ result: `Wait: ${input.data}` })),
    });

    it('should route to matched branch', async () => {
      const result = await workflow({ status: 'success', data: 'ok' });
      expect(result.result).toBe('Done: ok');

      const errorResult = await workflow({ status: 'error', data: 'bad' });
      expect(errorResult.result).toBe('Fail: bad');
    });

    it('should fallback to default if no case matches', async () => {
      const result = await workflow({ status: 'pending', data: 'hmm' });
      expect(result.result).toBe('Wait: hmm');
    });

    it('should throw if no branch matches and no default is provided', async () => {
      const strictWorkflow = plan<{ type: 'a' | 'b' }>().switch('type', {
        a: (resolve) => resolve(() => ({ done: true })),
      });

      await expect(strictWorkflow({ type: 'b' as any })).rejects.toThrow(
        /Workflow switch "1" has no case for "b" and no default/
      );
    });
  });

  describe('switch (matcher function)', () => {
    const workflow = plan<{ code: number; message: string }>().switch((input) => (input.code === 200 ? 'ok' : 'err'), {
      ok: (resolve) => resolve((input) => ({ ok: true, msg: input.message })),
      err: (resolve) => resolve((input) => ({ ok: false, msg: input.message })),
    });

    it('should route based on matcher return value', async () => {
      const success = await workflow({ code: 200, message: 'Success' });
      expect(success.ok).toBe(true);

      const error = await workflow({ code: 404, message: 'Not Found' });
      expect(error.ok).toBe(false);
    });

    it('should support async matchers', async () => {
      const asyncFlow = plan<{ val: number }>().switch((input) => (input.val > 10 ? 'high' : 'low'), {
        high: (resolve) => resolve(() => ({ isHigh: true })),
        low: (resolve) => resolve(() => ({ isHigh: false })),
      });

      const res = await asyncFlow({ val: 15 });
      expect(res.isHigh).toBe(true);
    });

    it('should support boolean discriminant mapping securely', async () => {
      const boolFlow = plan<{ isActive: boolean }>()
        .switch((input) => input.isActive, {
          true: (resolve) => resolve(() => ({ status: 'active' })),
          false: (resolve) => resolve(() => ({ status: 'inactive' })),
        })
        .then((input) => ({ status: input.status }));

      const res1 = await boolFlow({ isActive: true });
      expect(res1.status).toBe('active');

      const res2 = await boolFlow({ isActive: false });
      expect(res2.status).toBe('inactive');
    });
  });

  describe('nested workflows', () => {
    it('should correctly build hierarchical paths and execute deeply nested steps', async () => {
      const workflow = plan<{ status: 'ok' | 'fail'; code: number }>()
        .then((i) => i) // path: 1
        .switch('status', {
          // path: 2
          ok: (resolve) =>
            resolve((i) => i) // path: 2.ok.1
              .switch('code', {
                // path: 2.ok.2
                200: (resolve2) => resolve2(() => ({ res: 'nested-ok' })), // path: 2.ok.2.200.1
              }),
          fail: (resolve) => resolve(() => ({ res: 'nested-fail' })), // path: 2.fail.1
        });

      const entry = workflow.steps[1];
      expect(entry.path).toBe('2');

      const okBranch = (entry as WorkflowSwitch).switches['ok'];
      expect(okBranch.steps[0].path).toBe('2.ok.1');
      expect(okBranch.steps[1].path).toBe('2.ok.2');

      const deepBranch = (okBranch.steps[1] as WorkflowSwitch).switches['200'];
      expect(deepBranch.steps[0].path).toBe('2.ok.2.200.1');

      const result = await workflow({ status: 'ok', code: 200 });
      expect(result.res).toBe('nested-ok');
    });
  });

  describe('error handling', () => {
    it('should reject workflow execution if a step throws', async () => {
      const workflow = plan<{ value: number }>().then(() => {
        throw new Error('Step failed');
      });

      await expect(workflow({ value: 1 })).rejects.toThrow('Step failed');
    });

    it('should recover from an error if a catch step is provided', async () => {
      const workflow = plan<{ value: number }>()
        .then((input) => {
          if (input.value < 0) {
            throw new Error('Negative value');
          }
          return { status: 'success', value: input.value };
        })
        .then((input) => ({ status: 'double-success', value: input.value * 2 }))
        .catch((error, input) => {
          return { status: 'recovered', value: Math.abs(input.value) };
        });

      const successResult = await workflow({ value: 5 });
      expect(successResult.status).toBe('double-success');
      expect(successResult.value).toBe(10);

      const recoveredResult = await workflow({ value: -5 });
      expect(recoveredResult.status).toBe('recovered');
      expect(recoveredResult.value).toBe(5);
    });

    it('should skip normal steps when in error state until a catch is hit', async () => {
      const skippedStep = vi.fn();

      const workflow = plan<{ value: number }>()
        .then(() => {
          throw new Error('Initial failure');
        })
        .then((input) => {
          skippedStep();
          return input;
        })
        .catch((error, input) => {
          return { value: 999 };
        })
        .then((input) => ({ value: input.value + 1 }));

      const result = await workflow({ value: 1 });
      expect(result.value).toBe(1000);
      expect(skippedStep).not.toHaveBeenCalled();
    });

    it('should execute finally block regardless of success or failure', async () => {
      const finallyHandler = vi.fn();

      const workflow = plan<{ trigger: boolean }>()
        .then((input) => {
          if (input.trigger) throw new Error('Triggered error');
          return input;
        })
        .finally((input, error) => {
          finallyHandler(input, error);
        });

      await workflow({ trigger: false });
      expect(finallyHandler).toHaveBeenCalledTimes(1);
      expect(finallyHandler).toHaveBeenCalledWith({ trigger: false }, undefined);

      finallyHandler.mockClear();

      await expect(workflow({ trigger: true })).rejects.toThrow('Triggered error');
      expect(finallyHandler).toHaveBeenCalledTimes(1);
      expect(finallyHandler).toHaveBeenCalledWith({ trigger: true }, expect.any(Error));
    });

    it('should wrap non-Error throws in an Error object', async () => {
      const workflow = plan<{ value: number }>().then(() => {
        // eslint-disable-next-line no-throw-literal
        throw 'String error';
      });

      await expect(workflow({ value: 1 })).rejects.toThrow('String error');
    });

    it('should stay in error state if a catch block itself throws', async () => {
      const workflow = plan<{ val: number }>()
        .then(() => {
          throw new Error('First error');
        })
        .catch(() => {
          throw new Error('Catch error');
        })
        .then(() => ({ val: 999 }));

      await expect(workflow({ val: 1 })).rejects.toThrow('Catch error');
    });

    it('should transition to error state if a finally block throws', async () => {
      const workflow = plan<{ val: number }>()
        .then((input) => ({ val: input.val + 1 }))
        .finally(() => {
          throw new Error('Finally error');
        });

      await expect(workflow({ val: 1 })).rejects.toThrow('Finally error');
    });

    it('should skip multiple catch blocks correctly when recovering and re-failing', async () => {
      const workflow = plan<{ val: number }>()
        .then(() => {
          throw new Error('First error');
        })
        .catch((_, input) => ({ val: input.val + 10 })) // Recovers: val = 11
        .then((input) => {
          if (input.val > 10) throw new Error('Second error');
          return input;
        })
        .catch((_, input) => ({ val: input.val + 100 })); // Recovers: val = 111

      const result = await workflow({ val: 1 });
      expect(result.val).toBe(111);
    });

    it('should ignore subsequent catch blocks if already recovered', async () => {
      const workflow = plan<{ val: number }>()
        .then(() => {
          throw new Error('Error');
        })
        .catch((_, input) => ({ val: input.val + 1 }))
        .catch((_, input) => ({ val: input.val + 999 })); // Should not execute

      const result = await workflow({ val: 1 });
      expect(result.val).toBe(2);
    });

    it('should sanitize non-Error objects thrown by onDequeue hooks', async () => {
      const hook = () => {
        throw 'String error from hook';
      };
      WORKFLOW_HOOKS.onDequeue.add(hook);

      const workflow = plan<{ val: number }>().then((i) => i);

      await expect(workflow({ val: 1 })).rejects.toThrow('String error from hook');

      WORKFLOW_HOOKS.onDequeue.delete(hook);
    });

    it('should catch errors thrown inside a switch matcher', async () => {
      const workflow = plan<{ status: string }>()
        .switch(
          () => {
            throw new Error('Matcher error');
          },
          {
            default: (resolve) => resolve((i) => i),
          }
        )
        .catch(() => ({ status: 'recovered' }));

      const result = await workflow({ status: 'ok' });
      expect(result.status).toBe('recovered');
    });

    it('should return input unmodified for an empty pipeline', async () => {
      const workflow = plan<{ val: number }>();
      const result = await workflow({ val: 5 });
      expect(result.val).toBe(5);
    });
  });
});
