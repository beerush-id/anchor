import { ERROR_CODE, ERROR_MESSAGE, IRPC_PACKET_TYPE, IRPC_STATUS } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocketState, WebSocketTransport } from '../src/index.js';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSING;
    // Simulate async close
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose) this.onclose({ wasClean: true });
    }, 0);
  });

  constructor(
    public url: string,
    public protocols?: string[]
  ) {}
}

describe('WebSocketTransport', () => {
  let transport: WebSocketTransport;
  let mockWs: MockWebSocket;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
    transport = new WebSocketTransport({
      url: 'ws://localhost:8080',
      autoReconnect: false, // Disable auto-reconnect for easier testing unless needed
    });
  });

  afterEach(() => {
    errSpy.mockRestore();

    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create transport with config', () => {
      expect(transport.config.url).toBe('ws://localhost:8080');
      expect(transport.state).toBe(WebSocketState.CLOSED);
      expect(transport.endpoint).toBeDefined();
    });
  });

  describe('connect', () => {
    it('should establish connection successfully', async () => {
      const connectPromise = transport['connect']();
      const secondConnectPromise = transport['connect']();

      // Get the created mock websocket instance
      // We need to access the private ws property or intercept the constructor
      // Since we stubbed global WebSocket, we can't easily get the instance unless we spy on it
      // But we can assume transport.ws is set

      // Wait for microtasks to ensure ws is created
      await Promise.resolve();

      mockWs = transport['ws'] as any;
      expect(mockWs).toBeDefined();
      expect(mockWs.readyState).toBe(WebSocketState.CONNECTING);

      // Simulate open
      mockWs.readyState = WebSocketState.OPEN;
      mockWs.onopen?.();

      await connectPromise;

      expect(transport.state).toBe(WebSocketState.OPEN);
      expect(secondConnectPromise).toEqual(connectPromise);
    });

    it('should bind onmessage to resolve', async () => {
      const resolveSpy = vi.spyOn(transport as any, 'resolve');
      const connectPromise = transport['connect']();
      await Promise.resolve();
      mockWs = transport['ws'] as any;

      // Simulate open
      mockWs.readyState = WebSocketState.OPEN;
      mockWs.onopen?.();
      await connectPromise;

      const event = { data: 'test' } as MessageEvent;
      mockWs.onmessage?.(event);

      expect(resolveSpy).toHaveBeenCalledWith(event);
    });

    it('should fail connection on error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const connectPromise = transport['connect']();
      await Promise.resolve();
      mockWs = transport['ws'] as any;

      // Simulate error
      mockWs.onerror?.({ error: 'Connection failed' });

      await expect(connectPromise).rejects.toThrow('WebSocket connection failed');
    });

    it('should handle synchronous connection error', async () => {
      vi.stubGlobal(
        'WebSocket',
        class {
          constructor() {
            throw new Error('Sync error');
          }
        }
      );

      await expect(transport['connect']()).rejects.toThrow('Sync error');
    });

    it('should fail connection on timeout', async () => {
      const connectPromise = transport['connect']();

      vi.advanceTimersByTime(10001); // Default timeout is 10000

      await expect(connectPromise).rejects.toThrow(ERROR_MESSAGE[ERROR_CODE.TIMEOUT]);
    });
  });

  describe('dispatch', () => {
    it('should connect if not open', async () => {
      transport = new WebSocketTransport({ url: 'ws://localhost:8080' });

      const connectSpy = vi.spyOn(transport as any, 'connect').mockImplementation(async () => {
        // Become open when connect is called
        Object.defineProperty(transport, 'isOpen', { get: () => true });
        transport['ws'] = { send: vi.fn() } as any;
      });

      const call = { id: '1', payload: { name: 'test', args: [] }, reject: vi.fn() } as any;

      await transport['dispatch']([call]);

      expect(connectSpy).toHaveBeenCalled();
    });

    it('should reject calls if connection fails', async () => {
      transport = new WebSocketTransport({ url: 'ws://localhost:8080' });

      vi.spyOn(transport as any, 'connect').mockRejectedValue(new Error('Connection failed'));
      const call = { id: '1', payload: { name: 'test', args: [] }, enqueue: vi.fn() } as any;

      await transport['dispatch']([call]);

      expect(call.enqueue).toHaveBeenCalledWith(expect.objectContaining({ type: IRPC_PACKET_TYPE.CLOSE, status: IRPC_STATUS.ERROR, error: expect.objectContaining({ message: 'Connection failed' }) }));
    });

    it('should reject calls if state is CLOSING', async () => {
      transport = new WebSocketTransport({ url: 'ws://localhost:8080' });

      // Mock state to be CLOSING
      Object.defineProperty(transport, 'state', { get: () => WebSocketState.CLOSING });
      const call = { id: '1', payload: { name: 'test', args: [] }, enqueue: vi.fn() } as any;

      await transport['dispatch']([call]);

      expect(call.enqueue).toHaveBeenCalledWith(expect.objectContaining({ type: IRPC_PACKET_TYPE.CLOSE, status: IRPC_STATUS.ERROR, error: expect.objectContaining({ message: ERROR_MESSAGE[ERROR_CODE.INVALID_STATE] }) }));
    });

    it('should reject calls if state is CLOSED and autoReconnect is false', async () => {
      transport = new WebSocketTransport({ url: 'ws://localhost:8080' });

      transport.config.autoReconnect = false;
      // Mock state to be CLOSED
      Object.defineProperty(transport, 'state', { get: () => WebSocketState.CLOSED });
      const call = { id: '1', payload: { name: 'test', args: [] }, enqueue: vi.fn() } as any;

      await transport['dispatch']([call]);

      expect(call.enqueue).toHaveBeenCalledWith(expect.objectContaining({ type: IRPC_PACKET_TYPE.CLOSE, status: IRPC_STATUS.ERROR, error: expect.objectContaining({ message: ERROR_MESSAGE[ERROR_CODE.INVALID_STATE] }) }));
    });

    it('should reject calls if pending connection fails', async () => {
      const error = new Error('Connection failed');
      const pendingConnection = Promise.reject(error);
      // Suppress unhandled rejection warning
      pendingConnection.catch(() => {});

      transport['pendingConnection'] = pendingConnection;

      // Mock state to be CONNECTING
      Object.defineProperty(transport, 'state', { get: () => WebSocketState.CONNECTING });

      const call = { id: '1', payload: { name: 'test', args: [] }, enqueue: vi.fn() } as any;

      await transport['dispatch']([call]);

      expect(call.enqueue).toHaveBeenCalledWith(expect.objectContaining({ type: IRPC_PACKET_TYPE.CLOSE, status: IRPC_STATUS.ERROR, error: expect.objectContaining({ message: error.message }) }));
    });

    it('should wait for pending connection', async () => {
      let resolveConnect: () => void;
      const pendingConnection = new Promise<void>((resolve) => {
        resolveConnect = resolve;
      });
      transport['pendingConnection'] = pendingConnection;

      // Mock state to be CONNECTING
      Object.defineProperty(transport, 'state', { get: () => WebSocketState.CONNECTING });

      const call = { id: '1', payload: { name: 'test', args: [] }, reject: vi.fn() } as any;

      const dispatchPromise = transport['dispatch']([call]);

      // Mock ws open and send after connection resolves
      Object.defineProperty(transport, 'isOpen', { get: () => true });
      transport['ws'] = { send: vi.fn() } as any;

      resolveConnect!();
      await dispatchPromise;

      expect(transport['ws']?.send).toHaveBeenCalled();
    });

    it('should send message if open', async () => {
      // Mock open state
      Object.defineProperty(transport, 'state', { get: () => WebSocketState.OPEN });
      const mockSend = vi.fn();
      transport['ws'] = { send: mockSend } as any;

      const call = { id: '1', payload: { name: 'test', args: [] }, reject: vi.fn() } as any;

      await transport['dispatch']([call]);

      expect(mockSend).toHaveBeenCalledWith(JSON.stringify([{ id: '1', name: 'test', args: [] }]));
      expect(transport['pendingCalls'].has('1')).toBe(true);
    });

    it('should reject calls if send fails', async () => {
      // Mock open state
      Object.defineProperty(transport, 'state', { get: () => WebSocketState.OPEN });
      const mockSend = vi.fn().mockImplementation(() => {
        throw new Error('Send failed');
      });
      transport['ws'] = { send: mockSend } as any;

      const call = { id: '1', payload: { name: 'test', args: [] }, enqueue: vi.fn() } as any;

      await transport['dispatch']([call]);

      expect(call.enqueue).toHaveBeenCalledWith(expect.objectContaining({ type: IRPC_PACKET_TYPE.CLOSE, status: IRPC_STATUS.ERROR, error: expect.objectContaining({ message: 'Send failed' }) }));
    });
  });

  describe('resolve', () => {
    it('should resolve pending call on success response', () => {
      const call = { id: '1', enqueue: vi.fn() } as any;
      transport['pendingCalls'].set('1', call);

      const event = { data: JSON.stringify({ id: '1', status: IRPC_STATUS.SUCCESS }) } as MessageEvent;
      transport['resolve'](event);

      expect(call.enqueue).toHaveBeenCalledWith(expect.objectContaining({ status: IRPC_STATUS.SUCCESS }));
      expect(transport['pendingCalls'].has('1')).toBe(false);
    });

    it('should reject pending call on error response', () => {
      const call = { id: '1', enqueue: vi.fn() } as any;
      transport['pendingCalls'].set('1', call);

      const event = { data: JSON.stringify({ id: '1', status: IRPC_STATUS.ERROR, error: { message: 'failed' } }) } as MessageEvent;
      transport['resolve'](event);

      expect(call.enqueue).toHaveBeenCalledWith(expect.objectContaining({ status: IRPC_STATUS.ERROR }));
      expect(transport['pendingCalls'].has('1')).toBe(false);
    });

    it('should keep pending call when status is PENDING', () => {
      const call = { id: '1', enqueue: vi.fn() } as any;
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
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const event = { data: 'invalid json' } as MessageEvent;

      transport['resolve'](event);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('close', () => {
    it('should close connection and disable autoReconnect', () => {
      transport.config.autoReconnect = true;
      const mockClose = vi.fn();
      transport['ws'] = { close: mockClose } as any;

      transport.close();

      expect(transport.config.autoReconnect).toBe(false);
      expect(mockClose).toHaveBeenCalled();
      expect(transport['ws']).toBeUndefined();
    });

    it('should do nothing if ws is not defined', () => {
      transport['ws'] = undefined;
      transport.close();
      // Should not throw
    });
  });

  describe('reconnect', () => {
    it('should close existing connection and connect again', async () => {
      const closeSpy = vi.spyOn(transport, 'close');
      const connectSpy = vi.spyOn(transport as any, 'connect').mockResolvedValue(undefined);

      await transport.reconnect();

      expect(closeSpy).toHaveBeenCalled();
      expect(connectSpy).toHaveBeenCalled();
      expect(transport['reconnectAttempts']).toBe(0);
    });

    it('should handle reconnection failure and retry', async () => {
      transport.config.autoReconnect = true;
      transport.config.maxReconnectAttempts = 2;
      transport.config.reconnectDelay = 10;

      // Mock connect to fail
      const connectSpy = vi
        .spyOn(transport as any, 'connect')
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue(undefined);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Trigger reconnection
      (transport as any).scheduleReconnect();

      // First attempt
      vi.advanceTimersByTime(10);
      await Promise.resolve(); // Wait for async connect
      expect(connectSpy).toHaveBeenCalledTimes(1);

      // Second attempt (retry)
      vi.advanceTimersByTime(10);
      await Promise.resolve();
      expect(connectSpy).toHaveBeenCalledTimes(2);

      // Should stop retrying
      expect(transport['isReconnecting']).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should not schedule reconnect if already reconnecting', () => {
      transport['isReconnecting'] = true;
      const delaySpy = vi.spyOn(globalThis, 'setTimeout');

      (transport as any).scheduleReconnect();

      expect(delaySpy).not.toHaveBeenCalled();
    });

    it('should stop retrying if autoReconnect is disabled during retry', async () => {
      transport.config.autoReconnect = true;
      transport.config.reconnectDelay = 10;

      const connectSpy = vi.spyOn(transport as any, 'connect').mockRejectedValue(new Error('Fail'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (transport as any).scheduleReconnect();

      // First attempt
      vi.advanceTimersByTime(10);
      await Promise.resolve();
      expect(connectSpy).toHaveBeenCalledTimes(1);

      // Disable autoReconnect
      transport.config.autoReconnect = false;

      // Trigger next retry logic (which was scheduled by the first failure)
      // Wait, the first failure scheduled a NEW timeout.
      vi.advanceTimersByTime(10);
      await Promise.resolve();
      expect(connectSpy).toHaveBeenCalledTimes(2);

      // Now it should check autoReconnect and stop
      expect(transport['isReconnecting']).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should organically default to DEFAULT_RECONNECT_DELAY successfully globally bypassing overridden variables safely', async () => {
      transport.config.autoReconnect = true;
      // Do completely NOT define reconnectDelay to explicitly trigger ?? DEFAULT_RECONNECT_DELAY fallback natively!

      const connectSpy = vi.spyOn(transport as any, 'connect').mockRejectedValueOnce(new Error('Fail')).mockResolvedValue(undefined);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (transport as any).scheduleReconnect();

      // Delay explicitly by EXACTLY 1000 natively isolating the unconfigured hook gracefully.
      vi.advanceTimersByTime(1000);
      await Promise.resolve();

      expect(connectSpy).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });

    it('should evaluate successful scheduleReconnect execution path accurately natively', async () => {
      transport.config.autoReconnect = true;
      transport.config.reconnectDelay = 10;
      
      const connectSpy = vi.spyOn(transport as any, 'connect').mockResolvedValue(undefined);

      (transport as any).scheduleReconnect();

      vi.advanceTimersByTime(10);
      await Promise.resolve(); 
      // The awaited `this.connect()` naturally succeeds resolving the `try` block explicitly fully!
      
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleClose', () => {
    it('should reject all pending calls', () => {
      const call1 = { payload: { name: 'foo' }, enqueue: vi.fn() } as any;
      const call2 = { payload: { name: 'bar' }, enqueue: vi.fn() } as any;
      transport['pendingCalls'].set('1', call1);
      transport['pendingCalls'].set('2', call2);

      transport['handleClose']({ wasClean: true } as CloseEvent);

      expect(call1.enqueue).toHaveBeenCalledWith(expect.objectContaining({ status: IRPC_STATUS.ERROR }));
      expect(call2.enqueue).toHaveBeenCalledWith(expect.objectContaining({ status: IRPC_STATUS.ERROR }));
      expect(transport['pendingCalls'].size).toBe(0);
    });

    it('should schedule reconnect if autoReconnect is true and not clean close', () => {
      transport.config.autoReconnect = true;
      const scheduleSpy = vi.spyOn(transport as any, 'scheduleReconnect');

      transport['handleClose']({ wasClean: false } as CloseEvent);

      expect(scheduleSpy).toHaveBeenCalled();
    });

    it('should not schedule reconnect if was clean close', () => {
      transport.config.autoReconnect = true;
      const scheduleSpy = vi.spyOn(transport as any, 'scheduleReconnect');

      transport['handleClose']({ wasClean: true } as CloseEvent);

      expect(scheduleSpy).not.toHaveBeenCalled();
    });
  });
});
