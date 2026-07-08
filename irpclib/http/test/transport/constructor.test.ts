import type { IRPCCall } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_ENDPOINT, HTTPTransport } from '../../src/index.js';

describe('HTTPTransport Constructor & Utilities', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create transport with config', () => {
      const config = {
        baseURL: 'https://api.example.com',
        endpoint: '/rpc',
        headers: { Authorization: 'Bearer token' },
      };

      const transport = new HTTPTransport(config);

      expect(transport.config).toBe(config);
    });
  });

  describe('endpoint', () => {
    it('should return configured endpoint', () => {
      const transport = new HTTPTransport({
        endpoint: '/custom',
      });

      expect(transport.endpoint).toBe('/custom');
    });

    it('should return default endpoint when not configured', () => {
      const transport = new HTTPTransport({});

      expect(transport.endpoint).toBe(DEFAULT_ENDPOINT);
    });
  });

  describe('url', () => {
    it('should construct URL with baseURL and endpoint', () => {
      const transport = new HTTPTransport({
        baseURL: 'https://api.example.com',
        endpoint: '/rpc',
      });

      expect(transport.url.toString()).toBe('https://api.example.com/rpc');
    });

    it('should use default endpoint when not configured', () => {
      const transport = new HTTPTransport({
        baseURL: 'https://api.example.com',
      });

      expect(transport.url.toString()).toBe(`https://api.example.com${DEFAULT_ENDPOINT}`);
    });

    it('should use default baseURL when not configured', () => {
      vi.stubGlobal('window', {});
      const transport = new HTTPTransport({});
      expect(transport.url.href).toBeDefined();
      vi.unstubAllGlobals();
    });
  });

  describe('close', () => {
    it('should cleanly abort active requests dynamically mapped natively', () => {
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      // biome-ignore lint/suspicious/noExplicitAny: Expect any.
      const call = { id: 'call-id' } as any;

      const controller = new AbortController();
      const controllerSet = new Set<IRPCCall>();

      const abortSpy = vi.spyOn(controller, 'abort');

      transport['abortControllers'].set(controller, controllerSet);
      transport['callControllers'].set(call, controller);

      transport.close(call);

      expect(abortSpy).toHaveBeenCalledTimes(1);
      expect(transport['abortControllers'].size).toBe(0);
      expect(transport['callControllers'].size).toBe(0);
      expect(controllerSet.size).toBe(0);

      abortSpy.mockRestore();
    });
  });
});
