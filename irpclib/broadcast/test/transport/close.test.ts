import { createPackage, IRPC_PACKET_TYPE, IRPC_STATUS, IRPC_STORE } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BroadcastTransport } from '../../src/index.js';
import { createMockBroadcastChannel } from './helper.js';

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
type AnyType = any;

describe('BroadcastTransport Close & Error Handling', () => {
  let mockChannel: AnyType;

  beforeEach(() => {
    mockChannel = createMockBroadcastChannel();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('close', () => {
    it('should close BroadcastChannel', () => {
      const transport = new BroadcastTransport({ channel: 'test-channel' });

      transport.close();

      expect(mockChannel.close).toHaveBeenCalled();
    });

    it('should safely call close multiple times idempotently', () => {
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      transport.close();
      expect(() => transport.close()).not.toThrow();
    });

    it('should reject pending calls on close', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      module.use(transport);

      type TestFunc = () => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' } as any);

      const promise = testFunc();
      promise.catch(() => {});

      await new Promise((resolve) => setTimeout(resolve, 10));

      transport.close();

      await expect(promise).rejects.toThrow('BroadcastChannel connection closed.');
    });

    it('should send CANCEL message natively identifying target streams if openly connected explicitly', () => {
      const transport = new BroadcastTransport({ channel: 'test-channel' });

      const call = { id: 'call-1', payload: { name: 'test-func' } } as AnyType;
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

      const call = { id: 'call-2', payload: { name: 'test-func-2' } } as AnyType;
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

      const invalidEvent = {
        data: null,
      };

      vi.spyOn(transport as AnyType, 'isResponse').mockImplementation(() => {
        throw new Error('Parse error');
      });

      mockChannel.onmessage(invalidEvent);

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should warn when receiving response for unknown call', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const transport = new BroadcastTransport({ channel: 'test-channel' });

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
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' } as any);

      transport.close();

      const promise = testFunc();
      promise.catch(() => {});

      await expect(promise).rejects.toThrow('BroadcastChannel is not connected.');
    });

    it('should handle postMessage errors', async () => {
      const module = createPackage({ name: 'test', version: '1.0.0' });
      const transport = new BroadcastTransport({ channel: 'test-channel' });
      module.use(transport);

      type TestFunc = () => Promise<string>;
      const testFunc = module.declare<TestFunc>({ name: 'testFunc' } as any);

      mockChannel.postMessage.mockImplementation(() => {
        throw new Error('postMessage failed');
      });

      const promise = testFunc();
      promise.catch(() => {});

      await expect(promise).rejects.toThrow('postMessage failed');
    });
  });
});
