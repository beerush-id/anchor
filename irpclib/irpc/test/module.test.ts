import { createLifecycle } from '@anchorlib/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IRPC_PACKET_TYPE, IRPC_STATUS } from '../src/enum.js';
import { ERROR_CODE, ERROR_MESSAGE } from '../src/error.js';
import { createPackage, type IRPCCall, type IRPCPackage, IRPCTransport } from '../src/index.js';
import { RemoteState } from '../src/state.js';

describe('IRPCPackage', () => {
  let rpc: IRPCPackage;

  beforeEach(() => {
    rpc = createPackage({
      name: 'test',
      version: '1.0.0',
    });
  });

  describe('Create Package', () => {
    it('should create a package with default config', () => {
      const pkg = createPackage({});
      expect(pkg.config.name).toBe('global');
      expect(pkg.config.version).toBe('1.0.0');
    });

    it('should create a package with custom config', () => {
      const pkg = createPackage({
        name: 'custom',
        version: '2.0.0',
        description: 'Test package',
      });

      expect(pkg.config.name).toBe('custom');
      expect(pkg.config.version).toBe('2.0.0');
      expect(pkg.config.description).toBe('Test package');
    });

    it('should throw error for invalid name', () => {
      expect(() => createPackage({ name: 'invalid name' })).toThrow();
      expect(() => createPackage({ name: 'valid_name123' })).not.toThrow();
    });

    it('should throw error for invalid version', () => {
      expect(() => createPackage({ version: '1.0' })).toThrow();
      expect(() => createPackage({ version: '1.0.0' })).not.toThrow();
    });

    it('should return a package href', () => {
      const pkg = createPackage({
        name: 'fs',
        version: '1.0.0',
      });

      expect(pkg.href).toBe('fs/1.0.0');
    });

    it('should return the package info', () => {
      const pkg = createPackage({
        name: 'fs',
        version: '1.0.0',
        description: 'A test package',
        timeout: 10000,
      });

      expect(pkg.info).toEqual({
        name: 'fs',
        version: '1.0.0',
        description: 'A test package',
      });
    });
  });

  describe('Declare Function', () => {
    it('should declare a new RPC function', () => {
      const testFunc = rpc.declare({
        name: 'testFunc',
        description: 'A test function',
      });

      expect(typeof testFunc).toBe('function');
      expect((rpc as any).specs.has('testFunc')).toBe(true);

      const spec = rpc.get('testFunc');
      expect(spec?.name).toBe('testFunc');
      expect(spec?.description).toBe('A test function');
    });

    it('should throw error when declaring duplicate function', () => {
      rpc.declare({ name: 'duplicateFunc' });
      expect(() => rpc.declare({ name: 'duplicateFunc' })).toThrow('IRPC duplicateFunc already exists.');
    });
  });

  describe('Implement Function', () => {
    it('should associate handler with stub', () => {
      type TestFunc = (name: string) => Promise<string>;
      const testFunc = rpc.declare<TestFunc>({ name: 'testFunc' });

      const handler: TestFunc = vi.fn((async (name) => `Hello ${name}`) as TestFunc);
      rpc.construct(testFunc, handler);

      const spec = (rpc as any).stubs.get(testFunc);
      expect(spec?.handler).toBe(handler);
    });

    it('should throw error for invalid stub', () => {
      const handler = vi.fn();
      // @ts-expect-error - Testing invalid stub
      expect(() => rpc.construct('not-a-function', handler)).toThrow(ERROR_MESSAGE[ERROR_CODE.STUB_INVALID]);
    });

    it('should throw error for invalid handler', () => {
      const testFunc = rpc.declare<() => void>({ name: 'testFunc' });
      expect(() => rpc.construct(testFunc, 'not-a-function' as never)).toThrow(
        ERROR_MESSAGE[ERROR_CODE.INVALID_HANDLER]
      );
    });

    it('should throw error for stub without spec', () => {
      const testFunc = () => {};
      const handler = () => {};
      expect(() => rpc.construct(testFunc as never, handler)).toThrow(ERROR_MESSAGE[ERROR_CODE.NOT_FOUND]);
    });
  });

  describe('Use Transport', () => {
    it('should set transport', () => {
      const transport = new IRPCTransport();
      rpc.use(transport);
      expect(rpc.transport).toBe(transport);
    });

    it('should throw error for invalid transport', () => {
      // @ts-expect-error - Testing invalid transport
      expect(() => rpc.use('not-transport')).toThrow(ERROR_MESSAGE[ERROR_CODE.TRANSPORT_INVALID]);
    });
  });

  describe('Configuration', () => {
    it('should update config', () => {
      rpc.configure({
        name: 'updated',
        version: '2.0.0',
        description: 'Updated description',
      });

      expect(rpc.config.name).toBe('updated');
      expect(rpc.config.version).toBe('2.0.0');
      expect(rpc.config.description).toBe('Updated description');
    });
  });

  describe('Get IRPC Spec', () => {
    it('should get spec by name', () => {
      const spec = { name: 'testFunc', description: 'Test function' };
      rpc.declare(spec);

      const result = rpc.get('testFunc');
      expect(result?.name).toBe(spec.name);
      expect(result?.description).toBe(spec.description);
    });

    it('should get spec by request object', () => {
      const spec = { name: 'testFunc' };
      rpc.declare(spec);

      const result = rpc.get({ name: 'testFunc', id: '1', args: [] });
      expect(result?.name).toBe(spec.name);
    });

    it('should return undefined for non-existent spec', () => {
      const result = rpc.get('nonExistent');
      expect(result).toBeUndefined();
    });
  });

  describe('IRPC Call', () => {
    it('should call local implementation', async () => {
      const hello = rpc.declare<(name: string) => Promise<string>>({
        name: 'hello',
      });
      rpc.construct(hello, async (name) => `Hello ${name}`);

      expect(await hello('World')).toBe('Hello World');
    });

    it('should call local synchronous implementation', async () => {
      const hello = rpc.declare<(name: string) => string>({
        name: 'hello',
      });
      rpc.construct(hello, (name) => `Hello ${name}`);

      expect(await hello('World')).toBe('Hello World');
    });

    it('should call local RemoteState implementation', async () => {
      const hello = rpc.declare<(name: string) => RemoteState<string>>({
        name: 'hello',
        init: () => '',
      });
      rpc.construct(hello, (name) => new RemoteState<string>(`Hello ${name}`));

      const result = hello('World');

      expect(result.data).toBe('Hello World');
      expect(result.status).toBe(IRPC_STATUS.PENDING);
    });

    it('should call local RemoteState init implementation', async () => {
      const hello = rpc.declare<(name: string) => RemoteState<string>>({
        name: 'hello',
        init: () => 'Stub init',
      });
      rpc.construct(hello, (_name) => new RemoteState<string>('Init'));

      const result = hello('World');

      expect(result.data).toBe('Init');
      expect(result.status).toBe(IRPC_STATUS.PENDING);
    });

    it('should auto-cleanup RemoteState on component unmount (lifecycle destroy)', () => {
      const hello = rpc.declare<(name: string) => RemoteState<string>>({
        name: 'helloAutoCleanup',
        init: () => 'Init',
      });
      rpc.construct(hello, (_name) => new RemoteState<string>());

      const lifecycle = createLifecycle();
      let result: RemoteState<string> | undefined;

      lifecycle.run(() => {
        result = hello('World');
      });

      expect(result?.status).toBe(IRPC_STATUS.PENDING);

      const closeSpy = vi.spyOn(result!, 'close');

      lifecycle.destroy();

      expect(closeSpy).toHaveBeenCalled();
    });

    it('should handle coalesce call', async () => {
      const irpc = createPackage({
        name: 'coalesce',
      });
      const hello = irpc.declare<(name: string) => Promise<{ message: string }>>({
        name: 'helloCoalesce',
      });
      irpc.construct(hello, async (name) => ({ message: `Hello ${name}` }));

      const promise1 = hello('World');
      const promise2 = hello('World');

      const result1 = await promise1;
      const result2 = await promise2;

      expect(result1).toEqual({ message: 'Hello World' });
      expect(result2).toEqual({ message: 'Hello World' });
      expect(result1).toBe(result2);
    });

    it('should handle non coalesce call', async () => {
      const irpc = createPackage({
        name: 'coalesce',
      });
      const hello = irpc.declare<(name: string) => Promise<{ message: string }>>({
        name: 'helloCoalesceFalse',
        coalesce: false,
      });
      irpc.construct(hello, async (name) => ({ message: `Hello ${name}` }));

      const promise1 = hello('World');
      const promise2 = hello('World');

      const result1 = await promise1;
      const result2 = await promise2;

      expect(result1).toEqual({ message: 'Hello World' });
      expect(result2).toEqual({ message: 'Hello World' });
      expect(result1).not.toBe(result2);
    });

    it('should call remote implementation', async () => {
      class OptimisticTransport extends IRPCTransport {
        async dispatch(calls: IRPCCall[]) {
          calls.forEach((call) => {
            call.enqueue({
              id: call.id,
              name: call.payload.name,
              type: IRPC_PACKET_TYPE.ANSWER,
              status: IRPC_STATUS.SUCCESS,
              data: 'Hello World',
              createdAt: Date.now(),
            });
          });
        }
      }
      const irpc = createPackage({
        name: 'optimistic',
        transport: new OptimisticTransport(),
      });
      const hello = irpc.declare<(name: string) => Promise<string>>({
        name: 'hello',
      });

      const promise = hello('World');

      await Promise.resolve();
      vi.runAllTimers();

      expect(await promise).toBe('Hello World');
    });

    it('should call cached remote implementation', async () => {
      const dispatcher = vi.fn().mockImplementation((calls: IRPCCall[]) => {
        calls.forEach((call) => {
          call.enqueue({
            id: call.id,
            name: call.payload.name,
            type: IRPC_PACKET_TYPE.ANSWER,
            status: IRPC_STATUS.SUCCESS,
            data: call.payload.args[0],
            createdAt: Date.now(),
          });
        });
      });

      class OptimisticTransport extends IRPCTransport {
        async dispatch(calls: IRPCCall[]) {
          dispatcher(calls);
        }
      }

      const irpc = createPackage({
        name: 'optimistic',
        transport: new OptimisticTransport(),
      });

      const hello = irpc.declare<(name: string) => Promise<string>>({
        name: 'hello',
        maxAge: 1000,
      });

      // Make sure invalidate unknown stub doesn't throw.
      irpc.invalidate(() => {});

      const promise = hello('Hello World 1');
      expect(await promise).toBe('Hello World 1');

      const promise2 = hello('Hello World 1');
      expect(await promise2).toBe('Hello World 1');
      expect(dispatcher).toHaveBeenCalledTimes(1);

      vi.runAllTimers();

      const now = Date.now;
      Date.now = () => now() + 1000;

      const promise3 = hello('Hello World 1');

      await Promise.resolve();
      vi.runAllTimers();

      expect(await promise3).toBe('Hello World 1');
      expect(dispatcher).toHaveBeenCalledTimes(2);

      Date.now = now;

      // With invalidate
      const promise4 = hello('Hello World 2');

      vi.advanceTimersByTime(2);
      await Promise.resolve();

      expect(await promise4).toBe('Hello World 2');
      expect(dispatcher).toHaveBeenCalledTimes(3);

      irpc.invalidate(hello, 'Hello World 2');

      vi.runAllTimers();
      await Promise.resolve();

      const promise5 = hello('Hello World 2');

      vi.advanceTimersByTime(2);
      await Promise.resolve();

      expect(await promise5).toBe('Hello World 2');
      expect(dispatcher).toHaveBeenCalledTimes(4);

      irpc.invalidate(hello);
    });

    it('should handle call error without transport', async () => {
      const irpc = createPackage({
        name: 'optimistic',
      });
      const hello = irpc.declare<(name: string) => Promise<string>>({
        name: 'helloOptimistic',
      });

      await expect(hello('World')).rejects.toThrow(ERROR_MESSAGE[ERROR_CODE.TRANSPORT_MISSING]);
    });
  });

  describe('Resolve Call', () => {
    it('should resolve local function call', async () => {
      type TestFunc = (input: { name: string }) => Promise<string>;
      const testFunc = rpc.declare<TestFunc>({ name: 'testFunc' });

      const handler: TestFunc = async (input) => `Hello ${input.name}`;
      rpc.construct(testFunc, handler);

      const result = await rpc.resolve({
        id: '1',
        name: 'testFunc',
        args: [{ name: 'World' }],
      });

      expect(result).toBe('Hello World');
    });

    it('should reject for non-existent function', async () => {
      await expect(
        rpc.resolve({
          id: '1',
          name: 'nonExistent',
          args: [],
        })
      ).rejects.toThrow('IRPC nonExistent does not exist.');
    });

    it('should reject for function without implementation', async () => {
      rpc.declare({ name: 'unimplemented' });

      await expect(
        rpc.resolve({
          id: '1',
          name: 'unimplemented',
          args: [],
        })
      ).rejects.toThrow('IRPC unimplemented does not have an implementation.');
    });
  });

  describe('Local Call (intercept)', () => {
    it('should handle non promise that throws', async () => {
      const hello = rpc.declare<(name: string) => string>({
        name: 'hello',
      });
      rpc.construct(hello, () => {
        throw new Error('Hello World');
      });

      await expect(() => hello('World')).rejects.toThrow('Hello World');
    });

    it('should handle promise that throws', async () => {
      const hello = rpc.declare({
        name: 'hello',
      });
      rpc.construct(hello, () => {
        return Promise.reject(new Error('Hello World'));
      });

      await expect(() => hello()).rejects.toThrow('Hello World');
    });

    it('should return an IRPCReader when handler is a local stream', () => {
      const hello = rpc.declare<(name: string) => RemoteState<{ message: string }>>({
        name: 'helloLocalStream',
        init: () => ({ message: '' }),
      });

      rpc.construct(hello, (name) => {
        const state = new RemoteState<{ message: string }>({ message: `Hello ${name}` });
        setTimeout(() => state.accept(), 10);
        return state;
      });

      const result = hello('World');

      // The result should have the init() value, not the handler value (not started yet).
      expect(result.data).toEqual({ message: 'Hello World' });
      expect(result.status).toBe(IRPC_STATUS.PENDING);
    });

    it('should invoke handler and relay data mutations when start() is called', async () => {
      const hello = rpc.declare<(name: string) => RemoteState<{ message: string }>>({
        name: 'helloStart',
        init: () => ({ message: '' }),
      });

      rpc.construct(hello, (name) => {
        const state = new RemoteState<{ message: string }>({ message: `Hello ${name}` });

        setTimeout(() => {
          state.data.message = 'Updated';
        }, 5);

        setTimeout(() => {
          state.accept();
        }, 10);

        return state;
      });

      const result = hello('World');

      // After start, the handler's initial data should be assigned.
      expect(result.data.message).toBe('Hello World');

      // Advance to trigger the data mutation.
      vi.advanceTimersByTime(5);
      expect(result.data.message).toBe('Updated');

      // Advance to trigger accept (status -> SUCCESS), which unsubscribes.
      vi.advanceTimersByTime(5);
      expect(result.status).toBe(IRPC_STATUS.SUCCESS);
    });
  });

  describe('Spec Hooks', () => {
    it('should register a hook on a valid stub', () => {
      const testFunc = rpc.declare<() => Promise<string>>({ name: 'hookTest' });
      const hookFn = vi.fn();

      rpc.hook(testFunc, hookFn);

      const spec = (rpc as any).stubs.get(testFunc)!;
      expect((rpc as any).hooks.get(spec)!.has(hookFn)).toBe(true);
    });

    it('should support chaining when registering hooks', () => {
      const testFunc = rpc.declare<() => Promise<string>>({ name: 'hookChain' });
      const hook1 = vi.fn();
      const hook2 = vi.fn();

      const result = rpc.hook(testFunc, hook1).hook(testFunc, hook2);

      expect(result).toBe(rpc);
      const spec = (rpc as any).stubs.get(testFunc)!;
      expect((rpc as any).hooks.get(spec)!.size).toBe(2);
    });

    it('should log error and return self when hooking an invalid stub', () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const unknownStub = () => {};

      const result = rpc.hook(unknownStub, vi.fn());

      expect(errSpy).toHaveBeenCalled();
      expect(result).toBe(rpc);
      errSpy.mockRestore();
    });
  });

  describe('Resolve Hooks', () => {
    it('should execute all hooks in order for a valid spec', async () => {
      const testFunc = rpc.declare<(name: string) => Promise<string>>({ name: 'hookResolve' });
      rpc.construct(testFunc, async (name) => `Hello ${name}`);

      const order: number[] = [];
      rpc.hook(testFunc, () => {
        order.push(1);
      });
      rpc.hook(testFunc, () => {
        order.push(2);
      });
      rpc.hook(testFunc, () => {
        order.push(3);
      });

      const req = { id: '1', name: 'hookResolve', args: ['World'] };
      await rpc.resolveHooks(req);

      expect(order).toEqual([1, 2, 3]);
    });

    it('should pass the request to each hook', async () => {
      const testFunc = rpc.declare<(name: string) => Promise<string>>({ name: 'hookReq' });
      rpc.construct(testFunc, async (name) => `Hello ${name}`);

      const hookFn = vi.fn();
      rpc.hook(testFunc, hookFn);

      const req = { id: '1', name: 'hookReq', args: ['World'] };
      await rpc.resolveHooks(req);

      expect(hookFn).toHaveBeenCalledWith(req);
    });

    it('should throw when resolving hooks for a non-existent spec', async () => {
      const req = { id: '1', name: 'nonExistent', args: [] };

      await expect(rpc.resolveHooks(req)).rejects.toThrow(ERROR_MESSAGE[ERROR_CODE.NOT_FOUND]);
    });

    it('should propagate errors thrown by hooks', async () => {
      const testFunc = rpc.declare<() => Promise<string>>({ name: 'hookError' });
      rpc.construct(testFunc, async () => 'ok');

      rpc.hook(testFunc, () => {
        throw new Error('Hook denied');
      });

      const req = { id: '1', name: 'hookError', args: [] };
      await expect(rpc.resolveHooks(req)).rejects.toThrow('Hook denied');
    });

    it('should stop execution when a hook throws', async () => {
      const testFunc = rpc.declare<() => Promise<string>>({ name: 'hookStop' });
      rpc.construct(testFunc, async () => 'ok');

      const afterThrow = vi.fn();

      rpc.hook(testFunc, () => {
        throw new Error('Stopped');
      });
      rpc.hook(testFunc, afterThrow);

      const req = { id: '1', name: 'hookStop', args: [] };
      await expect(rpc.resolveHooks(req)).rejects.toThrow('Stopped');
      expect(afterThrow).not.toHaveBeenCalled();
    });

    it('should await async hooks', async () => {
      const testFunc = rpc.declare<() => Promise<string>>({ name: 'hookAsync' });
      rpc.construct(testFunc, async () => 'ok');

      const executed = vi.fn();
      rpc.hook(testFunc, async () => {
        executed();
      });

      const req = { id: '1', name: 'hookAsync', args: [] };
      await rpc.resolveHooks(req);

      expect(executed).toHaveBeenCalled();
    });
  });
});
