import { IRPC_PACKET_TYPE, IRPC_STATUS } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COOKIES_EVENT, COOKIES_SYNC_KEY, HTTPTransport } from '../../src/index.js';

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
type AnyType = any;

describe('HTTPTransport Standalone Dispatch', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('should dispatch to webPath URL with call name when standalone', async () => {
    const transport = new HTTPTransport({
      baseURL: 'https://api.example.com',
      endpoint: '/rpc',
    });

    let fetchUrl: string | URL | undefined;
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      fetchUrl = url as URL;
      return {
        ok: true,
        headers: { has: () => false },
        json: async () => ({
          id: '1',
          name: 'login',
          type: IRPC_PACKET_TYPE.ANSWER,
          status: IRPC_STATUS.SUCCESS,
          data: { token: 'abc' },
          createdAt: Date.now(),
        }),
      } as AnyType;
    });

    const call = {
      id: '1',
      payload: { name: 'login', args: [] },
      options: {},
      enqueue: vi.fn(),
    } as AnyType;

    await transport['dispatch']([call], true);

    expect(fetchUrl?.toString()).toBe('https://api.example.com/rpc/web/login');
    mockFetch.mockRestore();
  });

  it('should read response as JSON and enqueue packet directly', async () => {
    const transport = new HTTPTransport({
      baseURL: 'https://api.example.com',
    });

    const packet = {
      id: '1',
      name: 'login',
      type: IRPC_PACKET_TYPE.ANSWER,
      status: IRPC_STATUS.SUCCESS,
      data: { token: 'abc' },
      createdAt: Date.now(),
    };

    const mockFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return {
        ok: true,
        headers: { has: () => false },
        json: async () => packet,
      } as AnyType;
    });

    const call = {
      id: '1',
      payload: { name: 'login', args: [] },
      options: {},
      enqueue: vi.fn(),
    } as AnyType;

    await transport['dispatch']([call], true);

    expect(call.enqueue).toHaveBeenCalledTimes(1);
    expect(call.enqueue).toHaveBeenCalledWith(packet);

    mockFetch.mockRestore();
  });

  it('should not call resolveAll when standalone', async () => {
    const transport = new HTTPTransport({
      baseURL: 'https://api.example.com',
    });

    const resolveAllSpy = vi.spyOn(transport as AnyType, 'resolveAll');

    const mockFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return {
        ok: true,
        headers: { has: () => false },
        json: async () => ({
          id: '1',
          name: 'login',
          type: IRPC_PACKET_TYPE.ANSWER,
          status: IRPC_STATUS.SUCCESS,
          data: null,
          createdAt: Date.now(),
        }),
      } as AnyType;
    });

    const call = {
      id: '1',
      payload: { name: 'login', args: [] },
      options: {},
      enqueue: vi.fn(),
    } as AnyType;

    await transport['dispatch']([call], true);

    expect(resolveAllSpy).not.toHaveBeenCalled();

    resolveAllSpy.mockRestore();
    mockFetch.mockRestore();
  });

  it('should dispatch cookie sync event when standalone response has cookie header', async () => {
    const isWindowDefined = typeof window !== 'undefined';
    if (!isWindowDefined) {
      (globalThis as AnyType).window = { dispatchEvent: vi.fn() };
      (globalThis as AnyType).location = { origin: 'http://localhost' };
    }
    const isCustomEventDefined = typeof CustomEvent !== 'undefined';
    if (!isCustomEventDefined) {
      (globalThis as AnyType).CustomEvent = class {
        type: string;
        constructor(type: string) {
          this.type = type;
        }
      };
    }

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent').mockImplementation(() => true);

    const transport = new HTTPTransport({});
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return {
        ok: true,
        headers: { has: (key: string) => key.toLowerCase() === COOKIES_SYNC_KEY },
        json: async () => ({
          id: '1',
          name: 'login',
          type: IRPC_PACKET_TYPE.ANSWER,
          status: IRPC_STATUS.SUCCESS,
          data: null,
          createdAt: Date.now(),
        }),
      } as AnyType;
    });

    const call = {
      id: '1',
      payload: { name: 'login', args: [] },
      options: {},
      enqueue: vi.fn(),
    } as AnyType;

    await transport['dispatch']([call], true);

    expect(dispatchSpy).toHaveBeenCalled();
    expect((dispatchSpy.mock.calls[0][0] as AnyType).type).toBe(COOKIES_EVENT);

    dispatchSpy.mockRestore();
    mockFetch.mockRestore();

    if (!isWindowDefined) {
      delete (globalThis as AnyType).window;
    }
    if (!isCustomEventDefined) {
      delete (globalThis as AnyType).CustomEvent;
    }
  });

  it('should reject call when standalone response is not ok', async () => {
    const transport = new HTTPTransport({
      baseURL: 'https://api.example.com',
    });

    const mockFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return {
        ok: false,
        statusText: 'Unauthorized',
        headers: { has: () => false },
      } as AnyType;
    });

    const call = {
      id: '1',
      payload: { name: 'login', args: [] },
      options: {},
      enqueue: vi.fn(),
    } as AnyType;

    await transport['dispatch']([call], true);

    expect(call.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: IRPC_PACKET_TYPE.CLOSE,
        status: IRPC_STATUS.ERROR,
        error: { type: 'transport', code: 'error', message: 'Unauthorized' },
      })
    );

    mockFetch.mockRestore();
  });

  it('should reject call when standalone fetch throws', async () => {
    const transport = new HTTPTransport({
      baseURL: 'https://api.example.com',
    });

    const mockFetch = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    const call = {
      id: '1',
      payload: { name: 'login', args: [] },
      options: {},
      enqueue: vi.fn(),
    } as AnyType;

    await transport['dispatch']([call], true);

    expect(call.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: IRPC_PACKET_TYPE.CLOSE,
        status: IRPC_STATUS.ERROR,
        error: { type: 'transport', code: 'error', message: 'Network error' },
      })
    );

    mockFetch.mockRestore();
  });

  it('should use default endpoint for non-standalone dispatch', async () => {
    const transport = new HTTPTransport({
      baseURL: 'https://api.example.com',
      endpoint: '/rpc',
    });

    let fetchUrl: string | URL | undefined;
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      fetchUrl = url as URL;
      return {
        ok: true,
        body: { getReader: () => ({ read: async () => ({ done: true }), releaseLock: () => {} }) },
      } as AnyType;
    });

    await transport['dispatch']([]);

    expect(fetchUrl?.toString()).toBe('https://api.example.com/rpc');
    mockFetch.mockRestore();
  });
});
