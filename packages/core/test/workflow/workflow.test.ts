import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { plan, WORKFLOW_HOOKS, type WorkflowSwitch } from '../../src/index.js';

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

  describe('schema validation', () => {
    it('should infer type and validate initial input via plan()', async () => {
      const schema = z.object({ id: z.string(), count: z.number().default(0) });
      const workflow = plan({ input: schema }).then((input) => ({ total: input.count + 1 }));

      // @ts-expect-error missing id
      await expect(workflow({})).rejects.toThrow();

      // Valid input, should apply default value
      const res = await workflow({ id: 'abc' });
      expect(res.total).toBe(1);
    });

    it('should validate and transform final output via plan()', async () => {
      const schema = z.object({ result: z.string().transform((s) => s.toUpperCase()) });
      const workflow = plan({ output: schema }).then((input: { val: string }) => ({ result: input.val }));

      const res = await workflow({ val: 'hello' });
      expect(res.result).toBe('HELLO'); // Transformed by zod

      const badWorkflow = plan({ output: z.object({ result: z.number() }) }).then((input: { val: string }) => ({
        result: input.val,
      }));
      await expect(badWorkflow({ val: 'string' })).rejects.toThrow();
    });

    it('should validate step boundaries', async () => {
      const stepInputSchema = z.object({ value: z.number().min(10) });
      const stepOutputSchema = z.object({ result: z.number().max(100) });

      const workflow = plan<{ value: number }>().then((input) => ({ result: input.value * 2 }), {
        input: stepInputSchema,
        output: stepOutputSchema,
      });

      // Fails input schema (value < 10)
      await expect(workflow({ value: 5 })).rejects.toThrow();

      // Fails output schema (result > 100)
      await expect(workflow({ value: 60 })).rejects.toThrow();

      // Passes both
      const res = await workflow({ value: 20 });
      expect(res.result).toBe(40);
    });

    it('should support raw functions as schemas', async () => {
      const inputSchema = (val: { count?: number }) => ({ ...val, count: (val.count || 0) + 1 });
      const outputSchema = (val: { count: number }) => ({ ...val, count: val.count + 1 });
      const stepSchema = (val: { count: number }) => ({ ...val, count: val.count + 1 });

      const workflow = plan({ input: inputSchema, output: outputSchema }).then((input) => input, {
        input: stepSchema,
        output: stepSchema,
      });

      const res = await workflow({ count: 0 });
      // inputSchema (+1) -> step.input (+1) -> handler -> step.output (+1) -> outputSchema (+1) = 4
      expect(res.count).toBe(4);
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

  describe('complex integration', () => {
    it('should successfully execute a full pipeline with schemas, switches, errors, recovery, and finally blocks', async () => {
      const finallyExecuted = vi.fn();

      // 1. Initial workflow with Input and Output schemas
      const workflow = plan({
        input: z.object({ userId: z.string(), action: z.enum(['charge', 'refund', 'fail']) }),
        output: z.object({ status: z.string(), amount: z.number(), final: z.boolean() }),
      })
        // 2. Initial Step with strict internal step schema
        .then(
          (input) => {
            return { ...input, amount: input.action === 'charge' ? 100 : input.action === 'refund' ? -50 : 0 };
          },
          { output: z.object({ userId: z.string(), action: z.string(), amount: z.number() }) }
        )
        // 3. Switch statement
        .switch('action', {
          charge: (resolve) => resolve((input) => ({ status: 'charged', amount: input.amount })),
          refund: (resolve) => resolve((input) => ({ status: 'refunded', amount: input.amount })),
          default: (resolve) =>
            resolve(() => {
              throw new Error('Unknown or failing action');
            }),
        })
        // 4. Catch block to recover from 'fail' action
        .catch((error) => {
          expect(error.message).toBe('Unknown or failing action');
          return { status: 'recovered', amount: 0 };
        })
        // 5. Final transformation to match the workflow's Output schema
        .then((input) => ({ ...input, final: true }))
        // 6. Finally block to guarantee execution
        .finally(() => {
          finallyExecuted();
        });

      // Execute 'charge' branch
      const chargeRes = await workflow({ userId: 'u1', action: 'charge' });
      expect(chargeRes).toEqual({ status: 'charged', amount: 100, final: true });
      expect(finallyExecuted).toHaveBeenCalledTimes(1);

      // Execute 'refund' branch
      const refundRes = await workflow({ userId: 'u2', action: 'refund' });
      expect(refundRes).toEqual({ status: 'refunded', amount: -50, final: true });
      expect(finallyExecuted).toHaveBeenCalledTimes(2);

      // Execute 'fail' branch (triggers switch default -> throws -> catches -> recovers)
      const failRes = await workflow({ userId: 'u3', action: 'fail' });
      expect(failRes).toEqual({ status: 'recovered', amount: 0, final: true });
      expect(finallyExecuted).toHaveBeenCalledTimes(3);

      // Verify input validation completely blocks bad requests BEFORE steps execute
      // @ts-expect-error intentionally passing invalid action to test runtime validation
      await expect(workflow({ userId: 'u4', action: 'invalid_action' })).rejects.toThrow();
    });
  });
});
