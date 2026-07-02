import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BroadcastTransport } from '../../src/index.js';
import { createMockBroadcastChannel } from './helper.js';

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
type AnyType = any;

describe('BroadcastTransport Constructor & Endpoint', () => {
  let mockChannel: AnyType;

  beforeEach(() => {
    mockChannel = createMockBroadcastChannel();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create transport with channel name mapping', () => {
      const transport = new BroadcastTransport({ channel: 'my-api' });

      expect(transport.endpoint).toBe('irpc://my-api');
      expect(global.BroadcastChannel).toHaveBeenCalledWith('irpc://my-api');
    });

    it('should setup message listener', () => {
      const transport = new BroadcastTransport({ channel: 'my-api' });

      (transport as AnyType).connect();

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
});
