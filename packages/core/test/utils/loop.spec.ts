import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { microloop } from '../../src/index.js';

describe('Anchor Utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Micro Looper (microloop)', () => {
    it('should execute the function repeatedly with specified timeout', async () => {
      const [loop] = microloop(100, 5);
      const fn = vi.fn();

      const promise = loop(fn);

      // Advance time to execute all steps
      vi.advanceTimersByTime(500);

      const result = await promise;

      expect(fn).toHaveBeenCalledTimes(5);
      expect(result).toBe(5);
    });

    it('should stop execution when stop function is called', async () => {
      const [loop, stop] = microloop(100, 10);
      const fn = vi.fn();

      const promise = loop(fn);

      // Advance time for 3 steps
      vi.advanceTimersByTime(300);

      // Stop the loop
      stop();

      // Advance time for more steps
      vi.advanceTimersByTime(500);

      const result = await promise;

      // Should have only executed 3 times
      expect(fn).toHaveBeenCalledTimes(3);
      expect(result).toBe(3);
    });

    it('should not allow duplicated loops', async () => {
      const [loop] = microloop(100, 5);
      const fn = vi.fn();
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Start first loop
      const promise1 = loop(fn);

      // Try to start second loop while first is running
      const promise2 = loop(fn);

      const result2 = await promise2;

      // Second loop should resolve immediately with 0
      expect(result2).toBe(0);

      // Advance time to complete first loop
      vi.advanceTimersByTime(500);
      await promise1;

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle function execution errors gracefully', async () => {
      const [loop] = microloop(100, 5);
      const errorFn = vi.fn(() => {
        throw new Error('Test error');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const promise = loop(errorFn);
      vi.advanceTimersByTime(200);

      const result = await promise;

      // Should have executed once and then stopped due to error
      expect(errorFn).toHaveBeenCalledTimes(1);
      expect(result).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should execute correct number of steps', async () => {
      const steps = 3;
      const [loop] = microloop(50, steps);
      const fn = vi.fn();

      const promise = loop(fn);
      vi.advanceTimersByTime(300); // Advance more than needed

      const result = await promise;

      expect(fn).toHaveBeenCalledTimes(steps);
      expect(result).toBe(steps);
    });

    it('should resolve with correct count when completed normally', async () => {
      const [loop] = microloop(100, 7);
      const fn = vi.fn();

      const promise = loop(fn);
      vi.advanceTimersByTime(700);

      const result = await promise;

      expect(result).toBe(7);
    });

    it('should clear interval after completion', async () => {
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
      const [loop] = microloop(100, 3);
      const fn = vi.fn();

      const promise = loop(fn);
      vi.advanceTimersByTime(300);

      await promise;

      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });

    it('should clear interval when stopped manually', async () => {
      const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
      const [loop, stop] = microloop(100, 10);
      const fn = vi.fn();

      const promise = loop(fn);
      vi.advanceTimersByTime(200);
      stop();

      await promise;

      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });
  });
});
