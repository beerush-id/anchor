import { createPackage } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BroadcastTransport } from '../src/transport.js';
import { BroadcastRouter } from '../src/router.js';
import { IRPC_STATUS } from '@irpclib/irpc';

describe('BroadcastRouter', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;
  let mockChannel: any;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock BroadcastChannel
    mockChannel = {
      postMessage: vi.fn(),
      close: vi.fn(),
      onmessage: null,
    };

    global.BroadcastChannel = vi.fn().mockImplementation(() => mockChannel);
  });

  afterEach(() => {
    errSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create router with module and transport', () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });

      const router = new BroadcastRouter(module, transport);

      expect(router.module).toBe(module);
      expect(router.transport).toBe(transport);
      expect(router.middlewares).toEqual([]);
      expect(router.config.endpoint).toBe('irpc://test-channel');
      expect(router.endpoint).toBeDefined();
    });

    it('should create router with custom config', () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
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

      new BroadcastRouter(module, transport);

      expect(global.BroadcastChannel).toHaveBeenCalledWith('irpc://test-channel');
    });
  });

  describe('use', () => {
    it('should add middleware', () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      const router = new BroadcastRouter(module, transport);

      const middleware = async () => undefined;

      const result = router.use(middleware);

      expect(router.middlewares).toContain(middleware);
      expect(result).toBe(router);
    });

    it('should safely ignore non-function middleware entities gracefully', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      const router = new BroadcastRouter(module, transport);

      router.use('invalid_middleware' as any);
      
      await router.resolve([{ id: '1', name: 'testFunc', args: [] }]); 

      expect(errSpy).not.toHaveBeenCalled();
    });
  });

  describe('resolve', () => {
    it('should process requests and send response', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      const router = new BroadcastRouter(module, transport);

      type TestFunc = (input: { name: string }) => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' });
      const handler: TestFunc = async (input) => `Hello ${input.name}`;
      module.construct(testFunc, handler);

      const requests = [{ id: '1', name: 'testFunc', args: [{ name: 'World' }] }];
      await router.resolve(requests);

      // Wait for async resolution
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockChannel.postMessage).toHaveBeenCalled();
      const response = mockChannel.postMessage.mock.calls[0][0];
      expect(response.data).toBe('Hello World');
      expect(response.status).toBe(IRPC_STATUS.SUCCESS);
    });

    it('should handle middleware errors', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      const router = new BroadcastRouter(module, transport);

      const middleware = vi.fn().mockImplementation(async () => {
        throw new Error('Middleware error');
      });
      router.use(middleware);

      const requests = [{ id: '1', name: 'testFunc', args: [] }];

      await router.resolve(requests);

      // Wait for async resolution
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errSpy).toHaveBeenCalled();
      expect(mockChannel.postMessage).toHaveBeenCalled();
    });

    it('should execute valid middleware and cleanly proceed to route resolution', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      const router = new BroadcastRouter(module, transport);

      const validMiddleware = vi.fn().mockResolvedValue(undefined);
      router.use(validMiddleware);

      type TestFunc = (input: { name: string }) => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' });
      module.construct(testFunc, async () => `Hello!`);

      const requests = [{ id: '1', name: 'testFunc', args: [] }];

      await router.resolve(requests);

      expect(validMiddleware).toHaveBeenCalled();
      expect(mockChannel.postMessage).toHaveBeenCalled();
    });

    it('should not process empty requests', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      const router = new BroadcastRouter(module, transport);

      await router.resolve([]);

      expect(mockChannel.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should close the BroadcastChannel', () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      const router = new BroadcastRouter(module, transport);

      router.close();

      expect(mockChannel.close).toHaveBeenCalled();
    });
  });

  describe('handleMessage', () => {
    it('should handle incoming request messages', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      const router = new BroadcastRouter(module, transport);

      type TestFunc = () => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' });
      module.construct(testFunc, async () => 'test result');

      // Simulate incoming message via onmessage
      const requests = [{ id: '1', name: 'testFunc', args: [] }];
      mockChannel.onmessage({ data: requests });

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockChannel.postMessage).toHaveBeenCalled();
    });

    it('should ignore non-array messages', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      const router = new BroadcastRouter(module, transport);

      // Simulate non-array message
      mockChannel.onmessage({ data: { not: 'an array' } });
      mockChannel.onmessage({ data: 'string' });
      mockChannel.onmessage({ data: null });

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should not process these messages
      expect(mockChannel.postMessage).not.toHaveBeenCalled();
    });
  });
});
