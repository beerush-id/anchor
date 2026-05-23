import { describe, expect, it, vi } from 'vitest';
import { IRPC_PACKET_TYPE, IRPC_STATUS } from '../src/enum.js';
import { ERROR_CODE, ERROR_MESSAGE } from '../src/error.js';
import type { IRPCTransport } from '../src/index.js';
import type { IRPCPackage } from '../src/module.js';
import { IRPCRouter } from '../src/router.js';
import { IRPC_STORE } from '../src/store.js';
import type { IRPCRequest } from '../src/types.js';

function createMockRouter() {
  const module = {} as IRPCPackage;
  const transport = {} as IRPCTransport;

  // Prevent IRPC_STORE.route() from throwing by spying on it.
  const routeSpy = vi.spyOn(IRPC_STORE, 'route').mockImplementation(() => {});
  const router = new IRPCRouter(module, transport);
  routeSpy.mockRestore();

  return router;
}

describe('IRPCRouter', () => {
  describe('constructor', () => {
    it('should store module and transport references', () => {
      const module = {} as IRPCPackage;
      const transport = {} as IRPCTransport;
      const routeSpy = vi.spyOn(IRPC_STORE, 'route').mockImplementation(() => {});

      const router = new IRPCRouter(module, transport);

      expect(router.module).toBe(module);
      expect(router.transport).toBe(transport);
      routeSpy.mockRestore();
    });

    it('should register itself with the IRPC_STORE', () => {
      const routeSpy = vi.spyOn(IRPC_STORE, 'route').mockImplementation(() => {});

      const module = {} as IRPCPackage;
      const transport = {} as IRPCTransport;
      const router = new IRPCRouter(module, transport);

      expect(routeSpy).toHaveBeenCalledWith(router);
      routeSpy.mockRestore();
    });

    it('should initialize with an empty hooks array', () => {
      const router = createMockRouter();
      expect(router.hooks).toEqual([]);
    });
  });

  describe('use', () => {
    it('should add a hook function', () => {
      const router = createMockRouter();
      const hook = vi.fn();

      router.use(hook);

      expect(router.hooks).toContain(hook);
    });

    it('should support chaining', () => {
      const router = createMockRouter();
      const mw1 = vi.fn();
      const mw2 = vi.fn();

      const result = router.use(mw1).use(mw2);

      expect(result).toBe(router);
      expect(router.hooks).toEqual([mw1, mw2]);
    });

    it('should log error and return self when hook is not a function', () => {
      const router = createMockRouter();
      const errSpy = vi.spyOn(IRPC_STORE, 'error').mockImplementation(() => {});

      const result = router.use('not-a-function' as any);

      expect(errSpy).toHaveBeenCalled();
      expect(result).toBe(router);
      expect(router.hooks).toHaveLength(0);

      errSpy.mockRestore();
    });
  });

  describe('resolveHooks', () => {
    it('should execute all hooks in order', async () => {
      const router = createMockRouter();
      const order: number[] = [];

      router.use(() => {
        order.push(1);
      });
      router.use(() => {
        order.push(2);
      });
      router.use(() => {
        order.push(3);
      });

      const req = { id: '1', name: 'test' } as IRPCRequest;
      const result = await router['resolveHooks'](req);

      expect(result).toBeUndefined();
      expect(order).toEqual([1, 2, 3]);
    });

    it('should execute async hook', async () => {
      const router = createMockRouter();
      const executed = vi.fn();

      router.use(async () => {
        executed();
      });

      const req = { id: '1', name: 'test' } as IRPCRequest;
      const result = await router['resolveHooks'](req);

      expect(result).toBeUndefined();
      expect(executed).toHaveBeenCalled();
    });

    it('should return error response when hook throws', async () => {
      const router = createMockRouter();
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      router.use(() => {
        throw new Error('Middleware failed');
      });

      const req = { id: '1', name: 'test' } as IRPCRequest;
      const result = await router['resolveHooks'](req);

      expect(result).toEqual({
        id: '1',
        name: 'test',
        type: IRPC_PACKET_TYPE.CLOSE,
        status: IRPC_STATUS.ERROR,
        error: {
          code: ERROR_CODE.UNKNOWN,
          message: ERROR_MESSAGE[ERROR_CODE.UNKNOWN],
        },
        createdAt: expect.any(Number),
      });

      errSpy.mockRestore();
    });

    it('should stop executing remaining hooks after one throws', async () => {
      const router = createMockRouter();
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const afterThrow = vi.fn();

      router.use(() => {
        throw new Error('Failure');
      });
      router.use(afterThrow);

      const req = { id: '1', name: 'test' } as IRPCRequest;
      await router['resolveHooks'](req);

      expect(afterThrow).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });

    it('should return error response when async hook rejects', async () => {
      const router = createMockRouter();
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      router.use(async () => {
        throw new Error('Async failure');
      });

      const req = { id: '1', name: 'test' } as IRPCRequest;
      const result = await router['resolveHooks'](req);

      expect(result).toEqual(
        expect.objectContaining({
          type: IRPC_PACKET_TYPE.CLOSE,
          status: IRPC_STATUS.ERROR,
        })
      );

      errSpy.mockRestore();
    });

    it('should return undefined when no hooks are registered', async () => {
      const router = createMockRouter();
      const req = { id: '1', name: 'test' } as IRPCRequest;

      const result = await router['resolveHooks'](req);
      expect(result).toBeUndefined();
    });
  });

  describe('isolate', () => {
    it('should return the handler result', async () => {
      const router = createMockRouter();
      const controller = new AbortController();

      const result = await router.isolate(() => 'hello', controller);

      expect(result).toBe('hello');
    });

    it('should return the async handler result', async () => {
      const router = createMockRouter();
      const controller = new AbortController();

      const result = await router.isolate(async () => 42, controller);

      expect(result).toBe(42);
    });

    it('should execute all hooks before the handler', async () => {
      const router = createMockRouter();
      const controller = new AbortController();
      const order: string[] = [];

      router.use(() => {
        order.push('hook-1');
      });
      router.use(async () => {
        order.push('hook-2');
      });

      await router.isolate(
        () => {
          order.push('handler');
        },
        controller
      );

      expect(order).toEqual(['hook-1', 'hook-2', 'handler']);
    });

    it('should propagate handler errors', async () => {
      const router = createMockRouter();
      const controller = new AbortController();

      await expect(
        router.isolate(() => {
          throw new Error('handler-boom');
        }, controller)
      ).rejects.toThrow('handler-boom');
    });

    it('should accept custom context entries', async () => {
      const router = createMockRouter();
      const controller = new AbortController();
      const customKey = Symbol('custom');

      const result = await router.isolate(
        () => 'ok',
        controller,
        [[customKey, 'custom-value']]
      );

      expect(result).toBe('ok');
    });

    it('should default context to empty array', async () => {
      const router = createMockRouter();
      const controller = new AbortController();

      const result = await router.isolate(() => 'default-ctx', controller);

      expect(result).toBe('default-ctx');
    });

    it('should execute preHook before router hooks (line 66)', async () => {
      const router = createMockRouter();
      const controller = new AbortController();
      const order: string[] = [];

      router.use(() => {
        order.push('hook');
      });

      const preHook = () => {
        order.push('preHook');
      };

      await router.isolate(
        () => {
          order.push('handler');
        },
        controller,
        [],
        preHook
      );

      expect(order).toEqual(['preHook', 'hook', 'handler']);
    });
  });
});
