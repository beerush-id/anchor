import { createPackage, IRPC_STORE } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocketTransport } from '../../src/index.js';
import { WebSocketRouter } from '../../src/router.js';

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
type AnyType = any;

describe('WebSocketRouter Constructor & Use', () => {
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
      module.use(transport);

      const router = new WebSocketRouter(module, transport);

      expect(router.module).toBe(module);
      expect(router.transport).toBe(transport);
      expect(router.hooks).toEqual([]);
      expect(router.config.endpoint).toBe('ws://localhost:8080');
      expect(router.endpoint).toBeDefined();
    });

    it('should create router with custom config', () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      module.use(transport);

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
      module.use(transport);

      const router = new WebSocketRouter(module, transport);

      const middleware = async () => undefined;

      const result = router.use(middleware);

      expect(router.hooks).toContain(middleware);
      expect(result).toBe(router);
    });

    it('should safely ignore non-function middleware entities gracefully', async () => {
      errSpy = vi.spyOn(IRPC_STORE, 'error').mockImplementation(() => {});
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new WebSocketTransport({ url: 'ws://localhost:8080' });
      module.use(transport);

      const router = new WebSocketRouter(module, transport);

      router.use('invalid_middleware' as AnyType);

      const ws = { readyState: 1, send: vi.fn() } as AnyType;
      await router.resolve(JSON.stringify({ call: { id: '1', name: 'testFunc', args: [] }, credentials: [] }), ws);

      expect(errSpy).toHaveBeenCalled();
    });
  });
});
