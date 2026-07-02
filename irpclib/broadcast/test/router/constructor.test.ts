import '@irpclib/irpc/server';
import { createPackage, IRPC_STORE } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BroadcastTransport } from '../../src/index.js';
import { BroadcastRouter } from '../../src/router.js';
import { createMockBroadcastChannel } from './helper.js';

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
type AnyType = any;

describe('BroadcastRouter Constructor & Use', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;
  let mockChannel: AnyType;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockChannel = createMockBroadcastChannel();
  });

  afterEach(() => {
    errSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create router with module and transport', () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      module.use(transport);

      const router = new BroadcastRouter(module, transport);

      expect(router.module).toBe(module);
      expect(router.transport).toBe(transport);
      expect(router.hooks).toEqual([]);
      expect(router.config.endpoint).toBe('irpc://test-channel');
      expect(router.endpoint).toBeDefined();
    });

    it('should create router with custom config', () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      module.use(transport);

      const customResolver = vi.fn();

      const router = new BroadcastRouter(module, transport, {
        endpoint: 'irpc://custom',
        resolver: customResolver,
      });

      expect(router.config.endpoint).toBe('irpc://custom');
      expect(router.config.resolver).toBe(customResolver);
    });

    it('should setup BroadcastChannel listener', () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      module.use(transport);

      new BroadcastRouter(module, transport);

      expect(global.BroadcastChannel).toHaveBeenCalledWith('irpc://test-channel');
    });
  });

  describe('use', () => {
    it('should add middleware', () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      module.use(transport);

      const router = new BroadcastRouter(module, transport);

      const middleware = async () => undefined;

      const result = router.use(middleware);

      expect(router.hooks).toContain(middleware);
      expect(result).toBe(router);
    });

    it('should safely ignore non-function middleware entities gracefully', async () => {
      errSpy = vi.spyOn(IRPC_STORE, 'error').mockImplementation(() => {});
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      module.use(transport);

      const router = new BroadcastRouter(module, transport);

      router.use('invalid_middleware' as AnyType);

      await router.resolve({ id: '1', name: 'testFunc', args: [] } as AnyType);

      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });
});
