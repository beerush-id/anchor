import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { microbatch } from '../../src/index.js';

describe('Anchor Utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Micro Batcher (microbatch)', () => {
    it('should execute scheduled functions after the specified delay', () => {
      const [schedule] = microbatch(100);
      const fn1 = vi.fn();
      const fn2 = vi.fn();

      schedule(fn1);
      schedule(fn2);

      expect(fn1).not.toHaveBeenCalled();
      expect(fn2).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
    });

    it('should not execute functions before the delay', () => {
      const [schedule] = microbatch(100);
      const fn = vi.fn();

      schedule(fn);

      vi.advanceTimersByTime(50);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not schedule the same function multiple times', () => {
      const [schedule] = microbatch(100);
      const fn = vi.fn();

      schedule(fn);
      schedule(fn);
      schedule(fn);

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should reset and cancel pending executions', () => {
      const [schedule, reset] = microbatch(100);
      const fn = vi.fn();

      schedule(fn);
      reset();

      vi.advanceTimersByTime(100);
      expect(fn).not.toHaveBeenCalled();
    });

    it('should handle function execution errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const [schedule] = microbatch(100);
      const errorFn = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalFn = vi.fn();

      schedule(errorFn);
      schedule(normalFn);

      vi.advanceTimersByTime(100);

      expect(errorFn).toHaveBeenCalled();
      expect(normalFn).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should clear batch after execution', () => {
      const [schedule] = microbatch(100);
      const fn = vi.fn();

      schedule(fn);
      vi.advanceTimersByTime(100);

      // Schedule again after execution
      schedule(fn);
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid successive scheduling like user dragging', () => {
      const [schedule] = microbatch(50);
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const fn3 = vi.fn();

      // Simulate rapid changes like user dragging an element triggering different functions
      schedule(fn1);
      vi.advanceTimersByTime(10);
      schedule(fn2);
      vi.advanceTimersByTime(10);
      schedule(fn3);
      vi.advanceTimersByTime(10);
      schedule(fn1);
      vi.advanceTimersByTime(10);
      schedule(fn2);
      vi.advanceTimersByTime(5);

      // Should not have executed yet (only 45ms passed, timeout is 50ms)
      expect(fn1).not.toHaveBeenCalled();
      expect(fn2).not.toHaveBeenCalled();
      expect(fn3).not.toHaveBeenCalled();

      // Advance to timeout
      vi.advanceTimersByTime(10);

      // Should execute all functions once each
      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
      expect(fn3).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple chunks when user drags for extended period', () => {
      const [schedule] = microbatch(50);
      const fn = vi.fn();

      // Simulate user dragging for 200ms with events every 10ms
      // This should result in 4 separate batch executions
      for (let i = 0; i < 20; i++) {
        schedule(fn);
        vi.advanceTimersByTime(10);
      }

      // Should have executed 4 times (at 50ms, 100ms, 150ms, and 200ms)
      expect(fn).toHaveBeenCalledTimes(4);
    });
  });
});
