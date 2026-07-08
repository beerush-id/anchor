import { describe, expect, it } from 'vitest';
import { AsyncScope, awaited } from '../../src/index.js';

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

describe('Anchor - Async Context', () => {
  describe('Synchronous Run', () => {
    it('should set and restore store for sync callback', () => {
      const ctx = new AsyncScope<Map<string, string>>();

      expect(ctx.getStore()).toBeUndefined();

      const result = ctx.run(new Map([['key', 'value']]), () => {
        expect(ctx.getStore()?.get('key')).toBe('value');
        return 42;
      });

      expect(result).toBe(42);
      expect(ctx.getStore()).toBeUndefined();
    });

    it('should handle nested sync runs on same scope', () => {
      const ctx = new AsyncScope<string>();

      ctx.run('outer', () => {
        expect(ctx.getStore()).toBe('outer');

        ctx.run('inner', () => {
          expect(ctx.getStore()).toBe('inner');
        });

        expect(ctx.getStore()).toBe('outer');
      });

      expect(ctx.getStore()).toBeUndefined();
    });

    it('should handle nested sync runs on different scopes', () => {
      const ctx1 = new AsyncScope<string>();
      const ctx2 = new AsyncScope<string>();

      ctx1.run('ctx1-store', () => {
        expect(ctx1.getStore()).toBe('ctx1-store');

        ctx2.run('ctx2-store', () => {
          expect(ctx1.getStore()).toBe('ctx1-store');
          expect(ctx2.getStore()).toBe('ctx2-store');
        });

        expect(ctx1.getStore()).toBe('ctx1-store');
        expect(ctx2.getStore()).toBeUndefined();
      });
    });
  });

  describe('Single Await', () => {
    it('should preserve context across one await boundary', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('hello', async () => {
        expect(ctx.getStore()).toBe('hello');

        await awaited(delay(10));

        expect(ctx.getStore()).toBe('hello');
      });

      expect(ctx.getStore()).toBeUndefined();
    });

    it('should return the resolved value through awaited', async () => {
      const ctx = new AsyncScope<string>();

      const result = await ctx.run('store', async () => {
        return awaited(Promise.resolve(42));
      });

      expect(result).toBe(42);
    });
  });

  describe('Multiple Awaits', () => {
    it('should preserve context across multiple await boundaries', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('persistent', async () => {
        expect(ctx.getStore()).toBe('persistent');

        await awaited(delay(5));
        expect(ctx.getStore()).toBe('persistent');

        await awaited(delay(5));
        expect(ctx.getStore()).toBe('persistent');

        await awaited(delay(5));
        expect(ctx.getStore()).toBe('persistent');
      });

      expect(ctx.getStore()).toBeUndefined();
    });
  });

  describe('Nested Async Runs', () => {
    it('should preserve context in nested async runs on same scope', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('outer', async () => {
        expect(ctx.getStore()).toBe('outer');

        await awaited(delay(5));
        expect(ctx.getStore()).toBe('outer');

        await ctx.run('inner', async () => {
          expect(ctx.getStore()).toBe('inner');

          await awaited(delay(5));
          expect(ctx.getStore()).toBe('inner');
        });

        // After inner run completes, outer store should be restored.
        expect(ctx.getStore()).toBe('outer');

        await awaited(delay(5));
        expect(ctx.getStore()).toBe('outer');
      });

      expect(ctx.getStore()).toBeUndefined();
    });

    it('should preserve context in deeply nested async runs', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('L1', async () => {
        await awaited(delay(1));
        expect(ctx.getStore()).toBe('L1');

        await ctx.run('L2', async () => {
          await awaited(delay(1));
          expect(ctx.getStore()).toBe('L2');

          await ctx.run('L3', async () => {
            await awaited(delay(1));
            expect(ctx.getStore()).toBe('L3');
          });

          expect(ctx.getStore()).toBe('L2');
        });

        expect(ctx.getStore()).toBe('L1');
      });

      expect(ctx.getStore()).toBeUndefined();
    });
  });

  describe('Interleaved Contexts', () => {
    it('should maintain isolation between two interleaved scopes', async () => {
      const ctx1 = new AsyncScope<string>();
      const ctx2 = new AsyncScope<string>();
      const order: string[] = [];

      const p1 = ctx1.run('ctx1-store', async () => {
        expect(ctx1.getStore()).toBe('ctx1-store');
        order.push('ctx1-start');

        await awaited(delay(20));

        expect(ctx1.getStore()).toBe('ctx1-store');
        order.push('ctx1-resume');
      });

      const p2 = ctx2.run('ctx2-store', async () => {
        expect(ctx2.getStore()).toBe('ctx2-store');
        order.push('ctx2-start');

        await awaited(delay(10));

        expect(ctx2.getStore()).toBe('ctx2-store');
        order.push('ctx2-resume');
      });

      await Promise.all([p1, p2]);

      // ctx2 resumes first (10ms), then ctx1 (20ms).
      expect(order).toEqual(['ctx1-start', 'ctx2-start', 'ctx2-resume', 'ctx1-resume']);
      expect(ctx1.getStore()).toBeUndefined();
      expect(ctx2.getStore()).toBeUndefined();
    });

    it('should handle interleaved nested runs across scopes', async () => {
      const ctx1 = new AsyncScope<string>();
      const ctx2 = new AsyncScope<string>();

      const p1 = ctx1.run('A1', async () => {
        await awaited(delay(10));
        expect(ctx1.getStore()).toBe('A1');

        await ctx1.run('A2', async () => {
          await awaited(delay(10));
          expect(ctx1.getStore()).toBe('A2');
        });

        expect(ctx1.getStore()).toBe('A1');
      });

      const p2 = ctx2.run('B1', async () => {
        await awaited(delay(5));
        expect(ctx2.getStore()).toBe('B1');

        await ctx2.run('B2', async () => {
          await awaited(delay(15));
          expect(ctx2.getStore()).toBe('B2');
        });

        expect(ctx2.getStore()).toBe('B1');
      });

      await Promise.all([p1, p2]);

      // After all runs complete, stores MUST be clean.
      expect(ctx1.getStore()).toBeUndefined();
      expect(ctx2.getStore()).toBeUndefined();
    });
  });

  describe('Same Scope Interleaved', () => {
    it('should handle two concurrent runs on the same scope', async () => {
      const ctx = new AsyncScope<string>();

      const p1 = ctx.run('run1', async () => {
        expect(ctx.getStore()).toBe('run1');

        await awaited(delay(20));
        expect(ctx.getStore()).toBe('run1');
      });

      const p2 = ctx.run('run2', async () => {
        expect(ctx.getStore()).toBe('run2');

        await awaited(delay(10));
        expect(ctx.getStore()).toBe('run2');
      });

      await Promise.all([p1, p2]);
      expect(ctx.getStore()).toBeUndefined();
    });

    it('should handle two concurrent nested runs on the same scope', async () => {
      const ctx = new AsyncScope<string>();

      const p1 = ctx.run('A', async () => {
        await awaited(delay(10));
        expect(ctx.getStore()).toBe('A');

        await ctx.run('A-inner', async () => {
          await awaited(delay(10));
          expect(ctx.getStore()).toBe('A-inner');
        });

        expect(ctx.getStore()).toBe('A');
      });

      const p2 = ctx.run('B', async () => {
        await awaited(delay(5));
        expect(ctx.getStore()).toBe('B');

        await ctx.run('B-inner', async () => {
          await awaited(delay(15));
          expect(ctx.getStore()).toBe('B-inner');
        });

        expect(ctx.getStore()).toBe('B');
      });

      await Promise.all([p1, p2]);

      // After all runs complete, store MUST be clean.
      expect(ctx.getStore()).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should restore context when callback throws synchronously', () => {
      const ctx = new AsyncScope<string>();

      expect(() => {
        ctx.run('error-store', () => {
          expect(ctx.getStore()).toBe('error-store');
          throw new Error('sync error');
        });
      }).toThrow('sync error');

      expect(ctx.getStore()).toBeUndefined();
    });

    it('should restore context when async callback rejects', async () => {
      const ctx = new AsyncScope<string>();

      await expect(
        ctx.run('error-store', async () => {
          await awaited(delay(5));
          throw new Error('async error');
        })
      ).rejects.toThrow('async error');

      expect(ctx.getStore()).toBeUndefined();
    });

    it('should restore context when awaited promise rejects', async () => {
      const ctx = new AsyncScope<string>();

      await expect(
        ctx.run('error-store', async () => {
          await awaited(Promise.reject(new Error('rejected')));
        })
      ).rejects.toThrow('rejected');

      expect(ctx.getStore()).toBeUndefined();
    });
  });

  describe('Value Passthrough', () => {
    it('should pass resolved value through awaited', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('store', async () => {
        const num = await awaited(Promise.resolve(42));
        expect(num).toBe(42);

        const str = await awaited(Promise.resolve('hello'));
        expect(str).toBe('hello');

        const obj = await awaited(Promise.resolve({ key: 'val' }));
        expect(obj).toEqual({ key: 'val' });
      });
    });

    it('should pass return value through run for async callbacks', async () => {
      const ctx = new AsyncScope<string>();

      const result = await ctx.run('store', async () => {
        await awaited(delay(5));
        return 'final-value';
      });

      expect(result).toBe('final-value');
    });
  });

  describe('Awaited After Nested Run', () => {
    it('should restore outer context after awaited nested run then continue with awaited', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('outer', async () => {
        await awaited(delay(1));
        expect(ctx.getStore()).toBe('outer');

        // Awaited nested run.
        await ctx.run('inner', async () => {
          await awaited(delay(1));
          expect(ctx.getStore()).toBe('inner');
        });

        expect(ctx.getStore()).toBe('outer');

        // Critical: awaited AFTER nested run — tests restorePoint integrity.
        await awaited(delay(1));
        expect(ctx.getStore()).toBe('outer');

        // Another awaited to confirm repeated suspension works.
        await awaited(delay(1));
        expect(ctx.getStore()).toBe('outer');
      });

      expect(ctx.getStore()).toBeUndefined();
    });

    it('should handle multiple awaited in nested run then awaited in outer', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('outer', async () => {
        await ctx.run('inner', async () => {
          // Multiple awaits inside inner run.
          await awaited(delay(1));
          expect(ctx.getStore()).toBe('inner');

          await awaited(delay(1));
          expect(ctx.getStore()).toBe('inner');

          await awaited(delay(1));
          expect(ctx.getStore()).toBe('inner');
        });

        expect(ctx.getStore()).toBe('outer');

        // Multiple awaits in outer after inner completes.
        await awaited(delay(1));
        expect(ctx.getStore()).toBe('outer');

        await awaited(delay(1));
        expect(ctx.getStore()).toBe('outer');
      });

      expect(ctx.getStore()).toBeUndefined();
    });

    it('should handle sequential nested runs with awaited between them', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('outer', async () => {
        await ctx.run('inner-1', async () => {
          await awaited(delay(1));
          expect(ctx.getStore()).toBe('inner-1');
        });

        expect(ctx.getStore()).toBe('outer');
        await awaited(delay(1));
        expect(ctx.getStore()).toBe('outer');

        await ctx.run('inner-2', async () => {
          await awaited(delay(1));
          expect(ctx.getStore()).toBe('inner-2');
        });

        expect(ctx.getStore()).toBe('outer');
        await awaited(delay(1));
        expect(ctx.getStore()).toBe('outer');

        await ctx.run('inner-3', async () => {
          await awaited(delay(1));
          expect(ctx.getStore()).toBe('inner-3');
        });

        expect(ctx.getStore()).toBe('outer');
      });

      expect(ctx.getStore()).toBeUndefined();
    });
  });

  describe('Already Resolved Promises', () => {
    it('should handle already-resolved promises (microtask timing)', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('store', async () => {
        // Promise.resolve is already settled — .then fires as microtask.
        await awaited(Promise.resolve());
        expect(ctx.getStore()).toBe('store');

        await awaited(Promise.resolve());
        expect(ctx.getStore()).toBe('store');
      });

      expect(ctx.getStore()).toBeUndefined();
    });

    it('should handle mix of immediate and delayed promises', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('store', async () => {
        await awaited(Promise.resolve());
        expect(ctx.getStore()).toBe('store');

        await awaited(delay(10));
        expect(ctx.getStore()).toBe('store');

        await awaited(Promise.resolve());
        expect(ctx.getStore()).toBe('store');
      });

      expect(ctx.getStore()).toBeUndefined();
    });
  });

  describe('Cross-Scope Nesting', () => {
    it('should preserve all scopes in sync cross-scope nesting', () => {
      const ctx1 = new AsyncScope<string>();
      const ctx2 = new AsyncScope<string>();

      ctx1.run('A', () => {
        ctx2.run('B', () => {
          ctx1.run('C', () => {
            expect(ctx1.getStore()).toBe('C');
            expect(ctx2.getStore()).toBe('B');
          });

          expect(ctx1.getStore()).toBe('A');
          expect(ctx2.getStore()).toBe('B');
        });

        expect(ctx1.getStore()).toBe('A');
        expect(ctx2.getStore()).toBeUndefined();
      });
    });

    it('should handle async ctx2.run nested inside ctx1.run', async () => {
      const ctx1 = new AsyncScope<string>();
      const ctx2 = new AsyncScope<string>();

      await ctx1.run('ctx1-store', async () => {
        expect(ctx1.getStore()).toBe('ctx1-store');
        expect(ctx2.getStore()).toBeUndefined();

        // Before await — sync cross-scope nesting.
        await ctx2.run('ctx2-store', async () => {
          // Before awaited: both scopes set synchronously.
          expect(ctx2.getStore()).toBe('ctx2-store');

          await awaited(delay(5));

          // After awaited: ctx2 is the active scope.
          expect(ctx2.getStore()).toBe('ctx2-store');
        });

        // After ctx2 completes: ctx1 must be restored.
        expect(ctx1.getStore()).toBe('ctx1-store');
        expect(ctx2.getStore()).toBeUndefined();

        await awaited(delay(5));
        expect(ctx1.getStore()).toBe('ctx1-store');
      });

      expect(ctx1.getStore()).toBeUndefined();
      expect(ctx2.getStore()).toBeUndefined();
    });

    it('should handle deep async cross-scope nesting (ctx1 → ctx2 → ctx1)', async () => {
      const ctx1 = new AsyncScope<string>();
      const ctx2 = new AsyncScope<string>();

      await ctx1.run('A', async () => {
        await ctx2.run('B', async () => {
          await ctx1.run('C', async () => {
            await awaited(delay(1));
            expect(ctx1.getStore()).toBe('C');
          });

          expect(ctx2.getStore()).toBe('B');
        });

        expect(ctx1.getStore()).toBe('A');
      });

      expect(ctx1.getStore()).toBeUndefined();
      expect(ctx2.getStore()).toBeUndefined();
    });
  });

  describe('Constructor Init', () => {
    it('should use initial value from constructor', () => {
      const ctx = new AsyncScope<string>('default');
      expect(ctx.getStore()).toBe('default');

      ctx.run('override', () => {
        expect(ctx.getStore()).toBe('override');
      });

      expect(ctx.getStore()).toBe('default');
    });

    it('should restore to init value after async run', async () => {
      const ctx = new AsyncScope<string>('default');

      await ctx.run('async-store', async () => {
        await awaited(delay(5));
        expect(ctx.getStore()).toBe('async-store');
      });

      expect(ctx.getStore()).toBe('default');
    });
  });

  describe('Concurrent Nested Runs', () => {
    it('should handle two concurrent inner runs within one outer run', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('outer', async () => {
        expect(ctx.getStore()).toBe('outer');

        const inner1 = ctx.run('inner-1', async () => {
          await awaited(delay(20));
          expect(ctx.getStore()).toBe('inner-1');
          return 'result-1';
        });

        const inner2 = ctx.run('inner-2', async () => {
          await awaited(delay(10));
          expect(ctx.getStore()).toBe('inner-2');
          return 'result-2';
        });

        const [r1, r2] = await awaited(Promise.all([inner1, inner2]));
        expect(r1).toBe('result-1');
        expect(r2).toBe('result-2');

        expect(ctx.getStore()).toBe('outer');
      });

      expect(ctx.getStore()).toBeUndefined();
    });
  });

  describe('Deep Interleaving With Timing', () => {
    it('should correctly interleave ctx1 and ctx2 with staggered timers', async () => {
      const ctx1 = new AsyncScope<string>();
      const ctx2 = new AsyncScope<string>();
      const order: string[] = [];

      const p1 = ctx1.run('X', async () => {
        order.push('X-start');
        await awaited(delay(10));
        order.push('X-after-10');
        expect(ctx1.getStore()).toBe('X');

        await ctx1.run('X2', async () => {
          order.push('X2-start');
          await awaited(delay(10));
          order.push('X2-after-10');
          expect(ctx1.getStore()).toBe('X2');
        });

        order.push('X-after-X2');
        expect(ctx1.getStore()).toBe('X');
      });

      const p2 = ctx2.run('Y', async () => {
        order.push('Y-start');
        await awaited(delay(5));
        order.push('Y-after-5');
        expect(ctx2.getStore()).toBe('Y');

        await ctx2.run('Y2', async () => {
          order.push('Y2-start');
          await awaited(delay(20));
          order.push('Y2-after-20');
          expect(ctx2.getStore()).toBe('Y2');
        });

        order.push('Y-after-Y2');
        expect(ctx2.getStore()).toBe('Y');
      });

      await Promise.all([p1, p2]);

      expect(ctx1.getStore()).toBeUndefined();
      expect(ctx2.getStore()).toBeUndefined();

      // Verify execution order based on timer delays.
      // 0ms: X-start, Y-start
      // 5ms: Y-after-5, Y2-start
      // 10ms: X-after-10, X2-start
      // 20ms: X2-after-10
      // 25ms: Y2-after-20
      expect(order).toEqual([
        'X-start',
        'Y-start',
        'Y-after-5',
        'Y2-start',
        'X-after-10',
        'X2-start',
        'X2-after-10',
        'X-after-X2',
        'Y2-after-20',
        'Y-after-Y2',
      ]);
    });
  });

  describe('Error In Nested Run', () => {
    it('should restore outer context when nested async run rejects', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('outer', async () => {
        await awaited(delay(1));

        // Use try/catch so the await goes through the Future's .then wrapping.
        // await expect().rejects adds a raw promise layer that bypasses context restoration.
        let caught: Error | undefined;
        try {
          await ctx.run('inner', async () => {
            await awaited(delay(1));
            throw new Error('inner error');
          });
        } catch (e) {
          caught = e as Error;
        }

        expect(caught?.message).toBe('inner error');

        // Outer context must survive inner rejection.
        expect(ctx.getStore()).toBe('outer');

        await awaited(delay(1));
        expect(ctx.getStore()).toBe('outer');
      });

      expect(ctx.getStore()).toBeUndefined();
    });

    it('should restore context when nested awaited rejects inside nested run', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('outer', async () => {
        let caught: Error | undefined;
        try {
          await ctx.run('inner', async () => {
            await awaited(Promise.reject(new Error('boom')));
          });
        } catch (e) {
          caught = e as Error;
        }

        expect(caught?.message).toBe('boom');

        expect(ctx.getStore()).toBe('outer');
        await awaited(delay(1));
        expect(ctx.getStore()).toBe('outer');
      });

      expect(ctx.getStore()).toBeUndefined();
    });
  });

  describe('Sequential Runs Reuse', () => {
    it('should correctly handle multiple sequential runs on the same scope', async () => {
      const ctx = new AsyncScope<string>();

      // First run.
      await ctx.run('first', async () => {
        await awaited(delay(1));
        expect(ctx.getStore()).toBe('first');
      });

      expect(ctx.getStore()).toBeUndefined();

      // Second run — same scope, different store.
      await ctx.run('second', async () => {
        await awaited(delay(1));
        expect(ctx.getStore()).toBe('second');
      });

      expect(ctx.getStore()).toBeUndefined();

      // Third run with nesting.
      await ctx.run('third', async () => {
        await ctx.run('third-inner', async () => {
          await awaited(delay(1));
          expect(ctx.getStore()).toBe('third-inner');
        });

        expect(ctx.getStore()).toBe('third');
        await awaited(delay(1));
        expect(ctx.getStore()).toBe('third');
      });

      expect(ctx.getStore()).toBeUndefined();
    });
  });

  describe('Awaited Outside Scope', () => {
    it('should not throw when awaited is called outside any run', async () => {
      const result = await awaited(Promise.resolve(42));
      expect(result).toBe(42);
    });

    it('should not corrupt state for subsequent runs after orphan awaited', async () => {
      const ctx = new AsyncScope<string>();

      // Orphan awaited — no active scope.
      await awaited(delay(1));

      // Subsequent run must still work correctly.
      await ctx.run('after-orphan', async () => {
        expect(ctx.getStore()).toBe('after-orphan');

        await awaited(delay(1));
        expect(ctx.getStore()).toBe('after-orphan');
      });

      expect(ctx.getStore()).toBeUndefined();
    });

    it('should not corrupt state when awaited is used between two runs', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('first', async () => {
        await awaited(delay(1));
        expect(ctx.getStore()).toBe('first');
      });

      expect(ctx.getStore()).toBeUndefined();

      // Orphan awaited between runs.
      await awaited(delay(1));

      await ctx.run('second', async () => {
        await awaited(delay(1));
        expect(ctx.getStore()).toBe('second');
      });

      expect(ctx.getStore()).toBeUndefined();
    });
  });

  describe('Awaited Function Overload', () => {
    it('should accept a function that returns a promise', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('store', async () => {
        const result = await awaited(() => Promise.resolve(42));
        expect(result).toBe(42);
        expect(ctx.getStore()).toBe('store');
      });
    });

    it('should preserve context across awaited with function', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('store', async () => {
        await awaited(() => delay(5));
        expect(ctx.getStore()).toBe('store');

        await awaited(() => delay(5));
        expect(ctx.getStore()).toBe('store');
      });

      expect(ctx.getStore()).toBeUndefined();
    });

    it('should handle function and promise overloads interchangeably', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('store', async () => {
        // Promise overload.
        await awaited(delay(1));
        expect(ctx.getStore()).toBe('store');

        // Function overload.
        await awaited(() => delay(1));
        expect(ctx.getStore()).toBe('store');

        // Promise overload.
        const val = await awaited(Promise.resolve('hello'));
        expect(val).toBe('hello');

        // Function overload.
        const val2 = await awaited(() => Promise.resolve('world'));
        expect(val2).toBe('world');

        expect(ctx.getStore()).toBe('store');
      });

      expect(ctx.getStore()).toBeUndefined();
    });

    it('should handle function that throws synchronously', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('store', async () => {
        let caught: Error | undefined;
        try {
          await awaited(() => {
            throw new Error('sync throw');
          });
        } catch (e) {
          caught = e as Error;
        }

        expect(caught?.message).toBe('sync throw');
        expect(ctx.getStore()).toBe('store');
      });

      expect(ctx.getStore()).toBeUndefined();
    });

    it('should handle function that returns a sync value', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('store', async () => {
        const result = await awaited(() => 42);
        expect(result).toBe(42);
        expect(ctx.getStore()).toBe('store');
      });
    });

    it('should handle function that returns sync value with context preserved', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('store', async () => {
        await awaited(() => delay(5));
        expect(ctx.getStore()).toBe('store');

        // Sync return between async awaits.
        const val = await awaited(() => 'sync-value');
        expect(val).toBe('sync-value');
        expect(ctx.getStore()).toBe('store');

        await awaited(() => delay(5));
        expect(ctx.getStore()).toBe('store');
      });

      expect(ctx.getStore()).toBeUndefined();
    });
  });
});
