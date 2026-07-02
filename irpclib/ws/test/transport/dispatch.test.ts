import { IRPC_PACKET_TYPE, IRPC_STATUS, IRPC_STORE, IRPCFile } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocketState, WebSocketTransport } from '../../src/index.js';
import { MockWebSocket } from './helper.js';

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
type AnyType = any;

describe('WebSocketTransport Dispatch & Resolve', () => {
  let transport: WebSocketTransport;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
    transport = new WebSocketTransport({
      url: 'ws://localhost:8080',
      autoReconnect: false,
    });
  });

  afterEach(() => {
    errSpy.mockRestore();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('dispatch', () => {
    it('should connect if not open', async () => {
      transport = new WebSocketTransport({ url: 'ws://localhost:8080' });

      const connectSpy = vi.spyOn(transport as AnyType, 'connect').mockImplementation(async () => {
        Object.defineProperty(transport, 'isOpen', { get: () => true });
        transport['ws'] = { send: vi.fn() } as AnyType;
      });

      const call = { id: '1', payload: { name: 'test', args: [] }, reject: vi.fn() } as AnyType;

      await transport['dispatch']([call]);

      expect(connectSpy).toHaveBeenCalled();
    });

    it('should reject calls if connection fails', async () => {
      transport = new WebSocketTransport({ url: 'ws://localhost:8080' });

      vi.spyOn(transport as AnyType, 'connect').mockRejectedValue(new Error('Connection failed'));
      const call = { id: '1', payload: { name: 'test', args: [] }, enqueue: vi.fn() } as AnyType;

      await transport['dispatch']([call]);

      expect(call.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: IRPC_PACKET_TYPE.CLOSE,
          status: IRPC_STATUS.ERROR,
          error: expect.objectContaining({ message: 'Connection failed' }),
        })
      );
    });

    it('should reject calls if state is CLOSING', async () => {
      transport = new WebSocketTransport({ url: 'ws://localhost:8080' });

      Object.defineProperty(transport, 'state', { get: () => WebSocketState.CLOSING });
      const call = { id: '1', payload: { name: 'test', args: [] }, enqueue: vi.fn() } as AnyType;

      await transport['dispatch']([call]);

      expect(call.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: IRPC_PACKET_TYPE.CLOSE,
          status: IRPC_STATUS.ERROR,
          error: expect.objectContaining({ message: 'WebSocket is not connected.' }),
        })
      );
    });

    it('should reject calls if state is CLOSED and autoReconnect is false', async () => {
      transport = new WebSocketTransport({ url: 'ws://localhost:8080' });

      transport.config.autoReconnect = false;
      Object.defineProperty(transport, 'state', { get: () => WebSocketState.CLOSED });
      const call = { id: '1', payload: { name: 'test', args: [] }, enqueue: vi.fn() } as AnyType;

      await transport['dispatch']([call]);

      expect(call.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: IRPC_PACKET_TYPE.CLOSE,
          status: IRPC_STATUS.ERROR,
          error: expect.objectContaining({ message: 'WebSocket is not connected.' }),
        })
      );
    });

    it('should reject calls if pending connection fails', async () => {
      const error = new Error('Connection failed');
      const pendingConnection = Promise.reject(error);
      pendingConnection.catch(() => {});

      transport['pendingConnection'] = pendingConnection;
      Object.defineProperty(transport, 'state', { get: () => WebSocketState.CONNECTING });

      const call = { id: '1', payload: { name: 'test', args: [] }, enqueue: vi.fn() } as AnyType;

      await transport['dispatch']([call]);

      expect(call.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: IRPC_PACKET_TYPE.CLOSE,
          status: IRPC_STATUS.ERROR,
          error: expect.objectContaining({ message: error.message }),
        })
      );
    });

    it('should wait for pending connection', async () => {
      let resolveConnect: () => void;
      const pendingConnection = new Promise<void>((resolve) => {
        resolveConnect = resolve;
      });
      transport['pendingConnection'] = pendingConnection;

      Object.defineProperty(transport, 'state', { get: () => WebSocketState.CONNECTING });

      const call = { id: '1', payload: { name: 'test', args: [] }, reject: vi.fn() } as AnyType;

      const dispatchPromise = transport['dispatch']([call]);

      Object.defineProperty(transport, 'isOpen', { get: () => true });
      transport['ws'] = { send: vi.fn() } as AnyType;

      resolveConnect!();
      await dispatchPromise;

      expect(transport['ws']?.send).toHaveBeenCalled();
    });

    it('should send message if open', async () => {
      Object.defineProperty(transport, 'state', { get: () => WebSocketState.OPEN });
      const mockSend = vi.fn();
      transport['ws'] = { send: mockSend } as AnyType;

      const call = { id: '1', payload: { name: 'test', args: [] }, reject: vi.fn() } as AnyType;

      await transport['dispatch']([call]);

      const parsed = JSON.parse(mockSend.mock.calls[0][0]);
      expect(parsed.call).toEqual({ id: '1', name: 'test', args: [] });
      expect(parsed.credentials).toBeDefined();
      expect(transport['pendingCalls'].has('1')).toBe(true);
    });

    it('should reject calls if send fails', async () => {
      Object.defineProperty(transport, 'state', { get: () => WebSocketState.OPEN });
      const mockSend = vi.fn().mockImplementation(() => {
        throw new Error('Send failed');
      });
      transport['ws'] = { send: mockSend } as AnyType;

      const call = { id: '1', payload: { name: 'test', args: [] }, enqueue: vi.fn() } as AnyType;

      await transport['dispatch']([call]);

      expect(call.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: IRPC_PACKET_TYPE.CLOSE,
          status: IRPC_STATUS.ERROR,
          error: expect.objectContaining({ message: 'Send failed' }),
        })
      );
    });

    it('should correctly stream file binaries natively prioritizing framing ahead of enveloping gracefully', async () => {
      Object.defineProperty(transport, 'state', { get: () => WebSocketState.OPEN });
      const mockSend = vi.fn();
      transport['ws'] = { send: mockSend } as AnyType;

      const file = new IRPCFile({ type: 'text/plain', name: 'test.txt', size: 5 }, new Blob(['hello']));

      const call = { id: 'file-call', payload: { name: 'testFiles', args: [file] }, enqueue: vi.fn() } as AnyType;

      await transport['dispatch']([call]);

      expect(mockSend).toHaveBeenCalledTimes(2);

      const firstCallArg = mockSend.mock.calls[0][0];
      const secondCallArg = mockSend.mock.calls[1][0];

      expect(firstCallArg).toBeInstanceOf(ArrayBuffer);

      expect(typeof secondCallArg).toBe('string');
      expect(secondCallArg).toContain('"id":"file-call"');
      expect(secondCallArg).toContain('"name":"testFiles"');
      expect(secondCallArg).toContain('"files"');
      expect(secondCallArg).toContain('"credentials"');

      expect(transport['pendingCalls'].has('file-call')).toBe(true);
    });
  });

  describe('resolve', () => {
    it('should resolve pending call on success response', () => {
      const call = { id: '1', enqueue: vi.fn() } as AnyType;
      transport['pendingCalls'].set('1', call);

      const event = { data: JSON.stringify({ id: '1', status: IRPC_STATUS.SUCCESS }) } as MessageEvent;
      transport['resolve'](event);

      expect(call.enqueue).toHaveBeenCalledWith(expect.objectContaining({ status: IRPC_STATUS.SUCCESS }));
      expect(transport['pendingCalls'].has('1')).toBe(false);
    });

    it('should reject pending call on error response', () => {
      const call = { id: '1', enqueue: vi.fn() } as AnyType;
      transport['pendingCalls'].set('1', call);

      const event = {
        data: JSON.stringify({ id: '1', status: IRPC_STATUS.ERROR, error: { message: 'failed' } }),
      } as MessageEvent;
      transport['resolve'](event);

      expect(call.enqueue).toHaveBeenCalledWith(expect.objectContaining({ status: IRPC_STATUS.ERROR }));
      expect(transport['pendingCalls'].has('1')).toBe(false);
    });

    it('should keep pending call when status is PENDING', () => {
      const call = { id: '1', enqueue: vi.fn() } as AnyType;
      transport['pendingCalls'].set('1', call);

      const event = { data: JSON.stringify({ id: '1', status: IRPC_STATUS.PENDING }) } as MessageEvent;
      transport['resolve'](event);

      expect(call.enqueue).toHaveBeenCalledWith(expect.objectContaining({ status: IRPC_STATUS.PENDING }));
      expect(transport['pendingCalls'].has('1')).toBe(true);
    });

    it('should ignore unknown calls', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const event = { data: JSON.stringify({ id: 'unknown', result: 'success' }) } as MessageEvent;

      transport['resolve'](event);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle invalid JSON', () => {
      const consoleSpy = vi.spyOn(IRPC_STORE, 'error').mockImplementation(() => {});
      const event = { data: 'invalid json' } as MessageEvent;

      transport['resolve'](event);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
