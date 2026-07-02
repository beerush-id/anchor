import { IRPC_STATUS } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocketTransport } from '../../src/index.js';
import { MockWebSocket } from './helper.js';

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
type AnyType = any;

describe('WebSocketTransport Close & Reconnect', () => {
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

  describe('close', () => {
    it('should close connection and disable autoReconnect', () => {
      transport.config.autoReconnect = true;
      const mockClose = vi.fn();
      transport['ws'] = { close: mockClose } as AnyType;

      transport.close();

      expect(transport.config.autoReconnect).toBe(false);
      expect(mockClose).toHaveBeenCalled();
      expect(transport['ws']).toBeUndefined();
    });

    it('should do nothing if ws is not defined', () => {
      transport['ws'] = undefined;
      transport.close();
    });

    it('should send CANCEL message natively identifying target streams if openly connected explicitly', () => {
      transport['ws'] = { send: vi.fn(), close: vi.fn(), readyState: 1 } as AnyType;
      Object.defineProperty(transport, 'isOpen', { get: () => true });

      const call = { id: 'call-1', payload: { name: 'test-func' } } as AnyType;
      transport['pendingCalls'].set('call-1', call);

      transport.close(call);

      const packet = (transport['ws']?.send as AnyType).mock.calls[0][0];
      const parsed = JSON.parse(packet);
      expect(parsed.call.id).toBe('call-1');
      expect(parsed.call.name).toBe('test-func');
      expect(parsed.call.type).toBe('cancel');
      expect(parsed.credentials).toBeDefined();

      expect(transport['pendingCalls'].has('call-1')).toBe(false);
    });

    it('should quietly delete tracking mappings exclusively offline safely if close is requested implicitly safely', () => {
      transport['ws'] = { send: vi.fn(), close: vi.fn(), readyState: 3 } as AnyType;
      Object.defineProperty(transport, 'isOpen', { get: () => false });

      const call = { id: 'call-2', payload: { name: 'test-func-2' } } as AnyType;
      transport['pendingCalls'].set('call-2', call);

      transport.close(call);

      expect(transport['ws']?.send).not.toHaveBeenCalled();
      expect(transport['pendingCalls'].has('call-2')).toBe(false);
    });
  });

  describe('reconnect', () => {
    it('should close existing connection and connect again', async () => {
      const closeSpy = vi.spyOn(transport, 'close');
      const connectSpy = vi.spyOn(transport as AnyType, 'connect').mockResolvedValue(undefined);

      await transport.reconnect();

      expect(closeSpy).toHaveBeenCalled();
      expect(connectSpy).toHaveBeenCalled();
      expect(transport['reconnectAttempts']).toBe(0);
    });

    it('should handle reconnection failure and retry', async () => {
      transport.config.autoReconnect = true;
      transport.config.maxReconnectAttempts = 2;
      transport.config.reconnectDelay = 10;

      const connectSpy = vi
        .spyOn(transport as AnyType, 'connect')
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue(undefined);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (transport as AnyType).scheduleReconnect();

      vi.advanceTimersByTime(10);
      await Promise.resolve();
      expect(connectSpy).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(10);
      await Promise.resolve();
      expect(connectSpy).toHaveBeenCalledTimes(2);

      expect(transport['isReconnecting']).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should not schedule reconnect if already reconnecting', () => {
      transport['isReconnecting'] = true;
      const delaySpy = vi.spyOn(globalThis, 'setTimeout');

      (transport as AnyType).scheduleReconnect();

      expect(delaySpy).not.toHaveBeenCalled();
    });

    it('should stop retrying if autoReconnect is disabled during retry', async () => {
      transport.config.autoReconnect = true;
      transport.config.reconnectDelay = 10;

      const connectSpy = vi.spyOn(transport as AnyType, 'connect').mockRejectedValue(new Error('Fail'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (transport as AnyType).scheduleReconnect();

      vi.advanceTimersByTime(10);
      await Promise.resolve();
      expect(connectSpy).toHaveBeenCalledTimes(1);

      transport.config.autoReconnect = false;

      vi.advanceTimersByTime(10);
      await Promise.resolve();
      expect(connectSpy).toHaveBeenCalledTimes(2);

      expect(transport['isReconnecting']).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should organically default to DEFAULT_RECONNECT_DELAY successfully globally bypassing overridden variables safely', async () => {
      transport.config.autoReconnect = true;

      const connectSpy = vi
        .spyOn(transport as AnyType, 'connect')
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue(undefined);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (transport as AnyType).scheduleReconnect();

      vi.advanceTimersByTime(1000);
      await Promise.resolve();

      expect(connectSpy).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });

    it('should evaluate successful scheduleReconnect execution path accurately natively', async () => {
      transport.config.autoReconnect = true;
      transport.config.reconnectDelay = 10;

      const connectSpy = vi.spyOn(transport as AnyType, 'connect').mockResolvedValue(undefined);

      (transport as AnyType).scheduleReconnect();

      vi.advanceTimersByTime(10);
      await Promise.resolve();

      expect(connectSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleClose', () => {
    it('should reject all pending calls', () => {
      const call1 = { payload: { name: 'foo' }, enqueue: vi.fn() } as AnyType;
      const call2 = { payload: { name: 'bar' }, enqueue: vi.fn() } as AnyType;
      transport['pendingCalls'].set('1', call1);
      transport['pendingCalls'].set('2', call2);

      transport['handleClose']({ wasClean: true } as CloseEvent);

      expect(call1.enqueue).toHaveBeenCalledWith(expect.objectContaining({ status: IRPC_STATUS.ERROR }));
      expect(call2.enqueue).toHaveBeenCalledWith(expect.objectContaining({ status: IRPC_STATUS.ERROR }));
      expect(transport['pendingCalls'].size).toBe(0);
    });

    it('should schedule reconnect if autoReconnect is true and not clean close', () => {
      transport.config.autoReconnect = true;
      const scheduleSpy = vi.spyOn(transport as AnyType, 'scheduleReconnect');

      transport['handleClose']({ wasClean: false } as CloseEvent);

      expect(scheduleSpy).toHaveBeenCalled();
    });

    it('should not schedule reconnect if was clean close', () => {
      transport.config.autoReconnect = true;
      const scheduleSpy = vi.spyOn(transport as AnyType, 'scheduleReconnect');

      transport['handleClose']({ wasClean: true } as CloseEvent);

      expect(scheduleSpy).not.toHaveBeenCalled();
    });
  });
});
