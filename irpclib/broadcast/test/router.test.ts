import '@irpclib/irpc/server';
import { createPackage, IRPC_STATUS, IRPC_STORE } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BroadcastTransport } from '../src/index.js';
import { BroadcastRouter } from '../src/router.js';

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
      expect(router.hooks).toEqual([]);
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

      expect(router.hooks).toContain(middleware);
      expect(result).toBe(router);
    });

    it('should safely ignore non-function middleware entities gracefully', async () => {
      errSpy = vi.spyOn(IRPC_STORE, 'error').mockImplementation(() => {});
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      const router = new BroadcastRouter(module, transport);

      router.use('invalid_middleware' as any);

      await router.resolve([{ id: '1', name: 'testFunc', args: [] }]);

      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
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

    it('should resolve requests containing inline blobs and recreate files automatically safely', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      const router = new BroadcastRouter(module, transport);

      type TestFunc = (file: any) => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' });
      const handler: TestFunc = async (file) => file.meta.name;
      module.construct(testFunc, handler);

      const filePointer = {
        id: 'file-123',
        type: 'IRPC_PACKET_FILE',
        meta: { name: 'blob.txt', size: 12, type: 'text/plain', lastModified: 0 },
      };
      const blob = new Blob(['blob content'], { type: 'text/plain' });
      const requests = [
        {
          id: '1',
          name: 'testFunc',
          args: [filePointer],
          files: [filePointer],
          blobs: { 'file-123': blob },
        },
      ];
      await router.resolve(requests as any);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockChannel.postMessage).toHaveBeenCalled();
      const response = mockChannel.postMessage.mock.calls[0][0];
      expect(response.data).toBe('blob.txt');
      expect(response.status).toBe(IRPC_STATUS.SUCCESS);
    });

    it('should handle middleware errors', async () => {
      errSpy = vi.spyOn(IRPC_STORE, 'error').mockImplementation(() => {});
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
      errSpy.mockRestore();
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

    it('should correctly intercept target CANCEL stream envelopes proactively gracefully', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      const router = new BroadcastRouter(module, transport);

      const abortSpy = vi.fn();
      router['abortControllers'].set('2', { abort: abortSpy } as any);

      const message = { id: '2', type: 'cancel' }; // BC_MESSAGE_TYPE.CANCEL natively maps to 'cancel'
      await router['handleMessage']({ data: message } as any);

      expect(abortSpy).toHaveBeenCalled();
      expect(router['abortControllers'].has('2')).toBe(false);
    });

    it('should correctly abort running stream configurations when evaluating late specification ttl bounds explicitly naturally', async () => {
      vi.useFakeTimers();

      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      const router = new BroadcastRouter(module, transport);

      type TestFunc = () => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testTtl', stream: true, ttl: 50 } as any);
      module.construct(testFunc, async () => new Promise(() => {}));

      const requests = [{ id: '1', name: 'testTtl', args: [] }];
      router.resolve(requests);

      // Fast forward to implicitly cause internal cancellation asynchronously
      await vi.advanceTimersByTimeAsync(60);

      // Verify the stream correctly bounded itself off natively
      const controller = router['abortControllers'].get('1');
      expect(controller?.signal.aborted).toBe(true);

      vi.useRealTimers();
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
