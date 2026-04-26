import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AsyncContext,
  AsyncStore,
  awaited,
  getAllAsyncContext,
  getAsyncContext,
  getAsyncStore,
  inContext,
  isolatedContext,
  resetGlobalStore,
  setAsyncContext,
} from '../../src/context.js'; // No warning [check]

// No warning [check]
describe('AsyncStore', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetGlobalStore();
    warnSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('should get the active store', () => {
    expect(getAsyncStore()).toBeInstanceOf(Map);
  });

  it('should store and retrieve values', () => {
    const store = new AsyncStore();
    store.set('key', 'value');
    expect(store.get('key')).toBe('value');
  });

  it('should fall back to parent store if key is missing', () => {
    const parent = new AsyncStore([['parentKey', 'parentVal']]);
    const child = new AsyncStore([], parent);

    child.set('childKey', 'childVal');

    expect(child.get('childKey')).toBe('childVal');
    expect(child.get('parentKey')).toBe('parentVal');
  });

  it('should shadow parent keys if overridden in child', () => {
    const parent = new AsyncStore([['key', 'parentVal']]);
    const child = new AsyncStore([['key', 'childVal']], parent);

    expect(child.get('key')).toBe('childVal');
  });
});

// No warning [check]
describe('AsyncContext (Sync Operations)', () => {
  beforeEach(() => {
    resetGlobalStore();
  });

  it('should inject context synchronously during run', () => {
    const ctx = new AsyncContext('default');

    const result = ctx.run('injected', () => {
      expect(ctx.getStore()).toBe('injected');
      return 'success';
    });

    expect(result).toBe('success');
    expect(ctx.getStore()).toBe('default');
  });

  it('should restore context even if sync function throws', () => {
    const ctx = new AsyncContext('default');

    expect(() => {
      ctx.run('injected', () => {
        expect(ctx.getStore()).toBe('injected');
        throw new Error('Sync Error');
      });
    }).toThrow('Sync Error');

    expect(ctx.getStore()).toBe('default');
  });
});

// No warning [check]
describe('AsyncContext & Awaited (Async Propagation Constraints)', () => {
  beforeEach(() => {
    resetGlobalStore();
  });

  it('MUST lose context on detached (native) await', async () => {
    const ctx = new AsyncContext('default');

    const promise = ctx.run('injected', async () => {
      expect(ctx.getStore()).toBe('injected'); // Sync phase holds context

      await Promise.resolve(); // V8 yields here. ctx.run's finally block executes.

      // Resuming the microtask... Context is now what it was outside ctx.run!
      expect(ctx.getStore()).toBe('default');
      return 'done';
    });

    const result = await promise;
    expect(result).toBe('done');
  });

  it('MUST maintain context when the async yield is explicitly wrapped with awaited()', async () => {
    const ctx = new AsyncContext('default');

    const promise = ctx.run('injected', async () => {
      expect(ctx.getStore()).toBe('injected');

      await ctx.awaited(() => Promise.resolve());

      expect(ctx.getStore()).toBe('injected');
      return 'done';
    });

    const result = await promise;
    expect(result).toBe('done');

    expect(ctx.getStore()).toBe('default');
  });

  it('MUST lose context when chaining on native Promise, but maintain it when explicitly wrapped with awaited', async () => {
    const ctx = new AsyncContext('default');

    // 1. Native Promise Chain Loses Context
    await ctx.run('injected', async () => {
      const nativePromise = Promise.resolve('val');

      // Chaining directly on the native promise means handlers execute detached
      await nativePromise;
      expect(ctx.getStore()).toBe('default'); // Context is lost!
    });

    // 2. Explicit Awaited Wrapper Maintains Context
    await ctx.run('injected', async () => {
      // Wrap the async operation to get an Awaited instance
      const wrappedPromise = ctx.awaited(() => Promise.reject(new Error('fail')));

      // Chaining on the Awaited instance ensures handlers execute with context
      return wrappedPromise
        .catch((err) => {
          expect(ctx.getStore()).toBe('injected'); // Context is maintained!
          expect(err.message).toBe('fail');
          return 'caught';
        })
        .then((val) => {
          expect(ctx.getStore()).toBe('injected'); // Context is maintained!
          expect(val).toBe('caught');
        });
    });
  });
});

