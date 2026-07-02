import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IRPC_PACKET_TYPE, IRPC_STATUS } from '../src/enum.js';
import { RESOLVE_ERROR, ResolveError, TRANSPORT_ERROR, TransportError } from '../src/error.js';
import { type IRPCCall, type IRPCData, type IRPCPackagePayload, IRPCTransport } from '../src/index.js';

abstract class TransportType {
  abstract schedule(call: unknown): unknown;
  abstract dispatch(calls: unknown[]): Promise<void>;
}

const pkg: IRPCPackagePayload = { name: 'irpc', version: '1.0.0' };

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

  describe('Signing', () => {
    it('should return empty array when not signed', () => {
      const transport = new IRPCTransport();
      expect(transport.credentials).toEqual([]);
    });

    it('should sign with object credential', () => {
      const transport = new IRPCTransport();
      transport.sign({
        username: 'test',
        password: 'password',
      });

      expect(transport.credentials).toEqual([
        ['username', 'test'],
        ['password', 'password'],
      ]);
    });

    it('should sign with factory function', () => {
      const transport = new IRPCTransport();
      transport.sign(() => ({
        username: 'test',
        password: 'password',
      }));
      expect(transport.credentials).toEqual([
        ['username', 'test'],
        ['password', 'password'],
      ]);
    });

    it('should return empty array for sign that returns non object', () => {
      const transport = new IRPCTransport();
      transport.sign(() => undefined);
      expect(transport.credentials).toEqual([]);
    });

    it('should ignore signing with non object or function', () => {
      const transport = new IRPCTransport();

      transport.sign('invalid' as never);
      expect(transport.credentials).toEqual([]);

      transport.sign(() => null);
      expect(transport.credentials).toEqual([]);

      transport.sign([]);
      expect(transport.credentials).toEqual([]);
    });
  });

  describe('IRPC Calling', () => {
    it('should create a promise for RPC call', async () => {
      const spec = {
        name: 'testFunc',
        handler: vi.fn(),
        package: pkg,
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
        package: pkg,
      };

      const promise = transportWithTimeout.call(spec, []);

      // Fast-forward until timer has been executed
      vi.advanceTimersByTime(101);

      await expect(promise).rejects.toThrow('Call timed out.');
    });

    it('should dispatch instantly and return reader statically when stream spec flag is true', () => {
      const dispatchSpy = vi.spyOn(transport as any, 'dispatch').mockImplementation(() => Promise.resolve());

      const spec = {
        name: 'testStreamFunc',
        handler: vi.fn(),
        stream: true,
        package: pkg,
      };

      const result = transport.call(spec, []);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined(); // Returns call.reader inherently
      expect(transport.queue.size).toBe(0); // Safely bypassed queue schedule

      dispatchSpy.mockRestore();
    });
  });

  describe('Transport Utilities', () => {
    it('should ignore close natively mapped statically', () => {
      // The base class close() is an empty function. We just hit it for coverage natively mapped.
      const call = { id: 'test' } as any;
      expect(() => transport.close(call)).not.toThrow();
    });
  });

  describe('IRPC Scheduling', () => {
    it('should dispatch immediately when debounce is false', async () => {
      const transportWithDebounceFalse = new IRPCTransport({ debounce: false });

      const dispatchSpy = vi
        .spyOn(transportWithDebounceFalse as any, 'dispatch')
        .mockImplementation(() => Promise.resolve());

      const call: IRPCCall = {
        id: '1',
        payload: { name: 'test' },
        enqueue: vi.fn(),
        reject: vi.fn(),
        resolve: vi.fn(),
      } as never;

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

      const call1: IRPCCall = {
        id: '1',
        payload: { name: 'test' },
        enqueue: vi.fn(),
        reject: vi.fn(),
        resolve: vi.fn(),
      } as never;
      const call2: IRPCCall = {
        id: '2',
        payload: { name: 'test' },
        enqueue: vi.fn(),
        reject: vi.fn(),
        resolve: vi.fn(),
      } as never;

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

      const call1: IRPCCall = {
        id: '1',
        payload: { name: 'test' },
        enqueue: vi.fn(),
        reject: vi.fn(),
        resolve: vi.fn(),
      } as never;
      const call2: IRPCCall = {
        id: '2',
        payload: { name: 'test' },
        enqueue: vi.fn(),
        reject: vi.fn(),
        resolve: vi.fn(),
      } as never;

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
      const call1: IRPCCall = {
        id: '1',
        payload: { name: 'test' },
        enqueue: vi.fn(),
        reject: vi.fn(),
        resolve: vi.fn(),
      } as never;
      const call2: IRPCCall = {
        id: '2',
        payload: { name: 'test' },
        enqueue: vi.fn(),
        reject: vi.fn(),
        resolve: vi.fn(),
      } as never;

      (transport as never as TransportType).schedule(call1);
      (transport as never as TransportType).schedule(call2);

      expect(transport.queue.has(call1)).toBe(true);
      expect(transport.queue.has(call2)).toBe(true);
      expect(transport.queue.size).toBe(2);

      await Promise.resolve();

      // Both calls should be processed
      expect(call1.enqueue).toHaveBeenCalled();
      expect(call2.enqueue).toHaveBeenCalled();
    });
  });

  describe('IRPC Dispatching', () => {
    it('should reject all calls with not implemented error', async () => {
      const call1: IRPCCall = {
        id: '1',
        payload: { name: 'test' },
        enqueue: vi.fn(),
      } as never;

      const call2: IRPCCall = {
        id: '2',
        payload: { name: 'test' },
        enqueue: vi.fn(),
      } as never;

      await (transport as never as TransportType).dispatch([call1, call2]);

      expect(call1.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          error: {
            type: 'transport',
            code: 'not_implemented',
            message: 'Transport dispatch not implemented.',
          },
        })
      );
      expect(call2.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          error: {
            type: 'transport',
            code: 'not_implemented',
            message: 'Transport dispatch not implemented.',
          },
        })
      );
    });

    it('should resolve all calls when dispatching', async () => {
      class DispatchAll extends IRPCTransport {
        protected async dispatch(calls: IRPCCall[]): Promise<void> {
          calls.forEach((call) =>
            call.enqueue({
              id: call.id,
              name: call.payload.name,
              type: IRPC_PACKET_TYPE.ANSWER,
              status: IRPC_STATUS.SUCCESS,
              data: 'resolved',
              createdAt: Date.now(),
            })
          );
        }
      }

      const transport = new DispatchAll();
      const promise1 = transport.call({ name: 'test', handler: vi.fn(), package: pkg }, []);
      const promise2 = transport.call({ name: 'test', handler: vi.fn(), package: pkg }, []);

      vi.runAllTimers();

      expect(promise1).toBeInstanceOf(Promise);
      expect(promise2).toBeInstanceOf(Promise);
    });
  });

  describe('Package Registration & Resolution', () => {
    it('should register and unregister packages properly', () => {
      const pkg1 = { config: { name: 'testPkg', version: '1.0.0' } } as any;
      const pkg2 = { config: { name: 'testPkg', version: '2.0.0' } } as any;
      const pkgOther = { config: { name: 'otherPkg', version: '1.0.0' } } as any;

      (transport as any).register(pkg1);
      (transport as any).register(pkg2);
      expect(transport.registry.get('testPkg')?.size).toBe(2);

      (transport as any).unregister(pkgOther);
      expect(transport.registry.has('otherPkg')).toBe(false);

      (transport as any).unregister(pkg1);
      expect(transport.registry.get('testPkg')?.size).toBe(1);
      expect(transport.registry.has('testPkg')).toBe(true);

      (transport as any).unregister(pkg2);
      expect(transport.registry.has('testPkg')).toBe(false);
    });
  });
});

