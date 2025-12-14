import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ERROR_CODE, ERROR_MESSAGE } from '../src/error.js';
import { type IRPCCall, type IRPCData, IRPCTransport } from '../src/index.js';

abstract class TransportType {
  abstract schedule(call: unknown): unknown;
  abstract dispatch(calls: unknown[]): Promise<void>;
}

describe('IRPC Transport', () => {
  let transport: IRPCTransport;

  beforeEach(() => {
    transport = new IRPCTransport();
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
    it('should create a promise for RPC call', () => {
      const spec = {
        name: 'testFunc',
        handler: vi.fn(),
      };

      const args: IRPCData[] = ['arg1', 'arg2'];
      const promise = transport.call(spec, args);

      expect(promise).toBeInstanceOf(Promise);
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
    it('should add call to queue', () => {
      const call: IRPCCall = { id: '1' } as never;
      (transport as never as TransportType).schedule(call);
      expect(transport.queue.has(call)).toBe(true);
      expect(transport.queue.size).toBe(1);
    });

    it('should maintain queue of multiple calls', () => {
      const call1: IRPCCall = { id: '1' } as never;
      const call2: IRPCCall = { id: '2' } as never;

      (transport as never as TransportType).schedule(call1);
      (transport as never as TransportType).schedule(call2);

      expect(transport.queue.has(call1)).toBe(true);
      expect(transport.queue.has(call2)).toBe(true);
      expect(transport.queue.size).toBe(2);
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
