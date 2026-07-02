import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocketState, WebSocketTransport } from '../../src/index.js';
import { MockWebSocket } from './helper.js';

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
type AnyType = any;

describe('WebSocketTransport Constructor & Connect', () => {
  let transport: WebSocketTransport;
  let mockWs: MockWebSocket;
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

      await Promise.resolve();

      mockWs = transport['ws'] as AnyType;
      expect(mockWs).toBeDefined();
      expect(mockWs.readyState).toBe(WebSocketState.CONNECTING);

      mockWs.readyState = WebSocketState.OPEN;
      mockWs.onopen?.();

      await connectPromise;

      expect(transport.state).toBe(WebSocketState.OPEN);
      expect(secondConnectPromise).toEqual(connectPromise);
    });

    it('should bind onmessage to resolve', async () => {
      const resolveSpy = vi.spyOn(transport as AnyType, 'resolve');
      const connectPromise = transport['connect']();
      await Promise.resolve();
      mockWs = transport['ws'] as AnyType;

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
      mockWs = transport['ws'] as AnyType;

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

      vi.advanceTimersByTime(10001);

      await expect(connectPromise).rejects.toThrow('Call timed out.');
    });
  });
});
