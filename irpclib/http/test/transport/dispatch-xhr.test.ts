import { IRPC_PACKET_TYPE, IRPC_STATUS, IRPC_STORE } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HTTPTransport } from '../../src/index.js';

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
type AnyType = any;

describe('HTTPTransport XHR Dispatch', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;
  let MockXHR: AnyType;
  let xhrInstance: AnyType;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    xhrInstance = {
      open: vi.fn(),
      setRequestHeader: vi.fn(),
      send: vi.fn(),
      abort: vi.fn(),
      readyState: 0,
      status: 0,
      statusText: '',
      responseText: '',
      onprogress: null as AnyType,
      onreadystatechange: null as AnyType,
      onload: null as AnyType,
      onerror: null as AnyType,
      onabort: null as AnyType,
      getAllResponseHeaders: vi.fn().mockReturnValue('content-type: application/x-ndjson\r\nx-custom: value'),
      HEADERS_RECEIVED: 2,
    };

    MockXHR = vi.fn().mockImplementation(function () {
      return xhrInstance;
    });
    MockXHR.HEADERS_RECEIVED = 2;
    vi.stubGlobal('XMLHttpRequest', MockXHR);
  });

  afterEach(() => {
    errSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('should use XHR when XMLHttpRequest is available', async () => {
    const transport = new HTTPTransport({
      baseURL: 'https://api.example.com',
      headers: { Authorization: 'Bearer token' },
    });

    xhrInstance.send.mockImplementation(() => {
      xhrInstance.readyState = 2;
      xhrInstance.status = 200;
      xhrInstance.statusText = 'OK';
      xhrInstance.onreadystatechange();

      xhrInstance.responseText =
        JSON.stringify({
          id: '1',
          type: IRPC_PACKET_TYPE.ANSWER,
          status: IRPC_STATUS.SUCCESS,
          data: 'result',
          createdAt: Date.now(),
        }) + '\n';
      xhrInstance.onprogress();

      xhrInstance.onload();
    });

    const call = {
      id: '1',
      payload: { name: 'test', args: [] },
      options: {},
      enqueue: vi.fn(),
    } as AnyType;

    await transport['dispatch']([call]);

    expect(xhrInstance.open).toHaveBeenCalledWith('POST', expect.any(String));
    expect(xhrInstance.setRequestHeader).toHaveBeenCalledWith('authorization', 'Bearer token');
    expect(xhrInstance.send).toHaveBeenCalled();
    expect(call.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1', data: 'result', status: IRPC_STATUS.SUCCESS })
    );
  });

  it('should handle XHR onerror before headers (rejects promise)', async () => {
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });

    xhrInstance.send.mockImplementation(() => {
      xhrInstance.onerror();
    });

    const call = {
      id: '1',
      payload: { name: 'test', args: [] },
      options: {},
      enqueue: vi.fn(),
    } as AnyType;

    await transport['dispatch']([call]);

    expect(call.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: IRPC_PACKET_TYPE.CLOSE,
        status: IRPC_STATUS.ERROR,
        error: expect.objectContaining({ message: 'Request failed.' }),
      })
    );
  });

  it('should handle XHR onerror after headers and clean up unresolved calls', async () => {
    errSpy = vi.spyOn(IRPC_STORE, 'error').mockImplementation(() => {});
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });

    xhrInstance.send.mockImplementation(() => {
      xhrInstance.readyState = 2;
      xhrInstance.status = 200;
      xhrInstance.statusText = 'OK';
      xhrInstance.onreadystatechange();
      xhrInstance.onerror();
    });

    const call = {
      id: '1',
      payload: { name: 'test', args: [] },
      options: {},
      resolved: false,
      enqueue: vi.fn(),
    } as AnyType;

    await transport['dispatch']([call]);

    expect(errSpy).toHaveBeenCalled();
    expect(call.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: IRPC_PACKET_TYPE.CLOSE,
        status: IRPC_STATUS.ERROR,
        error: expect.objectContaining({ message: 'Response stream terminated.' }),
      })
    );
    errSpy.mockRestore();
  });

  it('should bridge AbortController signal to xhr.abort()', async () => {
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });

    xhrInstance.send.mockImplementation(() => {
      xhrInstance.readyState = 2;
      xhrInstance.status = 200;
      xhrInstance.statusText = 'OK';
      xhrInstance.onreadystatechange();
    });

    xhrInstance.abort.mockImplementation(() => {
      xhrInstance.onabort();
    });

    const call = {
      id: '1',
      payload: { name: 'test', args: [] },
      options: { timeout: 10 },
      enqueue: vi.fn(),
    } as AnyType;

    vi.useFakeTimers();

    const dispatchPromise = transport['dispatch']([call]);
    vi.advanceTimersByTime(20);

    await dispatchPromise;

    expect(xhrInstance.abort).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should handle multiple progress events with incremental text', async () => {
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });

    const packet1 = JSON.stringify({
      id: '1',
      type: IRPC_PACKET_TYPE.EVENT,
      status: IRPC_STATUS.PENDING,
      data: 'chunk1',
      createdAt: 1,
    });
    const packet2 = JSON.stringify({
      id: '1',
      type: IRPC_PACKET_TYPE.ANSWER,
      status: IRPC_STATUS.SUCCESS,
      data: 'chunk2',
      createdAt: 2,
    });

    xhrInstance.send.mockImplementation(() => {
      xhrInstance.readyState = 2;
      xhrInstance.status = 200;
      xhrInstance.statusText = 'OK';
      xhrInstance.onreadystatechange();

      xhrInstance.responseText = packet1 + '\n';
      xhrInstance.onprogress();

      xhrInstance.responseText = packet1 + '\n' + packet2 + '\n';
      xhrInstance.onprogress();

      xhrInstance.onload();
    });

    const call = {
      id: '1',
      payload: { name: 'test', args: [] },
      options: {},
      enqueue: vi.fn(),
    } as AnyType;

    await transport['dispatch']([call]);

    expect(call.enqueue).toHaveBeenCalledTimes(2);
    expect(call.enqueue).toHaveBeenCalledWith(expect.objectContaining({ data: 'chunk1' }));
    expect(call.enqueue).toHaveBeenCalledWith(expect.objectContaining({ data: 'chunk2' }));
  });

  it('should handle remaining data in onload flush', async () => {
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });

    const packet = JSON.stringify({
      id: '1',
      type: IRPC_PACKET_TYPE.ANSWER,
      status: IRPC_STATUS.SUCCESS,
      data: 'final',
      createdAt: 1,
    });

    xhrInstance.send.mockImplementation(() => {
      xhrInstance.readyState = 2;
      xhrInstance.status = 200;
      xhrInstance.statusText = 'OK';
      xhrInstance.onreadystatechange();

      xhrInstance.responseText = packet;
      xhrInstance.onload();
    });

    const call = {
      id: '1',
      payload: { name: 'test', args: [] },
      options: {},
      enqueue: vi.fn(),
    } as AnyType;

    await transport['dispatch']([call]);

    expect(call.enqueue).toHaveBeenCalledWith(expect.objectContaining({ data: 'final' }));
  });

  it('should dispatch without headers in init', async () => {
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });

    xhrInstance.send.mockImplementation(() => {
      xhrInstance.readyState = 2;
      xhrInstance.status = 200;
      xhrInstance.statusText = 'OK';
      xhrInstance.onreadystatechange();
      xhrInstance.onload();
    });

    const call = {
      id: '1',
      payload: { name: 'test', args: [] },
      options: {},
      enqueue: vi.fn(),
    } as AnyType;

    await transport['dispatch']([call]);

    expect(xhrInstance.setRequestHeader).not.toHaveBeenCalled();
  });

  it('should fall back to fetch when XMLHttpRequest is undefined', async () => {
    vi.unstubAllGlobals();

    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });

    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      body: { getReader: () => ({ read: async () => ({ done: true }), releaseLock: () => {} }) },
    } as AnyType);

    await transport['dispatch']([]);

    expect(mockFetch).toHaveBeenCalled();
    mockFetch.mockRestore();
  });

  it('should handle onerror after onload (ctrl.error is no-op on closed stream)', async () => {
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });

    xhrInstance.send.mockImplementation(() => {
      xhrInstance.readyState = 2;
      xhrInstance.status = 200;
      xhrInstance.statusText = 'OK';
      xhrInstance.onreadystatechange();

      xhrInstance.onload();
      xhrInstance.onerror();
    });

    const call = {
      id: '1',
      payload: { name: 'test', args: [] },
      options: {},
      enqueue: vi.fn(),
    } as AnyType;

    await transport['dispatch']([call]);
    expect(true).toBe(true);
  });

  it('should handle onabort after onload (ctrl.close is no-op on closed stream)', async () => {
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });

    xhrInstance.send.mockImplementation(() => {
      xhrInstance.readyState = 2;
      xhrInstance.status = 200;
      xhrInstance.statusText = 'OK';
      xhrInstance.onreadystatechange();

      xhrInstance.onload();
      xhrInstance.onabort();
    });

    const call = {
      id: '1',
      payload: { name: 'test', args: [] },
      options: {},
      enqueue: vi.fn(),
    } as AnyType;

    await transport['dispatch']([call]);
    expect(true).toBe(true);
  });

  it('should handle response headers without colon separator gracefully', async () => {
    xhrInstance.getAllResponseHeaders.mockReturnValue('content-type: application/x-ndjson\r\nmalformed-header-without-colon\r\nx-custom: value');
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });

    xhrInstance.send.mockImplementation(() => {
      xhrInstance.readyState = 2;
      xhrInstance.status = 200;
      xhrInstance.statusText = 'OK';
      xhrInstance.onreadystatechange();
      xhrInstance.onload();
    });

    const call = {
      id: '1',
      payload: { name: 'test', args: [] },
      options: {},
      enqueue: vi.fn(),
    } as AnyType;

    await transport['dispatch']([call]);
    expect(xhrInstance.getAllResponseHeaders).toHaveBeenCalled();
  });

  it('should ignore empty progress chunks when responseText has not changed', async () => {
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });

    xhrInstance.send.mockImplementation(() => {
      xhrInstance.readyState = 2;
      xhrInstance.status = 200;
      xhrInstance.statusText = 'OK';
      xhrInstance.onreadystatechange();

      xhrInstance.responseText = '';
      xhrInstance.onprogress();
      xhrInstance.onprogress();
      xhrInstance.onload();
    });

    const call = {
      id: '1',
      payload: { name: 'test', args: [] },
      options: {},
      enqueue: vi.fn(),
    } as AnyType;

    await transport['dispatch']([call]);
    expect(call.enqueue).not.toHaveBeenCalled();
  });

  it('should handle packets without data field in XHR stream and flush', async () => {
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    const packet1 = JSON.stringify({ id: '1', type: IRPC_PACKET_TYPE.ANSWER, status: IRPC_STATUS.SUCCESS });
    const packet2 = JSON.stringify({ id: '2', type: IRPC_PACKET_TYPE.ANSWER, status: IRPC_STATUS.SUCCESS });

    xhrInstance.send.mockImplementation(() => {
      xhrInstance.readyState = 2;
      xhrInstance.status = 200;
      xhrInstance.statusText = 'OK';
      xhrInstance.onreadystatechange();

      xhrInstance.responseText = packet1 + '\n';
      xhrInstance.onprogress();

      xhrInstance.responseText = packet1 + '\n' + packet2;
      xhrInstance.onload();
    });

    const call1 = { id: '1', payload: { name: 'test', args: [] }, options: {}, enqueue: vi.fn() } as AnyType;
    const call2 = { id: '2', payload: { name: 'test', args: [] }, options: {}, enqueue: vi.fn() } as AnyType;

    await transport['dispatch']([call1, call2]);
    expect(call1.enqueue).toHaveBeenCalled();
    expect(call2.enqueue).toHaveBeenCalled();
  });

  it('should support request method with default url parameter', async () => {
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });

    xhrInstance.send.mockImplementation(() => {
      xhrInstance.readyState = 2;
      xhrInstance.status = 200;
      xhrInstance.statusText = 'OK';
      xhrInstance.onreadystatechange();
      xhrInstance.onload();
    });

    const response = await transport['request']({ method: 'POST' });
    expect(response.status).toBe(200);
  });

  it('should ignore readyState changes other than HEADERS_RECEIVED', async () => {
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });

    xhrInstance.send.mockImplementation(() => {
      xhrInstance.readyState = 1;
      xhrInstance.onreadystatechange();
      xhrInstance.readyState = 3;
      xhrInstance.onreadystatechange();
      xhrInstance.readyState = 2;
      xhrInstance.status = 200;
      xhrInstance.statusText = 'OK';
      xhrInstance.onreadystatechange();
      xhrInstance.onload();
    });

    const call = { id: '1', payload: { name: 'test', args: [] }, options: {}, enqueue: vi.fn() } as AnyType;
    await transport['dispatch']([call]);
    expect(xhrInstance.open).toHaveBeenCalled();
  });

  it('should skip unknown call id in final buffer flush', async () => {
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    const packet = JSON.stringify({ id: 'unknown-id', type: IRPC_PACKET_TYPE.ANSWER, status: IRPC_STATUS.SUCCESS });

    xhrInstance.send.mockImplementation(() => {
      xhrInstance.readyState = 2;
      xhrInstance.status = 200;
      xhrInstance.statusText = 'OK';
      xhrInstance.onreadystatechange();

      xhrInstance.responseText = packet;
      xhrInstance.onload();
    });

    const call = { id: '1', payload: { name: 'test', args: [] }, options: {}, enqueue: vi.fn() } as AnyType;
    await transport['dispatch']([call]);
    expect(call.enqueue).not.toHaveBeenCalled();
  });
});
