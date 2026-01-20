import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debouncer } from '../../src/index.js';

describe('Anchor Utilities - Debouncer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Debouncer (debouncer)', () => {
    it('should execute scheduled function after the specified delay', () => {
      const [schedule] = debouncer(100);
      const fn = vi.fn();

      schedule(fn);

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not execute function before the delay', () => {
      const [schedule] = debouncer(100);
      const fn = vi.fn();

      schedule(fn);

      vi.advanceTimersByTime(50);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should reset delay when function is scheduled again', () => {
      const [schedule] = debouncer(100);
      const fn = vi.fn();

      schedule(fn);
      vi.advanceTimersByTime(50);

      // Schedule again, resetting the timer
      schedule(fn);
      vi.advanceTimersByTime(50);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should cancel previous scheduled execution when rescheduled', () => {
      const [schedule] = debouncer(100);
      const fn = vi.fn();

      schedule(fn);
      vi.advanceTimersByTime(50);

      // Schedule again, should cancel previous one
      schedule(fn);
      vi.advanceTimersByTime(50);

      // First schedule should be cancelled, only one execution expected
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should execute only the latest scheduled function when multiple schedules occur', () => {
      const [schedule] = debouncer(100);
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const fn3 = vi.fn();

      schedule(fn1);
      schedule(fn2);
      schedule(fn3);

      vi.advanceTimersByTime(100);

      expect(fn1).not.toHaveBeenCalled();
      expect(fn2).not.toHaveBeenCalled();
      expect(fn3).toHaveBeenCalledTimes(1);
    });

    it('should clean up pending executions with cleanup function', () => {
      const [schedule, cleanup] = debouncer(100);
      const fn = vi.fn();

      schedule(fn);
      cleanup();

      vi.advanceTimersByTime(100);
      expect(fn).not.toHaveBeenCalled();
    });

    it('should handle function execution errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const [schedule] = debouncer(100);
      const errorFn = vi.fn(() => {
        throw new Error('Test error');
      });

      schedule(errorFn);
      vi.advanceTimersByTime(100);

      expect(errorFn).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should use default delay of 10ms when not specified', () => {
      const [schedule] = debouncer(); // No delay specified
      const fn = vi.fn();

      schedule(fn);

      vi.advanceTimersByTime(10); // Default delay

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid successive scheduling like user input', () => {
      const [schedule] = debouncer(50);
      const fn = vi.fn();

      // Simulate rapid changes like user typing
      schedule(fn);
      vi.advanceTimersByTime(10);
      schedule(fn);
      vi.advanceTimersByTime(10);
      schedule(fn);
      vi.advanceTimersByTime(10);
      schedule(fn);
      vi.advanceTimersByTime(10);
      schedule(fn);
      vi.advanceTimersByTime(5);

      // Should not have executed yet (only 45ms passed, timeout is 50ms)
      expect(fn).not.toHaveBeenCalled();

      // Advance to timeout
      vi.advanceTimersByTime(50);

      // Should execute only once after all rapid scheduling
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should properly clear timeout when cleanup is called', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const [schedule, cleanup] = debouncer(100);
      const fn = vi.fn();

      schedule(fn);
      cleanup();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      vi.advanceTimersByTime(100);
      expect(fn).not.toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it('should handle multiple debounce instances independently', () => {
      const debouncer1 = debouncer(50);
      const debouncer2 = debouncer(100);

      const fn1 = vi.fn();
      const fn2 = vi.fn();

      debouncer1[0](fn1);
      debouncer2[0](fn2);

      vi.advanceTimersByTime(50);
      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn2).toHaveBeenCalledTimes(1);
    });

    it('should log error when non-function is passed to schedule', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const [schedule] = debouncer(100);

      schedule('not-a-function' as never);
      vi.advanceTimersByTime(100);

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should reset internal state after execution', () => {
      const [schedule] = debouncer(50);
      const fn = vi.fn();

      // First execution
      schedule(fn);
      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);

      // Reset function counter for next test
      fn.mockClear();

      // Second execution should work independently
      schedule(fn);
      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should reset internal state after cleanup', () => {
      const [schedule, cleanup] = debouncer(50);
      const fn = vi.fn();

      schedule(fn);
      cleanup();
      expect(fn).not.toHaveBeenCalled();

      // Schedule again after cleanup should work
      schedule(fn);
      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
