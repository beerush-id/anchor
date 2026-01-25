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
  });

  describe('resolve', () => {
    it('should send empty array for empty requests', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const router = new WebSocketRouter(module, transport);

      const ws = {
        readyState: 1, // OPEN
        send: vi.fn(),
      } as any;

      await router.resolve('[]', ws);

      expect(ws.send).toHaveBeenCalledWith('[]');
    });

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
          expect(message.includes('"result":"Hello World"')).toBe(true);
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

    it('should handle invalid JSON', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      const router = new WebSocketRouter(module, transport);

      const ws = {
        readyState: 1, // OPEN
        send: vi.fn(),
      } as any;

      await router.resolve('invalid json', ws);

      // Should send empty array because parsing failed and returned empty array
      expect(ws.send).toHaveBeenCalledWith('[]');
      expect(errSpy).toHaveBeenCalled();
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
  });
});
