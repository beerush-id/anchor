import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ERROR_CODE, ERROR_MESSAGE } from '../src/error.js';
import { type IRPCCall, type IRPCData, IRPCTransport } from '../src/index.js';

abstract class TransportType {
  abstract schedule(call: unknown): unknown;
  abstract dispatch(calls: unknown[]): Promise<void>;
}

describe('IRPC Transport', () => {
  let transport: IRPCTransport;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    transport = new IRPCTransport();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('Initialization', () => {
    it('should create transport with default config', () => {
      expect(transport.config).toBeUndefined();
      expect(transport.queue.size).toBe(0);
    });

    it('should create transport with custom config', () => {
      const config = { timeout: 5000, debounce: 100 };
      const t = new IRPCTransport(config);
      expect(t.config).toEqual(config);
    });
  });

  describe('IRPC Calling', () => {
    it('should create a promise for RPC call', async () => {
      const spec = {
        name: 'testFunc',
        handler: vi.fn(),
      };

      const args: IRPCData[] = ['arg1', 'arg2'];
      const promise = transport.call(spec, args);

      expect(promise).toBeInstanceOf(Promise);
      await expect(async () => await promise).rejects.toThrow();
    });

    it('should reject with timeout error when timeout exceeded', async () => {
      class TestTransport extends IRPCTransport {
        protected dispatch(): Promise<void> {
          return new Promise(() => {}); // Never resolve.
        }
      }
      const transportWithTimeout = new TestTransport({ timeout: 100 });
      const spec = {
        name: 'testFunc',
        handler: vi.fn(),
      };

      const promise = transportWithTimeout.call(spec, []);

      // Fast-forward until timer has been executed
      vi.advanceTimersByTime(101);

      await expect(promise).rejects.toThrow(ERROR_MESSAGE[ERROR_CODE.TIMEOUT]);
    });
  });

  describe('IRPC Scheduling', () => {
    it('should dispatch immediately when debounce is false', async () => {
      const transportWithDebounceFalse = new IRPCTransport({ debounce: false });

      const dispatchSpy = vi
        .spyOn(transportWithDebounceFalse as any, 'dispatch')
        .mockImplementation(() => Promise.resolve());

      const call: IRPCCall = { id: '1', reject: vi.fn(), resolve: vi.fn() } as never;

      (transportWithDebounceFalse as never as TransportType).schedule(call);

      // When debounce is false, dispatch should be called immediately
      expect(dispatchSpy).toHaveBeenCalledWith([call]);
      expect(transportWithDebounceFalse.queue.size).toBe(0);

      dispatchSpy.mockRestore();
    });

    it('should use queueMicrotask when debounce is 0', async () => {
      vi.useFakeTimers();

      const transportWithDebounceZero = new IRPCTransport({ debounce: 0 });
      const dispatchSpy = vi
        .spyOn(transportWithDebounceZero as any, 'dispatch')
        .mockImplementation(() => Promise.resolve());

      const call1: IRPCCall = { id: '1', reject: vi.fn(), resolve: vi.fn() } as never;
      const call2: IRPCCall = { id: '2', reject: vi.fn(), resolve: vi.fn() } as never;

      (transportWithDebounceZero as never as TransportType).schedule(call1);
      (transportWithDebounceZero as never as TransportType).schedule(call2);

      // Queue should have calls until microtask runs
      expect(transportWithDebounceZero.queue.size).toBe(2);
      expect(dispatchSpy).not.toHaveBeenCalled();

      // Process microtasks
      await Promise.resolve();

      // Dispatch should have been called with all queued calls
      expect(dispatchSpy).toHaveBeenCalledWith([call1, call2]);
      expect(transportWithDebounceZero.queue.size).toBe(0);

      dispatchSpy.mockRestore();
      vi.useRealTimers();
    });

    it('should use setTimeout when debounce is greater than 0', async () => {
      vi.useFakeTimers();

      const transportWithDebounce = new IRPCTransport({ debounce: 100 });
      const dispatchSpy = vi
        .spyOn(transportWithDebounce as any, 'dispatch')
        .mockImplementation(() => Promise.resolve());

      const call1: IRPCCall = { id: '1', reject: vi.fn(), resolve: vi.fn() } as never;
      const call2: IRPCCall = { id: '2', reject: vi.fn(), resolve: vi.fn() } as never;

      (transportWithDebounce as never as TransportType).schedule(call1);
      (transportWithDebounce as never as TransportType).schedule(call2);

      // Queue should have calls until timeout runs
      expect(transportWithDebounce.queue.size).toBe(2);
      expect(dispatchSpy).not.toHaveBeenCalled();

      // Advance timers to trigger the timeout
      vi.advanceTimersByTime(100);

      // Dispatch should have been called with all queued calls
      await Promise.resolve(); // Wait for the promise to resolve
      expect(dispatchSpy).toHaveBeenCalledWith([call1, call2]);
      expect(transportWithDebounce.queue.size).toBe(0);

      dispatchSpy.mockRestore();
      vi.useRealTimers();
    });

    it('should maintain queue of multiple calls with default debounce', async () => {
      // Default debounce behavior uses queueMicrotask (0ms)
      const call1: IRPCCall = { id: '1', reject: vi.fn(), resolve: vi.fn() } as never;
      const call2: IRPCCall = { id: '2', reject: vi.fn(), resolve: vi.fn() } as never;

      (transport as never as TransportType).schedule(call1);
      (transport as never as TransportType).schedule(call2);

      expect(transport.queue.has(call1)).toBe(true);
      expect(transport.queue.has(call2)).toBe(true);
      expect(transport.queue.size).toBe(2);

      await Promise.resolve();

      // Both calls should be processed
      expect(call1.reject).toHaveBeenCalled();
      expect(call2.reject).toHaveBeenCalled();
    });
  });

  describe('IRPC Dispatching', () => {
    it('should reject all calls with not implemented error', async () => {
      const call1: IRPCCall = {
        id: '1',
        reject: vi.fn(),
      } as never;

      const call2: IRPCCall = {
        id: '2',
        reject: vi.fn(),
      } as never;

      await (transport as never as TransportType).dispatch([call1, call2]);

      expect(call1.reject).toHaveBeenCalledWith(new Error(ERROR_MESSAGE[ERROR_CODE.TRANSPORT_NOT_IMPLEMENTED]));
      expect(call2.reject).toHaveBeenCalledWith(new Error(ERROR_MESSAGE[ERROR_CODE.TRANSPORT_NOT_IMPLEMENTED]));
    });

    it('should resolve all calls when dispatching', async () => {
      class DispatchAll extends IRPCTransport {
        protected async dispatch(calls: IRPCCall[]): Promise<void> {
          calls.forEach((call) => call.resolve('resolved'));
        }
      }

      const transport = new DispatchAll();
      const promise1 = transport.call({ name: 'test', handler: vi.fn() }, []);
      const promise2 = transport.call({ name: 'test', handler: vi.fn() }, []);

      vi.runAllTimers();

      expect(promise1).toBeInstanceOf(Promise);
      expect(promise2).toBeInstanceOf(Promise);
    });
  });
});
