import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ERROR_CODE, ERROR_MESSAGE } from '../src/error.js';
import { createPackage, IRPCCall, type IRPCHandler, type IRPCPackage, IRPCTransport } from '../src/index.js';

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
      expect(() => createPackage({ name: 'invalid-name' })).toThrow();
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
      expect(rpc.specs.has('testFunc')).toBe(true);

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

      const spec = rpc.stubs.get(testFunc);
      expect(spec?.handler).toBe(handler);
    });

    it('should throw error for invalid stub', () => {
      const handler = vi.fn();
      // @ts-expect-error - Testing invalid stub
      expect(() => rpc.construct('not-a-function', handler)).toThrow(ERROR_MESSAGE[ERROR_CODE.STUB_INVALID]);
    });

    it('should throw error for invalid handler', () => {
      const testFunc = rpc.declare<IRPCHandler>({ name: 'testFunc' });
      expect(() => rpc.construct(testFunc, 'not-a-function' as never)).toThrow(
        ERROR_MESSAGE[ERROR_CODE.INVALID_HANDLER]
      );
    });

    it('should throw error for stub without spec', () => {
      const testFunc = () => {};
      const handler = () => {};
      expect(() => rpc.construct(testFunc, handler)).toThrow(ERROR_MESSAGE[ERROR_CODE.NOT_FOUND]);
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

    it('should call remote implementation', async () => {
      class OptimisticTransport extends IRPCTransport {
        async dispatch(calls: IRPCCall[]) {
          calls.forEach((call) => {
            call.resolve('Hello World');
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

      vi.runAllTimers();

      expect(await promise).toBe('Hello World');
    });

    it('should call cached remote implementation', async () => {
      const dispatcher = vi.fn().mockImplementation((calls: IRPCCall[]) => {
        calls.forEach((call) => {
          call.resolve(call.payload.args[0]);
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
        maxAge: 2,
      });

      const promise = hello('Hello World 1');

      vi.runAllTimers();

      expect(await promise).toBe('Hello World 1');

      const promise2 = hello('Hello World 1');

      vi.runAllTimers();

      expect(await promise2).toBe('Hello World 1');
      expect(dispatcher).toHaveBeenCalledTimes(1);

      const now = Date.now;
      Date.now = () => now() + 1000;

      const promise3 = hello('Hello World 1');

      vi.runAllTimers();

      expect(await promise3).toBe('Hello World 1');
      expect(dispatcher).toHaveBeenCalledTimes(2);

      Date.now = now;
    });

    it('should handle call error without transport', async () => {
      const irpc = createPackage({
        name: 'optimistic',
      });
      const hello = irpc.declare<(name: string) => Promise<string>>({
        name: 'hello',
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
});
