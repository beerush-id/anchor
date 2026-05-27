import { createPackage, IRPC_PACKET_TYPE, IRPC_STATUS, IRPC_STORE, IRPCFile } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BroadcastTransport } from '../src/index.js';

describe('BroadcastTransport', () => {
  let mockChannel: any;

  beforeEach(() => {
    // Mock BroadcastChannel
    mockChannel = {
      postMessage: vi.fn(),
      close: vi.fn(),
      onmessage: null,
    };

    global.BroadcastChannel = vi.fn().mockImplementation(() => mockChannel);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create transport with channel name mapping', () => {
      const transport = new BroadcastTransport({ channel: 'my-api' });

      expect(transport.endpoint).toBe('irpc://my-api');
      expect(global.BroadcastChannel).toHaveBeenCalledWith('irpc://my-api');
    });

    it('should setup message listener', () => {
      const transport = new BroadcastTransport({ channel: 'my-api' });

      (transport as any).connect();

      expect(mockChannel.onmessage).toBeDefined();
      expect(typeof mockChannel.onmessage).toBe('function');
    });
  });

  describe('endpoint', () => {
    it('should return namespaced channel name', () => {
      const transport = new BroadcastTransport({ channel: 'test-channel' });

      expect(transport.endpoint).toBe('irpc://test-channel');
    });

    it('should prefix different channel names correctly', () => {
      const transport1 = new BroadcastTransport({ channel: 'api-v1' });
      const transport2 = new BroadcastTransport({ channel: 'api-v2' });

      expect(transport1.endpoint).toBe('irpc://api-v1');
      expect(transport2.endpoint).toBe('irpc://api-v2');
    });
  });

  describe('dispatch', () => {
    it('should send requests via BroadcastChannel', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      module.use(transport);

      type TestFunc = () => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' });

      // Call the function (don't await to avoid timeout)
      testFunc().catch(() => {});

      // Wait for dispatch
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

      // Call multiple functions
      func1('test1').catch(() => {});
      func2('test2').catch(() => {});

      // Wait for batching
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

      type TestFunc = (file: any) => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'fileUpload' });

      // Call the function with a file
      const blob = new Blob(['test data'], { type: 'text/plain' });
      const file = new IRPCFile({ name: 'test.txt', size: 9, type: 'text/plain' }, blob);
      testFunc(file).catch(() => {});

      // Wait for dispatch
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

      // Call the function
      const promise = testFunc();

      // Wait for dispatch
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Simulate response
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

      // Call the function
      const promise = testFunc();
      promise.catch(() => {});

      // Wait for dispatch
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Simulate error response
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

  describe('close', () => {
    it('should close BroadcastChannel', () => {
      const transport = new BroadcastTransport({ channel: 'test-channel' });

      transport.close();

      expect(mockChannel.close).toHaveBeenCalled();
    });

    it('should reject pending calls on close', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      module.use(transport);

      type TestFunc = () => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' });

      // Call the function
      const promise = testFunc();
      promise.catch(() => {});

      // Wait for dispatch
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Close transport
      transport.close();

      await expect(promise).rejects.toThrow('BroadcastChannel connection closed.');
    });

    it('should send CANCEL message natively identifying target streams if openly connected explicitly', () => {
      const transport = new BroadcastTransport({ channel: 'test-channel' });

      const call = { id: 'call-1', payload: { name: 'test-func' } } as any;
      transport['pendingCalls'].set('call-1', call);

      transport.close(call);

      expect(mockChannel.postMessage).toHaveBeenCalled();
      const packet = mockChannel.postMessage.mock.calls[0][0];

      expect(packet.call.id).toBe('call-1');
      expect(packet.call.name).toBe('test-func');
      expect(packet.call.type).toBe('cancel');
      expect(packet.credentials).toBeDefined();

      expect(transport['pendingCalls'].has('call-1')).toBe(false);
    });

    it('should quietly delete tracking mappings exclusively offline safely if close is requested implicitly safely', () => {
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      transport['channel'] = undefined;

      const call = { id: 'call-2', payload: { name: 'test-func-2' } } as any;
      transport['pendingCalls'].set('call-2', call);

      transport.close(call);

      expect(mockChannel.postMessage).not.toHaveBeenCalled();
      expect(transport['pendingCalls'].has('call-2')).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle message parsing errors', () => {
      const consoleErrorSpy = vi.spyOn(IRPC_STORE, 'error').mockImplementation(() => {});
      const transport = new BroadcastTransport({ channel: 'test-channel' });

      // Simulate an error by passing invalid data that will fail during processing
      // The try-catch in handleMessage will catch this
      const invalidEvent = {
        data: null,
      };

      // Spy on isResponse to throw an error
      vi.spyOn(transport as any, 'isResponse').mockImplementation(() => {
        throw new Error('Parse error');
      });

      mockChannel.onmessage(invalidEvent);

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should warn when receiving response for unknown call', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const transport = new BroadcastTransport({ channel: 'test-channel' });

      // Simulate response for non-existent call
      mockChannel.onmessage({
        data: {
          id: 'unknown-call-id',
          type: IRPC_PACKET_TYPE.ANSWER,
          status: IRPC_STATUS.SUCCESS,
          data: 'test',
        },
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith('Received response for unknown call:', 'unknown-call-id');

      consoleWarnSpy.mockRestore();
    });

    it('should reject calls when channel is not available', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      module.use(transport);

      type TestFunc = () => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' });

      // Close channel first
      transport.close();

      // Try to call function without channel
      const promise = testFunc();
      promise.catch(() => {}); // Silence console trace

      await expect(promise).rejects.toThrow('BroadcastChannel is not connected.');
    });

    it('should handle postMessage errors', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      module.use(transport);

      type TestFunc = () => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' });

      // Make postMessage throw
      mockChannel.postMessage.mockImplementation(() => {
        throw new Error('postMessage failed');
      });

      // Call function
      const promise = testFunc();
      promise.catch(() => {});

      await expect(promise).rejects.toThrow('postMessage failed');
    });
  });
});
