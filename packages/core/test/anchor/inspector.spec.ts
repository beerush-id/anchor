import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, inspect, setCleanUpHandler } from '../../src/index.js';

const cleanupList = new Set<() => void>();

describe('Anchor Core - Inspector', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleTraceSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    setCleanUpHandler((fn) => {
      if (typeof fn === 'function') {
        cleanupList.add(fn);
      }
    });
  });

  afterAll(async () => {
    await Promise.all(Array.from(cleanupList).map((fn) => fn()));
  });

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleTraceSpy = vi.spyOn(console, 'trace').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleTraceSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Basic Inspection', () => {
    beforeEach(() => {
      // Enable development mode for these tests
      anchor.configure({ production: false });
    });

    afterEach(() => {
      // Reset to default
      anchor.configure({ production: true });
    });

    it('should subscribe to state changes and log them', () => {
      const state = anchor({ count: 0 });
      const unsubscribe = inspect(state);

      // Should log init event
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenNthCalledWith(1, '[init]: ', state, {
        type: 'init',
        keys: [],
      });

      // Update state
      state.count = 1;

      // Should log the change
      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy).toHaveBeenNthCalledWith(2, '[set]: ', state, {
        type: 'set',
        keys: ['count'],
        prev: 0,
        value: 1,
        error: undefined,
      });

      unsubscribe();
    });

    it('should handle trace mode with stack trace', () => {
      const state = anchor({ count: 0 });
      const unsubscribe = inspect.trace(state);

      // Should trace init event
      expect(consoleTraceSpy).toHaveBeenCalledTimes(1);
      expect(consoleTraceSpy).toHaveBeenNthCalledWith(1, '[init]: ', state, {
        type: 'init',
        keys: [],
      });

      // Update state
      state.count = 1;

      // Should trace the change
      expect(consoleTraceSpy).toHaveBeenCalledTimes(2);
      expect(consoleTraceSpy).toHaveBeenNthCalledWith(2, '[set]: ', state, {
        type: 'set',
        keys: ['count'],
        prev: 0,
        value: 1,
        error: undefined,
      });

      unsubscribe();
    });

    it('should handle array mutations', () => {
      const state = anchor([1, 2]);
      const unsubscribe = inspect(state);

      state.push(3);

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy).toHaveBeenNthCalledWith(2, '[push]: ', state, {
        type: 'push',
        keys: [],
        prev: [1, 2],
        value: [3],
        added: [3],
        removed: [],
      });

      unsubscribe();
    });

    it('should handle Map mutations', () => {
      const state = anchor(new Map([['a', 1]]));
      const unsubscribe = inspect(state);

      state.set('b', 2);

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy).toHaveBeenNthCalledWith(
        2,
        '[map:set]: ',
        expect.any(Map),
        expect.objectContaining({
          type: 'map:set',
          keys: ['b'],
          prev: undefined,
          value: 2,
        })
      );

      unsubscribe();
    });

    it('should handle Set mutations', () => {
      const state = anchor(new Set([1, 2]));
      const unsubscribe = inspect(state);

      state.add(3);

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy).toHaveBeenNthCalledWith(
        2,
        '[set:add]: ',
        expect.any(Set),
        expect.objectContaining({
          type: 'set:add',
          keys: [],
          prev: undefined,
          value: 3,
        })
      );

      unsubscribe();
    });

    it('should handle nested object changes', () => {
      const state = anchor({
        user: {
          name: 'John',
          profile: { age: 30 },
        },
      });
      const unsubscribe = inspect(state);

      state.user.name = 'Jane';

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy).toHaveBeenNthCalledWith(2, '[set]: ', state, {
        type: 'set',
        keys: ['user', 'name'],
        prev: 'John',
        value: 'Jane',
      });

      unsubscribe();
    });

    it('should handle property deletion', () => {
      const state = anchor({ a: 1, b: 2 });
      const unsubscribe = inspect(state);

      delete (state as { a?: number }).a;

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy).toHaveBeenNthCalledWith(2, '[delete]: ', state, {
        type: 'delete',
        keys: ['a'],
        prev: 1,
      });

      unsubscribe();
    });
  });

  describe('Production Mode', () => {
    beforeEach(() => {
      // Enable production mode
      anchor.configure({ production: true });
    });

    afterEach(() => {
      // Reset to default
      anchor.configure({ production: false });
    });

    it('should not log in production mode', () => {
      const state = anchor({ count: 0 });
      const unsubscribe = inspect(state);

      // Should return no-op function
      expect(typeof unsubscribe).toBe('function');

      // Update state
      state.count = 1;

      // Should not log anything
      expect(consoleLogSpy).not.toHaveBeenCalled();

      unsubscribe();
    });

    it('should not trace in production mode', () => {
      const state = anchor({ count: 0 });
      const unsubscribe = inspect.trace(state);

      // Should return no-op function
      expect(typeof unsubscribe).toBe('function');

      // Update state
      state.count = 1;

      // Should not trace anything
      expect(consoleTraceSpy).not.toHaveBeenCalled();

      unsubscribe();
    });
  });

  describe('Invalid State Handling', () => {
    it('should handle invalid state gracefully', () => {
      const invalidState = { not: 'reactive' };
      const unsubscribe = inspect(invalidState as never);

      // Should log error and return no-op
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(invalidState);
      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
    });

    it('should handle null and undefined states', () => {
      const unsubscribe1 = inspect(null as never);
      const unsubscribe2 = inspect(undefined as never);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(typeof unsubscribe1).toBe('function');
      expect(typeof unsubscribe2).toBe('function');

      unsubscribe1();
      unsubscribe2();
    });

    it('should handle primitive values', () => {
      const unsubscribe1 = inspect(42 as never);
      const unsubscribe2 = inspect('string' as never);
      const unsubscribe3 = inspect(true as never);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(3);
      expect(typeof unsubscribe1).toBe('function');
      expect(typeof unsubscribe2).toBe('function');
      expect(typeof unsubscribe3).toBe('function');

      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
    });
  });

  describe('Cleanup', () => {
    it('should properly unsubscribe and stop logging', () => {
      const state = anchor({ count: 0 });
      const unsubscribe = inspect(state);

      // Update and verify logging
      state.count = 1;
      expect(consoleLogSpy).toHaveBeenCalledTimes(2); // init + set

      // Unsubscribe
      unsubscribe();

      // Clear spy
      consoleLogSpy.mockClear();

      // Update again - should not log
      state.count = 2;
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should handle multiple unsubscribes gracefully', () => {
      const state = anchor({ count: 0 });
      const unsubscribe = inspect(state);

      // Multiple unsubscribes should not throw
      expect(() => {
        unsubscribe();
        unsubscribe();
        unsubscribe();
      }).not.toThrow();
    });

    it('should clean up on component destruction', () => {
      const state = anchor({ count: 0 });
      let unsubscribe: (() => void) | undefined;

      // Simulate component lifecycle
      const cleanup = () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };

      unsubscribe = inspect(state);

      // Update and verify logging
      state.count = 1;
      expect(consoleLogSpy).toHaveBeenCalledTimes(2); // init + set

      // Simulate cleanup
      cleanup();

      // Clear spy
      consoleLogSpy.mockClear();

      // Update again - should not log
      state.count = 2;
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid successive updates', () => {
      const state = anchor({ count: 0 });
      const unsubscribe = inspect(state);

      // Rapid updates
      for (let i = 1; i <= 10; i++) {
        state.count = i;
      }

      // Should log each change (init + 10 updates)
      expect(consoleLogSpy).toHaveBeenCalledTimes(11);

      unsubscribe();
    });

    it('should handle circular references', () => {
      const obj: Record<string, unknown> = { name: 'test' };
      obj.self = obj;
      const state = anchor(obj);
      const unsubscribe = inspect(state);

      state.name = 'updated';

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy).toHaveBeenNthCalledWith(2, '[set]: ', state, {
        type: 'set',
        keys: ['name'],
        prev: 'test',
        value: 'updated',
        error: undefined,
      });

      unsubscribe();
    });

    it('should handle empty objects and arrays', () => {
      const objState = anchor({});
      const arrState = anchor([]);
      const mapState = anchor(new Map());
      const setState = anchor(new Set());

      const unsubscribe1 = inspect(objState);
      const unsubscribe2 = inspect(arrState);
      const unsubscribe3 = inspect(mapState);
      const unsubscribe4 = inspect(setState);

      // Should not throw and should return functions
      expect(typeof unsubscribe1).toBe('function');
      expect(typeof unsubscribe2).toBe('function');
      expect(typeof unsubscribe3).toBe('function');
      expect(typeof unsubscribe4).toBe('function');

      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
      unsubscribe4();
    });

    it('should handle state destruction', () => {
      const state = anchor({ count: 0 });
      const unsubscribe = inspect(state);

      // Destroy state
      anchor.destroy(state);

      // Update should not cause issues (though state is destroyed)
      expect(() => {
        (state as { count: number }).count = 1;
      }).not.toThrow();

      // Unsubscribe should still work
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('Type Safety', () => {
    it('should accept valid state types', () => {
      const objState = anchor({ a: 1 });
      const arrState = anchor([1, 2]);
      const mapState = anchor(new Map());
      const setState = anchor(new Set());

      // These should compile and run without issues
      const unsubscribe1 = inspect(objState);
      const unsubscribe2 = inspect(arrState);
      const unsubscribe3 = inspect(mapState);
      const unsubscribe4 = inspect(setState);

      expect(typeof unsubscribe1).toBe('function');
      expect(typeof unsubscribe2).toBe('function');
      expect(typeof unsubscribe3).toBe('function');
      expect(typeof unsubscribe4).toBe('function');

      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
      unsubscribe4();
    });
  });
});