describe('TransportError factories', () => {
  it('notConnected', () => {
    const err = TransportError.notConnected('WebSocket');
    expect(err).toBeInstanceOf(TransportError);
    expect(err.code).toBe(TRANSPORT_ERROR.NOT_CONNECTED);
    expect(err.message).toBe('WebSocket is not connected.');
    expect(err.json()).toEqual({ type: 'transport', code: 'not_connected', message: 'WebSocket is not connected.' });
  });

  it('closed', () => {
    const err = TransportError.closed('BroadcastChannel');
    expect(err.code).toBe(TRANSPORT_ERROR.CLOSED);
    expect(err.message).toBe('BroadcastChannel connection closed.');
  });

  it('invalidBody', () => {
    const err = TransportError.invalidBody();
    expect(err.code).toBe(TRANSPORT_ERROR.INVALID_BODY);
  });

  it('streamTerminated', () => {
    const err = TransportError.streamTerminated();
    expect(err.code).toBe(TRANSPORT_ERROR.STREAM_TERMINATED);
  });

  it('failed with string', () => {
    const err = TransportError.failed('Network error');
    expect(err.code).toBe(TRANSPORT_ERROR.ERROR);
    expect(err.message).toBe('Network error');
    expect(err.cause).toBeUndefined();
  });

  it('failed with Error', () => {
    const cause = new Error('timeout');
    const err = TransportError.failed(cause);
    expect(err.code).toBe(TRANSPORT_ERROR.ERROR);
    expect(err.message).toBe('timeout');
    expect(err.cause).toBe(cause);
  });

  it('notFound', () => {
    const err = TransportError.notFound('myPackage');
    expect(err).toBeInstanceOf(TransportError);
    expect(err.code).toBe(TRANSPORT_ERROR.NOT_FOUND);
    expect(err.message).toBe('Can not resolve package for "myPackage" call.');
  });
});

describe('ResolveError factories', () => {
  it('invalidOutput without argument', () => {
    const err = ResolveError.invalidOutput();
    expect(err).toBeInstanceOf(ResolveError);
    expect(err.code).toBe(RESOLVE_ERROR.INVALID_OUTPUT);
    expect(err.message).toBe('Invalid output.');
  });
});
