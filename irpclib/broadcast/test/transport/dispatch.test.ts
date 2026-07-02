import { createPackage, IRPC_PACKET_TYPE, IRPC_STATUS, IRPCFile } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BroadcastTransport } from '../../src/index.js';
import { createMockBroadcastChannel } from './helper.js';

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
type AnyType = any;

describe('BroadcastTransport Dispatch & Response Handling', () => {
  let mockChannel: AnyType;

  beforeEach(() => {
    mockChannel = createMockBroadcastChannel();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('dispatch', () => {
    it('should send requests via BroadcastChannel', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      module.use(transport);

      type TestFunc = () => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' });

      testFunc().catch(() => {});

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockChannel.postMessage).toHaveBeenCalled();
      const sentData = mockChannel.postMessage.mock.calls[0][0];
      expect(sentData.call).toBeDefined();
      expect(sentData.call.name).toBe('testFunc');
      expect(sentData.credentials).toBeDefined();
    });

    it('should batch multiple calls', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel', debounce: 10 });
      module.use(transport);

      type TestFunc = (arg: string) => Promise<string>;
      const func1 = module.declare<TestFunc>({ name: 'func1' });
      const func2 = module.declare<TestFunc>({ name: 'func2' });

      func1('test1').catch(() => {});
      func2('test2').catch(() => {});

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(mockChannel.postMessage).toHaveBeenCalled();
      const sentData = mockChannel.postMessage.mock.calls[0][0];
      expect(sentData.call).toBeDefined();
      expect(sentData.credentials).toBeDefined();
    });

    it('should dispatch call with files attaching blobs natively', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      module.use(transport);

      type TestFunc = (file: AnyType) => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'fileUpload' });

      const blob = new Blob(['test data'], { type: 'text/plain' });
      const file = new IRPCFile({ name: 'test.txt', size: 9, type: 'text/plain' }, blob);
      testFunc(file).catch(() => {});

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockChannel.postMessage).toHaveBeenCalled();
      const sentData = mockChannel.postMessage.mock.calls[0][0];
      expect(sentData.call).toBeDefined();
      expect(sentData.call.name).toBe('fileUpload');
      expect(sentData.call.blobs).toBeDefined();
      expect(Object.keys(sentData.call.blobs).length).toBe(1);
    });
  });

  describe('response handling', () => {
    it('should resolve pending calls on response', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      module.use(transport);

      type TestFunc = () => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' });

      const promise = testFunc();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const sentData = mockChannel.postMessage.mock.calls[0][0];
      const requestId = sentData.call.id;

      mockChannel.onmessage({
        data: {
          id: requestId,
          type: IRPC_PACKET_TYPE.ANSWER,
          status: IRPC_STATUS.SUCCESS,
          data: 'Hello World',
        },
      });

      const result = await promise;
      expect(result).toBe('Hello World');
    });

    it('should reject pending calls on error response', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      module.use(transport);

      type TestFunc = () => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' });

      const promise = testFunc();
      promise.catch(() => {});

      await new Promise((resolve) => setTimeout(resolve, 10));

      const sentData = mockChannel.postMessage.mock.calls[0][0];
      const requestId = sentData.call.id;

      mockChannel.onmessage({
        data: {
          id: requestId,
          type: IRPC_PACKET_TYPE.ANSWER,
          status: IRPC_STATUS.ERROR,
          error: {
            code: 500,
            message: 'Test error',
          },
        },
      });

      await expect(promise).rejects.toThrow('Test error');
    });
  });
});
