import { createPackage } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocketTransport } from '../src/index.js';
import { WebSocketRouter } from '../src/router.js';

// Mock WebSocketTransport
vi.mock('../src/transport.js', () => {
  return {
    WebSocketTransport: vi.fn().mockImplementation(() => ({
      endpoint: 'ws://localhost:8080',
    })),
  };
});

describe('WebSocketRouter', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create router with module and transport', () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });

      const router = new WebSocketRouter(module, transport);

      expect(router.module).toBe(module);
      expect(router.transport).toBe(transport);
      expect(router.middlewares).toEqual([]);
      expect(router.config.endpoint).toBe('ws://localhost:8080');
      expect(router.endpoint).toBeDefined();
    });

    it('should create router with custom config', () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const customResolver = vi.fn();

      const router = new WebSocketRouter(module, transport, {
        endpoint: 'ws://custom',
        resolver: customResolver,
      });

      expect(router.config.endpoint).toBe('ws://custom');
      expect(router.config.resolver).toBe(customResolver);
    });
  });

  describe('use', () => {
    it('should add middleware', () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const router = new WebSocketRouter(module, transport);

      const middleware = async () => undefined;

      const result = router.use(middleware);

      expect(router.middlewares).toContain(middleware);
      expect(result).toBe(router);
    });

    it('should safely ignore non-function middleware entities gracefully', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const router = new WebSocketRouter(module, transport);

      router.use('invalid_middleware' as any);

      const ws = { readyState: 1, send: vi.fn() } as any;
      await router.resolve(JSON.stringify([{ id: '1', name: 'testFunc', args: [] }]), ws);

      expect(errSpy).not.toHaveBeenCalled();
    });
  });

  describe('resolve', () => {
    it('should process requests and send response', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const router = new WebSocketRouter(module, transport);

      type TestFunc = (input: { name: string }) => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' });
      const handler: TestFunc = async (input) => `Hello ${input.name}`;
      module.construct(testFunc, handler);

      const ws = {
        readyState: 1, // OPEN
        send: vi.fn().mockImplementation((message) => {
          expect(message.includes('"data":"Hello World"')).toBe(true);
        }),
      } as any;

      const message = JSON.stringify([{ id: '1', name: 'testFunc', args: [{ name: 'World' }] }]);
      await router.resolve(message, ws, {} as never);
    });

    it('should handle middleware errors', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const router = new WebSocketRouter(module, transport);

      const middleware = vi.fn().mockImplementation(async () => {
        throw new Error('Middleware error');
      });
      router.use(middleware);

      const ws = {
        readyState: 1, // OPEN
        send: vi.fn(),
      } as any;

      const message = JSON.stringify({ id: '1', name: 'testFunc', args: [] });

      await router.resolve(message, ws);

      expect(errSpy).toHaveBeenCalled();
    });

    it('should execute valid middleware and cleanly proceed to route resolution', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const router = new WebSocketRouter(module, transport);

      const validMiddleware = vi.fn().mockResolvedValue(undefined);
      router.use(validMiddleware);

      type TestFunc = (input: { name: string }) => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' });
      module.construct(testFunc, async () => `Hello!`);

      const ws = { readyState: 1, send: vi.fn() } as any;
      const message = JSON.stringify([{ id: '1', name: 'testFunc', args: [] }]);

      await router.resolve(message, ws);

      expect(validMiddleware).toHaveBeenCalled();
      expect(ws.send).toHaveBeenCalled();
    });

    it('should not send if ws is not open', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const router = new WebSocketRouter(module, transport);

      const ws = {
        readyState: 2, // CLOSING
        send: vi.fn(),
      } as any;

      await router.resolve('[]', ws);

      expect(ws.send).not.toHaveBeenCalled();
    });

    it('should correctly abort running stream configurations when evaluating late specification ttl bounds explicitly naturally', async () => {
      vi.useFakeTimers();

      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const router = new WebSocketRouter(module, transport);

      type TestFunc = () => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testTtl', stream: true, ttl: 50 } as any);
      module.construct(testFunc, async () => new Promise(() => {}));

      const ws = { readyState: 1, send: vi.fn() } as any;
      const message = JSON.stringify([{ id: '1', name: 'testTtl', args: [] }]);

      router.resolve(message, ws);

      // Fast forward to implicitly cause internal cancellation asynchronously
      await vi.advanceTimersByTimeAsync(60);

      // Verify the stream correctly bounded itself off natively
      const controller = router['abortControllers'].get('1');
      expect(controller?.signal.aborted).toBe(true);

      vi.useRealTimers();
    });

    it('should correctly intercept target CANCEL stream envelopes proactively gracefully', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const router = new WebSocketRouter(module, transport);

      const abortSpy = vi.fn();
      router['abortControllers'].set('2', { abort: abortSpy } as any);

      const ws = { readyState: 1, send: vi.fn() } as any;
      const message = JSON.stringify([{ id: '2', type: 'cancel' }]); // WS_MESSAGE_TYPE.CANCEL

      await router.resolve(message, ws);

      expect(abortSpy).toHaveBeenCalled();
      expect(router['abortControllers'].has('2')).toBe(false);
    });

    it('should safely swallow invalid malformed payload parsing operations explicitly quietly natively', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const router = new WebSocketRouter(module, transport);

      const ws = { readyState: 1, send: vi.fn() } as any;

      await router.resolve('{malformed json}', ws);

      expect(errSpy).toHaveBeenCalled();
      expect(ws.send).not.toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should flush and immediately clean natively evaluated target controllers functionally globally', () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const router = new WebSocketRouter(module, transport);

      const abortSpy1 = vi.fn();
      const abortSpy2 = vi.fn();

      router['abortControllers'].set('1', { abort: abortSpy1 } as any);
      router['abortControllers'].set('2', { abort: abortSpy2 } as any);

      router.disconnect();

      expect(abortSpy1).toHaveBeenCalled();
      expect(abortSpy2).toHaveBeenCalled();
      expect(router['abortControllers'].size).toBe(0);
    });
  });
});