// No warning [check]
describe('Global Context & Store Management', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetGlobalStore();
    warnSpy = vi.spyOn(console, 'error');
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('inContext provides a synchronous context scope', () => {
    inContext(() => {
      setAsyncContext('key', 'val');
      expect(getAsyncContext('key')).toBe('val');
    });

    expect(getAsyncContext('key')).toBeUndefined();
  });

  it('inContext inherits from parent scope', () => {
    inContext(() => {
      setAsyncContext('parentKey', 'parentVal');

      inContext(() => {
        setAsyncContext('childKey', 'childVal');
        expect(getAsyncContext('parentKey')).toBe('parentVal');
        expect(getAsyncContext('childKey')).toBe('childVal');
      });

      expect(getAsyncContext('childKey')).toBeUndefined();
    });
  });

  it('getAllAsyncContext aggregates the active store hierarchy', () => {
    inContext(() => {
      setAsyncContext('l1', 'v1');

      inContext(() => {
        setAsyncContext('l2', 'v2');
        const stores = getAllAsyncContext();
        expect(stores.length).toBeGreaterThanOrEqual(2);
        expect(stores[0].get('l2')).toBe('v2');
        expect(stores[1].get('l1')).toBe('v1');
      });
    });
  });

  it('global awaited behaves like Context.awaited: native await detaches to parent, explicit awaited maintains', async () => {
    setAsyncContext('globalAwaitedKey', 'globalVal');

    await inContext(async () => {
      setAsyncContext('localAwaitedKey', 'localVal');

      await awaited(() => Promise.resolve());

      expect(getAsyncContext('localAwaitedKey')).toBe('localVal');
      expect(getAsyncContext('globalAwaitedKey')).toBe('globalVal');
    });

    expect(getAsyncContext('localAwaitedKey')).toBeUndefined();
  });
});

