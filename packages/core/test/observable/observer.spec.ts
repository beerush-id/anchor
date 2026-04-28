import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, createObserver, effect, getTracker, mutable, setTracker, untrack } from '../../src/index.js';

describe('Anchor Core - Observable Observer Management', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('Observer Management', () => {
    it('should properly set global tracker', () => {
      const tracker = vi.fn();
      const state = anchor({ count: 1 });
      expect(getTracker()).toBeUndefined();

      const untrack = setTracker(tracker);
      const untrack2 = setTracker(tracker); // Make sure to handle duplicate tracker.

      expect(getTracker()).toBe(tracker);
      expect(tracker).not.toHaveBeenCalled();
      expect(untrack2).toBe(untrack);

      const count = state.count;
      expect(count).toBe(1);
      expect(tracker).toHaveBeenCalledTimes(1);

      untrack?.(); // Unset the tracker. Any state read after this point will not be tracked.

      expect(getTracker()).toBeUndefined();
      expect(tracker).toHaveBeenCalledTimes(1);

      expect(state.count).toBe(1);
      expect(tracker).toHaveBeenCalledTimes(1);
    });

    it('should handle outside of observer function', () => {
      const handler = vi.fn().mockImplementation(() => 'Success');
      const result = untrack<string>(handler);

      expect(result).toBe('Success');
    });

    it('should handle outside of observer function that throws', () => {
      const handler = vi.fn().mockImplementation(() => {
        throw new Error('Execution error');
      });
      const result = untrack(handler);

      expect(result).toBeUndefined();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle outside of observer function with invalid function', () => {
      const result = untrack(null as never);

      expect(result).toBeUndefined();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle tracking on a destroyed observer', async () => {
      const state = mutable(1);
      const observer = createObserver(() => {});

      observer.destroy();

      expect(() => (observer as any).track(state, 'value')).not.toThrow();
      expect(() => observer.destroy()).not.toThrow();
    });
  });

  describe('Unsafe Observation Detection', () => {
    it('should detect and warn about unsafe observation when threshold is exceeded', async () => {
      vi.useFakeTimers();

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const observer = createObserver(() => {});
      const originalConfig = anchor.configs();

      anchor.configure({ safeObservationThreshold: 5 });

      const states = Array.from({ length: 6 }, (_, i) => anchor({ value: i }, { observable: true }));

      observer.run(() => {
        states.forEach((state, i) => {
          const value = state.value;
          expect(value).toBe(i);
        });
      });

      vi.runAllTimers();

      // Check that error was called with the expected unsafe observation warning
      expect(errorSpy).toHaveBeenCalled();

      const errorMessage = errorSpy.mock.calls[0][0];

      expect(errorMessage).toContain('Attempted to observe too many (6) states');

      // Restore original configuration
      anchor.configure(originalConfig);
      states.forEach((state) => anchor.destroy(state));

      await Promise.resolve();

      errorSpy.mockRestore();
      vi.useRealTimers();
    });
  });

  describe('Effect', () => {
    it('should handle change in effect', async () => {
      const state = mutable(0);
      const clear = vi.fn();
      const react = vi.fn().mockImplementation(() => {
        expect(state.value).toBeGreaterThan(-1);

        // Make sure both cases are handled.
        return state.value === 2 ? undefined : clear;
      });

      const cleanup = effect(react);
      await Promise.resolve();

      expect(react).toHaveBeenCalledTimes(1);
      expect(clear).not.toHaveBeenCalled();

      state.value = 1;
      await Promise.resolve();

      expect(react).toHaveBeenCalledTimes(2);
      expect(clear).toHaveBeenCalledTimes(1);

      state.value = 2;
      await Promise.resolve();

      expect(react).toHaveBeenCalledTimes(3); // This call should return undefined.
      expect(clear).toHaveBeenCalledTimes(2);

      state.value = 3;
      await Promise.resolve();

      expect(react).toHaveBeenCalledTimes(4);
      expect(clear).toHaveBeenCalledTimes(2); // Should not be called again because the cleanup no longer defined.

      cleanup();
      state.value = 4;
      await Promise.resolve();

      expect(react).toHaveBeenCalledTimes(4);
      expect(clear).toHaveBeenCalledTimes(3); // Should be called again because last react return function again.
    });

    it('should handle error in effect runner', async () => {
      const handler = vi.fn().mockImplementation(() => {
        throw new Error('Execution error');
      });

      effect(() => handler());

      await Promise.resolve();

      expect(errorSpy).toHaveBeenCalled();
    });

    it('should run effect on browser only', () => {
      vi.unstubAllGlobals();

      const handler = vi.fn();
      const cleanup1 = effect.client(handler);

      expect(typeof cleanup1).toBe('function');
      expect(handler).not.toHaveBeenCalled();

      vi.stubGlobal('window', {});
      const cleanup2 = effect.client(handler);

      expect(typeof cleanup2).toBe('function');
      expect(handler).toHaveBeenCalled();

      vi.unstubAllGlobals();
    });
  });
});
