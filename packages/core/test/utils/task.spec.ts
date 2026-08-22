import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { afterTask, microtask, sleep } from '../../src/index.js';

describe('Anchor Utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Task Scheduler (microtask)', () => {
    it('should execute the scheduled task after the specified timeout', async () => {
      const [schedule] = microtask<number>(100);
      const handler = vi.fn();

      schedule(handler, 42);

      expect(handler).not.toHaveBeenCalled();
      sleep(50).then(() => {});
      afterTask().then(() => {});

      vi.advanceTimersByTime(100);

      expect(handler).toHaveBeenCalledWith(42, 42);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should not execute task before timeout', () => {
      const [schedule] = microtask<number>(100);
      const handler = vi.fn();

      schedule(handler, 42);

      vi.advanceTimersByTime(50);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should use default delay of 10ms when parameter is omitted', () => {
      const [schedule] = microtask<number>();
      const handler = vi.fn();

      schedule(handler, 100);
      vi.advanceTimersByTime(5);
      expect(handler).not.toHaveBeenCalled();

      vi.advanceTimersByTime(5);
      expect(handler).toHaveBeenCalledWith(100, 100);
    });

    it('should schedule tasks without context data', () => {
      const [schedule] = microtask();
      const handler = vi.fn();

      schedule(handler);
      vi.advanceTimersByTime(10);

      expect(handler).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should handle multiple schedules when delay is 0', async () => {
      const [schedule] = microtask<number>(0);
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      schedule(handler1, 1);
      schedule(handler2, 2);

      const promise = new Promise((resolve) => setTimeout(resolve, 1));
      vi.advanceTimersByTime(1);
      await promise;

      expect(handler2).toHaveBeenCalledWith(1, 2);
    });

    it('should pass initial and last context to the handler', () => {
      const [schedule] = microtask<number>(100);
      const handler = vi.fn();

      schedule(handler, 1);
      schedule(handler, 2);
      schedule(handler, 3);

      vi.advanceTimersByTime(100);

      expect(handler).toHaveBeenCalledWith(1, 3);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple schedules with different timeouts', () => {
      const [schedule] = microtask<string>(50);
      const handler = vi.fn();

      schedule(handler, 'first');
      vi.advanceTimersByTime(25);
      schedule(handler, 'second');

      vi.advanceTimersByTime(50); // 50ms from second schedule (75ms total)
      expect(handler).toHaveBeenCalledWith('first', 'second');
    });

    it('should destroy and cancel pending tasks', () => {
      const [schedule, destroy] = microtask<number>(100);
      const handler = vi.fn();

      schedule(handler, 42);
      destroy();

      vi.advanceTimersByTime(100);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle async task handlers', async () => {
      const [schedule] = microtask<number>(100);
      const asyncHandler = vi.fn(async (init: number, current: number) => {
        // Simulate async work
        await Promise.resolve();
        return init + current;
      });

      schedule(asyncHandler as never, 1);
      schedule(asyncHandler as never, 2);

      vi.advanceTimersByTime(100);

      expect(asyncHandler).toHaveBeenCalledWith(1, 2);
    });

    it('should handle task execution errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const [schedule] = microtask<number>(100);
      const errorHandler = vi.fn(() => {
        throw new Error('Test error');
      });

      schedule(errorHandler, 42);

      vi.advanceTimersByTime(100);

      expect(errorHandler).toHaveBeenCalledWith(42, 42);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle queue task execution errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const [schedule] = microtask<number>(0);
      const errorHandler = vi.fn(() => {
        throw new Error('Test error');
      });

      schedule(errorHandler, 42);

      const promise = new Promise((resolve) => setTimeout(resolve, 1));
      vi.advanceTimersByTime(1);
      await promise;

      expect(errorHandler).toHaveBeenCalledWith(42, 42);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should properly reset state after execution', () => {
      const [schedule] = microtask<number>(100);
      const handler = vi.fn();

      schedule(handler, 1);
      vi.advanceTimersByTime(100);

      // Schedule again after execution
      schedule(handler, 2);
      vi.advanceTimersByTime(100);

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(1, 1, 1);
      expect(handler).toHaveBeenNthCalledWith(2, 2, 2);
    });

    it('should handle rapid successive scheduling like user dragging', () => {
      const [schedule] = microtask<number>(50);
      const handler = vi.fn();

      // Simulate rapid changes like user dragging an element
      schedule(handler, 1);
      vi.advanceTimersByTime(10);
      schedule(handler, 2);
      vi.advanceTimersByTime(10);
      schedule(handler, 3);
      vi.advanceTimersByTime(10);
      schedule(handler, 4);
      vi.advanceTimersByTime(10);
      schedule(handler, 5);
      vi.advanceTimersByTime(5);

      // Should not have executed yet (only 45ms passed, timeout is 50ms)
      expect(handler).not.toHaveBeenCalled();

      // Advance to timeout (needs 50ms from last schedule at 40ms -> 90ms total, currently 45ms passed)
      vi.advanceTimersByTime(45);

      // Should only execute once with initial and final values
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(1, 5);
    });

    it('should handle multiple chunks when user drags for extended period', () => {
      const [schedule] = microtask<number>(50);
      const handler = vi.fn();

      // Simulate user dragging for 200ms with events every 5ms
      for (let i = 0; i < 40; i++) {
        // 40 iterations * 5ms = 200ms total
        schedule(handler, i + 1);
        vi.advanceTimersByTime(5);
      }

      // Advance time by 50ms to allow the execution after rapid dragging completes
      vi.advanceTimersByTime(50);

      // Under clearTimeout timer resetting, continuous rapid calls debounce into 1 execution
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(1, 40);
    });
  });
});