// No warning [check]
describe('Security: isolatedContext Boundaries', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetGlobalStore();
    warnSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('should restore global store in a strict isolation', async () => {
    await isolatedContext(async () => {
      setAsyncContext('isolated', 'val');
      expect(getAsyncContext('isolated')).toBe('val');

      await awaited(() => Promise.resolve());

      expect(getAsyncContext('isolated')).toBe('val');
    });

    expect(getAsyncContext('isolated')).toBeUndefined();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('isolatedContext operates normally when properly awaited', async () => {
    await inContext(async () => {
      setAsyncContext('base', 'val');

      await isolatedContext(async () => {
        expect(getAsyncContext('base')).toBe('val');
        setAsyncContext('isolated', 'val2');

        await awaited(() => Promise.resolve());
        expect(getAsyncContext('isolated')).toBe('val2');
      }, false);

      expect(getAsyncContext('isolated')).toBeUndefined();
    });
  });

  it('isolatedContext warns if a floating Awaited promise accesses the boundary after destruction', async () => {
    vi.useFakeTimers();
    let floatingPromise: Promise<unknown>;

    await isolatedContext(async () => {
      floatingPromise = awaited(() => new Promise((resolve) => setTimeout(resolve, 10))).then(() => {
        getAsyncContext('foo');
      });
    }, false);

    vi.runAllTimers();
    await floatingPromise!;

    // The Awaited.fork wrapper should have detected the detached access and fired the warning.
    expect(warnSpy).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('should throw if a floating promises detected in an strict isolated context', async () => {
    vi.useFakeTimers();

    await expect(() => {
      return isolatedContext(async () => {
        awaited(() => new Promise((resolve) => setTimeout(resolve, 10)));
      });
    }).rejects.toThrow();

    vi.runAllTimers();
    vi.useRealTimers();

    expect(warnSpy).toHaveBeenCalled();
  });
});

// No warning [check]
describe('Deep Concurrency & Edge Cases', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetGlobalStore();
    warnSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('should protect against race conditions when multiple async contexts overlap', async () => {
    vi.useFakeTimers();
    // 5 concurrent operations with different execution delays
    const operations = [10, 20, 5, 15, 0].map((delay, index) => {
      const id = index + 1;
      return inContext(async () => {
        setAsyncContext('task_id', id);

        // Sleep to force the event loop to interleave with other operations
        await awaited(() => new Promise((r) => setTimeout(r, delay)));

        // Verify the context hasn't been polluted by the other concurrent tasks
        const currentId = getAsyncContext('task_id');
        expect(currentId).toBe(id);

        return currentId;
      });
    });

    // Advance time incrementally to explicitly force event loop interleaving
    await vi.advanceTimersByTimeAsync(5); // Flushes 0ms and 5ms tasks
    await vi.advanceTimersByTimeAsync(5); // Flushes 10ms tasks
    await vi.advanceTimersByTimeAsync(5); // Flushes 15ms tasks
    await vi.advanceTimersByTimeAsync(5); // Flushes 20ms tasks

    const results = await Promise.all(operations);
    expect(results).toEqual([1, 2, 3, 4, 5]);
    vi.useRealTimers();
  });

  it('should safely restore context even when deep awaited chains reject', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Expected.
    let caughtError: any;

    await inContext(async () => {
      setAsyncContext('safe', true);

      try {
        await awaited(async () => {
          await awaited(() => {
            return Promise.reject(new Error('Deep Boom'));
          });
        });
      } catch (e) {
        caughtError = e;
      }

      // Context must still be safely bound after the try/catch unwinds
      expect(caughtError?.message).toBe('Deep Boom');
      expect(getAsyncContext('safe')).toBe(true);
    });
  });

  it('should handle complex nested hierarchies with interleaved concurrency', async () => {
    vi.useFakeTimers();
    await inContext(async () => {
      setAsyncContext('layer', 'root');

      const p1 = awaited(async () => {
        return inContext(async () => {
          setAsyncContext('layer', 'branch_1');
          await awaited(() => new Promise((r) => setTimeout(r, 10)));
          expect(getAsyncContext('layer')).toBe('branch_1');
        });
      });

      const p2 = awaited(async () => {
        return inContext(async () => {
          setAsyncContext('layer', 'branch_2');
          await awaited(() => new Promise((r) => setTimeout(r, 5)));
          expect(getAsyncContext('layer')).toBe('branch_2');
        });
      });

      expect(getAsyncContext('layer')).toBe('root');

      // Interleave
      await vi.advanceTimersByTimeAsync(5); // p2 finishes
      await vi.advanceTimersByTimeAsync(5); // p1 finishes

      await Promise.all([p1, p2]);

      expect(getAsyncContext('layer')).toBe('root');
    });
    vi.useRealTimers();
  });

  it('should prevent isolatedContexts from leaking into each other during massive concurrent execution', async () => {
    vi.useFakeTimers();
    const promises = Array.from({ length: 10 }).map((_, index) => {
      const id = `iso_${index}`;
      return isolatedContext(async () => {
        setAsyncContext('iso_id', id);
        // Stagger timeouts from 1ms to 10ms
        await awaited(() => new Promise((r) => setTimeout(r, (index % 10) + 1)));
        expect(getAsyncContext('iso_id')).toBe(id);
        return id;
      }, false);
    });

    // Explicitly step through the microtask queue 1ms at a time
    for (let i = 0; i < 10; i++) {
      await vi.advanceTimersByTimeAsync(1);
    }

    const results = await Promise.all(promises);
    expect(results).toEqual(Array.from({ length: 10 }).map((_, i) => `iso_${i}`));
    vi.useRealTimers();
  });

  it('should gracefully handle returning a native Promise directly from an awaited function block', async () => {
    await inContext(async () => {
      setAsyncContext('boundary', 'active');

      // If we just return a native promise from awaited, it should still wrap the resolution
      const result = await awaited(() => new Promise((r) => setTimeout(() => r('ok'), 5)));

      expect(result).toBe('ok');
      expect(getAsyncContext('boundary')).toBe('active');
    });
  });
});

describe('Complex Execution Boundaries & Memory Traps', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetGlobalStore();
    warnSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('survives complex mixed chaining (sync/async/catch permutations) on Awaited instances', async () => {
    const ctx = new AsyncContext('root');

    await ctx.run('injected', async () => {
      // Create a heavily mixed chain of sync returns, async returns, and error catches
      const complexChain = ctx
        .awaited(() => Promise.resolve('start'))
        .then((val) => {
          expect(ctx.getStore()).toBe('injected');
          return val + '-sync'; // returns synchronously, automatically re-wrapped by Awaited
        })
        .then(async (val) => {
          expect(ctx.getStore()).toBe('injected');
          await Promise.resolve(); // internal native yield
          return val + '-async'; // returns asynchronously
        })
        .then(() => {
          throw new Error('chain-break');
        })
        .catch((err) => {
          expect(ctx.getStore()).toBe('injected');
          return err.message;
        })
        .then((val) => {
          expect(ctx.getStore()).toBe('injected');
          return val + '-recovered';
        });

      const result = await complexChain;
      expect(result).toBe('chain-break-recovered');
      expect(ctx.getStore()).toBe('injected'); // Still intact
    });
  });

  it('triggers detached warning for losing promises in Promise.race inside isolated context', async () => {
    vi.useFakeTimers();

    let winner: Promise<unknown>;
    let loser: Promise<void>;

    const promise = isolatedContext(async () => {
      // We launch a Promise.race inside an isolated context.
      // The winner resolves, allowing isolatedContext to finish and safely destroy the store.
      winner = awaited(() => new Promise((r) => setTimeout(r, 5))).finally();

      // The loser resolves LATER. Its Awaited.fork continuation will try to execute
      // AFTER the isolated context has already been destroyed!
      loser = awaited(() => new Promise((r) => setTimeout(r, 20))).then(() => {
        getAsyncContext('foo');
      });

      await Promise.race([winner, loser]);
    }, false);

    // Advance timers so the winner resolves, allowing the race and isolatedContext to finish!
    await vi.advanceTimersByTimeAsync(5);
    await winner!;

    // Advance timers so the loser finally resolves and triggers its detached continuation.
    await vi.advanceTimersByTimeAsync(15);
    await loser!;

    await promise;

    // The system MUST catch the trailing memory access and fire the security warning.
    expect(warnSpy).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('requires explicit context binding for non-promise event-driven callbacks (simulated Event Emitter)', async () => {
    // If a system uses callbacks (like DOM events or Node Emitters), the context is naturally lost
    // because the event loop executes the callback detached from any Promise chain.
    let capturedOutside = false;
    let capturedInside = false;

    const emitter = {
      listeners: [] as (() => void)[],
      on(fn: () => void) {
        this.listeners.push(fn);
      },
      emit() {
        this.listeners.forEach((fn) => fn());
      },
    };

    await inContext(() => {
      setAsyncContext('event_key', 'bound');

      // 1. Raw callback -> Loses context when emitted later
      emitter.on(() => {
        if (getAsyncContext('event_key') === undefined) capturedOutside = true;
      });

      // 2. Bound callback -> Captures current context store and forces it into the callback closure
      const currentStore = getAllAsyncContext()[0]; // Capture active store
      emitter.on(() => {
        inContext(() => {
          if (getAsyncContext('event_key') === 'bound') capturedInside = true;
        }, currentStore);
      });
    });

    // Fire events completely outside the original context block's execution phase
    emitter.emit();

    expect(capturedOutside).toBe(true);
    expect(capturedInside).toBe(true);
  });

  it('maintains strict lateral shadow independence across deeply branched parallel yields', async () => {
    vi.useFakeTimers();

    const treePromise = inContext(async () => {
      setAsyncContext('tree', 'root');

      const leftBranch = awaited(async () => {
        return inContext(async () => {
          setAsyncContext('tree', 'left'); // shadows root
          await awaited(() => new Promise((r) => setTimeout(r, 5))); // Internal yield
          setAsyncContext('left_data', 'L1'); // sets exclusively on left store
          return (getAsyncContext('tree') as string) + getAsyncContext('left_data');
        });
      });

      const rightBranch = awaited(async () => {
        return inContext(async () => {
          setAsyncContext('tree', 'right'); // shadows root
          await awaited(() => new Promise((r) => setTimeout(r, 5))); // Internal yield
          expect(getAsyncContext('left_data')).toBeUndefined(); // strictly isolated from left sibling
          return getAsyncContext('tree');
        });
      });

      const results = await Promise.all([leftBranch, rightBranch]);

      expect(results).toEqual(['leftL1', 'right']);
      expect(getAsyncContext('tree')).toBe('root'); // root remains totally unpolluted
      expect(getAsyncContext('left_data')).toBeUndefined();
    });

    // Advance both branches concurrently
    await vi.advanceTimersByTimeAsync(5);
    await treePromise;

    vi.useRealTimers();
  });

  it('protects against multiple interleaved race conditions with alternating yields', async () => {
    vi.useFakeTimers();

    await inContext(async () => {
      setAsyncContext('outer', 'root');

      // T=0
      const opA = inContext(async () => {
        setAsyncContext('inner', 'A1'); // A -> set context
        await awaited(() => new Promise((r) => setTimeout(r, 10))); // A -> awaited (resumes at T=10)

        // T=10
        expect(getAsyncContext('inner')).toBe('A1'); // A -> resume context, inner must survive
        setAsyncContext('inner', 'A2'); // A -> set context
        await awaited(() => new Promise((r) => setTimeout(r, 10))); // A -> awaited (resumes at T=20)

        // T=20
        expect(getAsyncContext('inner')).toBe('A2'); // A -> resume context
      });

      // T=0
      const opB = inContext(async () => {
        setAsyncContext('inner', 'B1'); // B -> set context
        await awaited(() => new Promise((r) => setTimeout(r, 15))); // B -> awaited (resumes at T=15)

        // T=15
        expect(getAsyncContext('inner')).toBe('B1'); // B -> resume context, inner must survive
        setAsyncContext('inner', 'B2'); // B -> set context
        await awaited(() => new Promise((r) => setTimeout(r, 10))); // B -> awaited (resumes at T=25)

        // T=25
        expect(getAsyncContext('inner')).toBe('B2'); // B -> resume context
      });

      // We now explicitly step time forward to trigger the exact A-B-A-B-A-B alternating resumption trace

      await vi.advanceTimersByTimeAsync(10); // Advances T=0 to T=10 -> A resumes, sets A2, awaits 10ms
      await vi.advanceTimersByTimeAsync(5); // Advances T=10 to T=15 -> B resumes, sets B2, awaits 10ms
      await vi.advanceTimersByTimeAsync(5); // Advances T=15 to T=20 -> A resumes, finishes
      await vi.advanceTimersByTimeAsync(5); // Advances T=20 to T=25 -> B resumes, finishes

      await Promise.all([opA, opB]);

      // Outer context must restored
      expect(getAsyncContext('outer')).toBe('root');
      expect(getAsyncContext('inner')).toBeUndefined();
    });

    vi.useRealTimers();
  });
});
