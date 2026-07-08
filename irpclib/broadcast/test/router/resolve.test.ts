import { createPackage, IRPC_STATUS, IRPC_STORE } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BroadcastTransport } from '../../src/index.js';
import { BroadcastRouter } from '../../src/router.js';
import { createMockBroadcastChannel } from './helper.js';

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
type AnyType = any;

describe('BroadcastRouter Resolve & Handling', () => {
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

  describe('resolve', () => {
    it('should process requests and send response', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      module.use(transport);

      const router = new BroadcastRouter(module, transport);

      type TestFunc = (input: { name: string }) => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' } as AnyType);
      const handler: TestFunc = async (input) => `Hello ${input.name}`;
      module.construct(testFunc, handler);

      const request = { id: '1', name: 'testFunc', args: [{ name: 'World' }] };
      await router.resolve(request as AnyType);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockChannel.postMessage).toHaveBeenCalled();
      const response = mockChannel.postMessage.mock.calls[0][0];
      expect(response.data).toBe('Hello World');
      expect(response.status).toBe(IRPC_STATUS.SUCCESS);
    });

    it('should resolve requests containing inline blobs and recreate files automatically safely', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      module.use(transport);

      const router = new BroadcastRouter(module, transport);

      type TestFunc = (file: AnyType) => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' } as AnyType);
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
      await router.resolve(requests[0] as AnyType);

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
      module.use(transport);

      const router = new BroadcastRouter(module, transport);

      const middleware = vi.fn().mockImplementation(async () => {
        throw new Error('Middleware error');
      });
      router.use(middleware);

      const request = { id: '1', name: 'testFunc', args: [] };

      await router.resolve(request as AnyType);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(errSpy).toHaveBeenCalled();
      expect(mockChannel.postMessage).toHaveBeenCalled();
      errSpy.mockRestore();
    });

    it('should execute valid middleware and cleanly proceed to route resolution', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      module.use(transport);

      const router = new BroadcastRouter(module, transport);

      const validMiddleware = vi.fn().mockResolvedValue(undefined);
      router.use(validMiddleware);

      type TestFunc = (input: { name: string }) => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' } as AnyType);
      module.construct(testFunc, async () => `Hello!`);

      const request = { id: '1', name: 'testFunc', args: [] };

      await router.resolve(request as AnyType);

      expect(validMiddleware).toHaveBeenCalled();
      expect(mockChannel.postMessage).toHaveBeenCalled();
    });

    it('should not process if channel is closed', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      module.use(transport);

      const router = new BroadcastRouter(module, transport);

      router.close();
    });

    it('should correctly intercept target CANCEL stream envelopes proactively gracefully', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      module.use(transport);

      const router = new BroadcastRouter(module, transport);

      const abortSpy = vi.fn();
      router['abortControllers'].set('2', { abort: abortSpy } as AnyType);

      const message = { call: { id: '2', type: 'cancel' }, credentials: [] };
      await router['handleMessage']({ data: message } as AnyType);

      expect(abortSpy).toHaveBeenCalled();
      expect(router['abortControllers'].has('2')).toBe(false);
    });

    it('should correctly abort running stream configurations when evaluating late specification ttl bounds explicitly naturally', async () => {
      vi.useFakeTimers();

      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      module.use(transport);

      const router = new BroadcastRouter(module, transport);

      type TestFunc = () => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testTtl', stream: true, ttl: 50 } as AnyType);
      module.construct(testFunc, async () => new Promise(() => {}));

      const request = { id: '1', name: 'testTtl', args: [] };
      router.resolve(request as AnyType);

      await vi.advanceTimersByTimeAsync(60);

      const controller = router['abortControllers'].get('1');
      expect(controller?.signal.aborted).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('close', () => {
    it('should close the BroadcastChannel', () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      module.use(transport);

      const router = new BroadcastRouter(module, transport);

      router.close();

      expect(mockChannel.close).toHaveBeenCalled();
    });
  });

  describe('handleMessage', () => {
    it('should handle incoming request messages', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      module.use(transport);

      const router = new BroadcastRouter(module, transport);

      type TestFunc = () => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' } as AnyType);
      module.construct(testFunc, async () => 'test result');

      const request = { call: { id: '1', name: 'testFunc', args: [] }, credentials: [] };
      mockChannel.onmessage({ data: request });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockChannel.postMessage).toHaveBeenCalled();
    });

    it('should ignore messages without call property', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      module.use(transport);

      const router = new BroadcastRouter(module, transport);

      mockChannel.onmessage({ data: { not: 'a call' } });
      mockChannel.onmessage({ data: 'string' });
      mockChannel.onmessage({ data: null });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockChannel.postMessage).not.toHaveBeenCalled();
    });
  });
});
