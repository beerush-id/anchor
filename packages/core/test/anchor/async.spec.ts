import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AsyncStatus, cancelable, query } from '../../src/index.js';

describe('Anchor Core - Async', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('asyncState', () => {
    it('should create async state without initial value', async () => {
      const state = query(async () => ({ value: 1 }));

      expect(state.data).toBeUndefined();
      expect(state.status).toBe(AsyncStatus.Pending);
      expect(typeof state.start).toBe('function');
      expect(typeof state.abort).toBe('function');

      await state.promise;

      expect(state.data).toEqual({ value: 1 });
    });

    it('should create async state with initial value', async () => {
      const state = query(async () => ({ value: 1 }), { value: 0 });
      expect(state.data).toEqual({ value: 0 });

      await state.promise;

      expect(state.data).toEqual({ value: 1 });
      expect(state.status).toBe(AsyncStatus.Success);
    });

    it('should start async operation automatically', async () => {
      const handler = vi.fn().mockResolvedValue({ value: 42 });
      const state = query(handler);

      // Wait for the initial async operation to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(state.data).toEqual({ value: 42 });
      expect(state.status).toBe(AsyncStatus.Success);
      expect(handler).toHaveBeenCalled();
    });

    it('should handle deferred async operation', async () => {
      const handler = vi.fn().mockResolvedValue({ value: 42 });
      const state = query(handler, { value: 0 }, { deferred: true });

      await state.promise; // A no-op since the state is idle.

      expect(state.data).toEqual({ value: 0 });
      expect(state.status).toBe(AsyncStatus.Idle);
      expect(handler).not.toHaveBeenCalled();

      await state.start();

      expect(state.data).toEqual({ value: 42 });
      expect(state.status).toBe(AsyncStatus.Success);
      expect(handler).toHaveBeenCalled();
    });

    it('should handle async operation error', async () => {
      const error = new Error('Test error');
      const handler = vi.fn().mockRejectedValue(error);
      const state = query(handler, { value: 0 }, { deferred: true });

      await state.start();

      expect(state.data).toEqual({ value: 0 });
      expect(state.status).toBe(AsyncStatus.Error);
      expect(state.error).toBe(error);
    });

    it('should handle aborting async operation', async () => {
      let signal: AbortSignal | undefined;
      const handler = vi.fn().mockImplementation((s: AbortSignal) => {
        signal = s;
        return new Promise((resolve) => {
          const timeout = setTimeout(() => resolve({ value: 42 }), 100);
          s.addEventListener('abort', () => {
            clearTimeout(timeout);
            resolve({ value: 0 });
          });
        });
      });

      const state = query(handler, { value: 0 }, { deferred: true });
      const promise = state.start();

      state.abort(new Error('Aborted'));
      state.abort(); // Make sure not to call abort twice.

      await promise;

      expect(state.data).toEqual({ value: 0 });
      expect(state.status).toBe(AsyncStatus.Error);
      expect(state.error?.message).toBe('Aborted');
      expect(signal?.aborted).toBe(true);
    });

    it('should handle restarting pending operation', async () => {
      const handler = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => setTimeout(() => resolve({ value: 42 })));
      });

      const state = query(handler, { value: 0 }, { deferred: true });
      const promise1 = state.start();
      const promise2 = state.start();

      await Promise.all([promise1, promise2]);

      expect(handler).toHaveBeenCalledTimes(2);
      expect(state.data).toEqual({ value: 42 });
      expect(state.status).toBe(AsyncStatus.Success);
    });

    it('should update data with new initial value', async () => {
      const handler = vi.fn().mockImplementation((signal, init) => Promise.resolve(init));
      const state = query(handler, { value: 0 }, { deferred: true });

      const promise = state.start({ value: 10 });
      expect(state.data).toEqual({ value: 10 });

      await promise;
      expect(state.status).toBe(AsyncStatus.Success);
    });
  });

  describe('cancelable', () => {
    it('should handle synchronous functions', async () => {
      const fn = vi.fn().mockReturnValue({ value: 42 });
      const controller = new AbortController();

      const result = await cancelable(fn, controller.signal);

      expect(result).toEqual({ value: 42 });
      expect(fn).toHaveBeenCalledWith(controller.signal);
    });

    it('should handle asynchronous functions', async () => {
      const fn = vi.fn().mockResolvedValue({ value: 42 });
      const controller = new AbortController();

      const result = await cancelable(fn, controller.signal);

      expect(result).toEqual({ value: 42 });
      expect(fn).toHaveBeenCalledWith(controller.signal);
    });

    it('should handle aborted synchronous functions', async () => {
      const fn = vi.fn().mockReturnValue({ value: 42 });
      const controller = new AbortController();
      controller.abort(new Error('Aborted'));

      await expect(cancelable(fn, controller.signal)).rejects.toThrow('Aborted');
    });

    it('should handle aborted synchronous functions without reason', async () => {
      const fn = vi.fn().mockReturnValue({ value: 42 });
      const controller = new AbortController();
      controller.abort();

      await expect(cancelable(fn, controller.signal)).rejects.toThrow('This operation was aborted');
    });

    it('should handle aborted asynchronous functions', async () => {
      const fn = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ value: 42 }), 100)));
      const controller = new AbortController();

      const promise = cancelable(fn, controller.signal);
      controller.abort(new Error('Aborted'));

      await expect(promise).rejects.toThrow('Aborted');
    });

    it('should handle resolved promises after abort', async () => {
      let resolveFn: ((value?: unknown) => void) | undefined;
      const fn = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFn = resolve;
          })
      );
      const controller = new AbortController();

      const promise = cancelable(fn, controller.signal);
      controller.abort(new Error('Aborted'));

      // Resolve the promise after aborting
      resolveFn?.({ value: 42 });

      await expect(promise).rejects.toThrow('Aborted');
    });

    it('should handle rejected promises after abort', async () => {
      let rejectFn: ((error?: Error) => void) | undefined;
      const fn = vi.fn().mockImplementation(
        () =>
          new Promise((_, reject) => {
            rejectFn = reject;
          })
      );
      const controller = new AbortController();

      const promise = cancelable(fn, controller.signal);
      controller.abort(new Error('Aborted'));

      // Reject the promise after aborting
      rejectFn?.(new Error('Test error'));

      await expect(promise).rejects.toThrow('Aborted');
    });
  });
});
