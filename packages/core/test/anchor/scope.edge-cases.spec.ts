import { describe, expect, it } from 'vitest';
import { ASYNC_CALL_QUEUES, AsyncScope, awaited } from '../../src/index.js';

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

describe('Anchor - AsyncScope Floating Promise Edge Cases', () => {
  describe('Floating Awaited (Fire-and-Forget)', () => {
    it('should not pollute context after floating awaited with promise', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('store', async () => {
        expect(ctx.getStore()).toBe('store');

        // Fire-and-forget — not awaited.
        awaited(delay(5));

        await awaited(delay(1));
        expect(ctx.getStore()).toBe('store');
      });

      // Wait for the floating promise to settle.
      await delay(10);

      // Store MUST be clean — no pollution from the floating promise.
      expect(ctx.getStore()).toBeUndefined();
    });

    it('should not pollute context after floating awaited with function', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('store', async () => {
        expect(ctx.getStore()).toBe('store');

        // Fire-and-forget — function overload.
        awaited(() => delay(5));

        await awaited(delay(1));
        expect(ctx.getStore()).toBe('store');
      });

      await delay(10);
      expect(ctx.getStore()).toBeUndefined();
    });

    it('should not pollute context after floating async function with inner awaits', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('store', async () => {
        expect(ctx.getStore()).toBe('store');

        // Floating async function with awaited inside — the scenario from the design discussion.
        awaited(async () => {
          expect(ctx.getStore()).toBe('store'); // sync portion, still in run
          await awaited(delay(5));
          // Context should be available inside the floating chain.
          expect(ctx.getStore()).toBe('store');
        });

        await awaited(delay(1));
        expect(ctx.getStore()).toBe('store');
      });

      // Wait for the floating chain to fully complete.
      await delay(10);

      // Store MUST be clean.
      expect(ctx.getStore()).toBeUndefined();
    });

    it('should not pollute context after floating async function with multiple inner awaits', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('store', async () => {
        awaited(async () => {
          await awaited(delay(1));
          expect(ctx.getStore()).toBe('store');

          await awaited(delay(1));
          expect(ctx.getStore()).toBe('store');

          await awaited(delay(1));
          expect(ctx.getStore()).toBe('store');
        });

        await awaited(delay(1));
        expect(ctx.getStore()).toBe('store');
      });

      await delay(10);
      expect(ctx.getStore()).toBeUndefined();
    });
  });

  describe('Floating Promise Queue Cleanup', () => {
    it('should clear ASYNC_CALL_QUEUES after floating promise settles', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('store', async () => {
        awaited(async () => {
          await awaited(delay(5));
        });

        await awaited(delay(1));
      });

      // Before floating chain settles, queue may still have entries.
      await delay(10);

      // After everything settles, queue MUST be empty.
      expect(ASYNC_CALL_QUEUES.size).toBe(0);
    });

    it('should clear ASYNC_CALL_QUEUES after multiple floating promises settle', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('store', async () => {
        // Multiple floating promises.
        awaited(async () => {
          await awaited(delay(3));
        });

        awaited(async () => {
          await awaited(delay(5));
        });

        await awaited(delay(1));
      });

      await delay(10);
      expect(ASYNC_CALL_QUEUES.size).toBe(0);
      expect(ctx.getStore()).toBeUndefined();
    });
  });

  describe('Floating Promise With Nested Runs', () => {
    it('should not pollute context when floating promise contains nested run', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('outer', async () => {
        await ctx.run('floating-inner', async () => {
          awaited(async () => {
            await awaited(delay(5));
            expect(ctx.getStore()).toBe('floating-inner');
          });
        });

        await awaited(delay(1));
        expect(ctx.getStore()).toBe('outer');
      });

      await delay(10);
      expect(ctx.getStore()).toBeUndefined();
    });

    it('should not pollute when awaited run coexists with floating awaited', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('outer', async () => {
        // Floating.
        awaited(async () => {
          await awaited(delay(5));
        });

        // Properly awaited nested run.
        await ctx.run('inner', async () => {
          await awaited(delay(1));
          expect(ctx.getStore()).toBe('inner');
        });

        expect(ctx.getStore()).toBe('outer');
        await awaited(delay(1));
        expect(ctx.getStore()).toBe('outer');
      });

      await delay(10);
      expect(ctx.getStore()).toBeUndefined();
    });
  });

  describe('Floating Promise Cross-Scope', () => {
    it('should not pollute when floating promise uses different scope', async () => {
      const ctx1 = new AsyncScope<string>();
      const ctx2 = new AsyncScope<string>();

      await ctx1.run('ctx1-store', async () => {
        await ctx2.run('ctx2-floating', async () => {
          // Floating on ctx2.
          awaited(async () => {
            await awaited(delay(5));
          });
          expect(ctx2.getStore()).toBe('ctx2-floating');
        });

        await awaited(delay(1));
        expect(ctx1.getStore()).toBe('ctx1-store');
      });

      await delay(10);
      expect(ctx1.getStore()).toBeUndefined();
      expect(ctx2.getStore()).toBeUndefined();
    });
  });

  describe('Sequential Runs After Floating', () => {
    it('should correctly run after floating promise has settled', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('first', async () => {
        awaited(async () => {
          await awaited(delay(5));
        });

        await awaited(delay(1));
      });

      // Wait for floating promise to settle.
      await delay(10);

      // Subsequent run must work correctly.
      await ctx.run('second', async () => {
        await awaited(delay(1));
        expect(ctx.getStore()).toBe('second');
      });

      expect(ctx.getStore()).toBeUndefined();
    });

    it('should correctly run while floating promise is still pending', async () => {
      const ctx = new AsyncScope<string>();

      await ctx.run('first', async () => {
        awaited(async () => {
          await awaited(delay(20)); // long floating chain
        });

        await awaited(delay(1));
      });

      // Start a new run while the floating promise is still pending.
      await ctx.run('second', async () => {
        await awaited(delay(1));
        expect(ctx.getStore()).toBe('second');
      });

      expect(ctx.getStore()).toBeUndefined();

      // Wait for everything to settle.
      await delay(25);
      expect(ctx.getStore()).toBeUndefined();
      expect(ASYNC_CALL_QUEUES.size).toBe(0);
    });
  });
});
