import { describe, expect, it, vi } from 'vitest';
import { retriable } from '../../src/index.js';

describe('Anchor Core - Retriable', () => {
  it('should execute function successfully on first try', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await retriable(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should handle synchronous functions', async () => {
    const fn = vi.fn().mockImplementation(() => 'sync result');
    const result = await retriable(fn);

    expect(result).toBe('sync result');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should handle zero maxRetries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Failure'));
    const promise = retriable(fn, { maxRetries: 0 });

    await expect(promise).rejects.toThrow('Failure');
    expect(fn).toHaveBeenCalledTimes(1); // Only initial call
  });

  it('should handle negative maxRetries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Failure'));
    const promise = retriable(fn, { maxRetries: -1 });

    await expect(promise).rejects.toThrow('Failure');
    expect(fn).toHaveBeenCalledTimes(1); // Only initial call
  });

  it('should pass AbortSignal to the function', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    await retriable(fn);

    expect(fn).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it('should handle cancellation via AbortController', async () => {
    const controller = new AbortController();
    const fn = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves

    controller.abort();

    const promise = retriable(fn, { controller, maxRetries: 0 });

    await expect(promise).rejects.toThrow('Call was aborted');
    expect(fn).toHaveBeenCalledTimes(0); // Function should not be called when already aborted
  });

  it('should handle complex error types', async () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'CustomError';
      }
    }

    const fn = vi.fn().mockRejectedValue(new CustomError('Custom failure'));
    const promise = retriable(fn, { maxRetries: 0 });

    await expect(promise).rejects.toThrow(CustomError);
    await expect(promise).rejects.toThrow('Custom failure');
  });

  it('should handle default options', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Failure'));
    const promise = retriable(fn);

    await expect(promise).rejects.toThrow('Failure');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should handle successful retry with synchronous functions', async () => {
    let attempts = 0;
    const fn = vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 2) {
        throw new Error('Sync failure');
      }
      return 'success';
    });

    const result = await retriable(fn, { maxRetries: 2, retryDelay: 1 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should handle timeout', async () => {
    const fn = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves
    const promise = retriable(fn, { timeout: 10 });

    await expect(promise).rejects.toThrow('Call timed out');
  });

  it('should handle retry mode configuration', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Failure'));
    const promise = retriable(fn, {
      maxRetries: 1,
      retryDelay: 10,
      retryMode: 'linear'
    });

    await expect(promise).rejects.toThrow('Failure');
    expect(fn).toHaveBeenCalledTimes(2); // Initial + 1 retry
  });

  it('should handle exponential retry mode', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Failure'));
    const promise = retriable(fn, {
      maxRetries: 1,
      retryDelay: 10,
      retryMode: 'exponential'
    });

    await expect(promise).rejects.toThrow('Failure');
    expect(fn).toHaveBeenCalledTimes(2); // Initial + 1 retry
  });

  it('should handle abort during function execution', async () => {
    const controller = new AbortController();
    const fn = vi.fn().mockImplementation(async (signal) => {
      // Simulate async work that can be aborted
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => resolve('success'), 100);
        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Aborted'));
        });
      });
    });

    // Start the retriable function
    const promise = retriable(fn, {
      controller,
      maxRetries: 2,
      retryDelay: 10
    });

    // Abort during the function execution
    setTimeout(() => controller.abort(), 20);

    await expect(promise).rejects.toThrow('Call was aborted');
    expect(fn).toHaveBeenCalledTimes(1); // Only initial call, aborted during execution
  });
});