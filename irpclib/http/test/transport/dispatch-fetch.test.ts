import { IRPC_PACKET_TYPE, IRPC_STATUS, IRPC_STORE, type IRPCCall, IRPCFile } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COOKIES_EVENT, COOKIES_SYNC_KEY, HTTPTransport, IRPC_JSON_KEY } from '../../src/index.js';

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
type AnyType = any;

describe('HTTPTransport Fetch Dispatch', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('should handle dispatch without throwing', async () => {
    const transport = new HTTPTransport({
      baseURL: 'https://api.example.com',
    });

    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      statusText: 'OK',
      body: {
        getReader: () => null,
      },
    } as AnyType);

    const calls: IRPCCall[] = [];

    expect(async () => {
      await transport['dispatch'](calls);
    }).not.toThrow();

    mockFetch.mockRestore();
  });

  it('should map IRPCFiles into FormData blobs natively extracted correctly', async () => {
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    const dummyBlob = new Blob(['hello world'], { type: 'text/plain' });
    const dummyFile = new IRPCFile({ name: 'test.txt', type: 'text/plain', size: dummyBlob.size }, dummyBlob);

    const calls: IRPCCall[] = [
      {
        id: '1',
        payload: { name: 'testUpload', args: [{ file: dummyFile }] },
        options: {},
        enqueue: vi.fn(),
        reject: vi.fn(),
      } as never,
    ];

    let fetchBody: AnyType = null;
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_, options) => {
      fetchBody = options?.body;
      return {
        ok: true,
        body: {
          getReader: () => ({
            read: async () => ({ done: true, value: undefined }),
            releaseLock: () => {},
          }),
        },
      } as AnyType;
    });

    await transport['dispatch'](calls);

    expect(calls[0].enqueue).not.toHaveBeenCalledWith(expect.objectContaining({ status: IRPC_STATUS.ERROR }));

    expect(fetchBody).toBeTruthy();
    expect(fetchBody.constructor.name).toBe('FormData');
    expect(mockFetch).toHaveBeenCalled();

    if (typeof fetchBody.get === 'function') {
      const jsonHeader = fetchBody.get(IRPC_JSON_KEY);
      const parsedNode = JSON.parse(jsonHeader as string);
      const uploadFileId = parsedNode?.calls?.[0]?.args?.[0]?.file?.id;
      const retrieved = fetchBody.get(uploadFileId) as Blob;
      expect(retrieved).toBeInstanceOf(Blob);
      expect(retrieved.size).toBe(dummyBlob.size);
      expect(retrieved.type).toBe(dummyBlob.type);
    }
  });

  it('should reject calls when response is not ok', async () => {
    const transport = new HTTPTransport({
      baseURL: 'https://api.example.com',
    });

    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      payload: { name: 'test', args: [] },
      statusText: 'Not Found',
    } as AnyType);

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
        error: { type: 'transport', code: 'error', message: 'Not Found' },
      })
    );

    mockFetch.mockRestore();
  });

  it('should reject calls when response error without statusText', async () => {
    const transport = new HTTPTransport({
      baseURL: 'https://api.example.com',
    });

    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      payload: { name: 'test', args: [] },
    } as AnyType);

    const call = {
      id: '1',
      payload: { name: 'test', args: [] },
      enqueue: vi.fn(),
    } as AnyType;

    await transport['dispatch']([call]);

    expect(call.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: IRPC_PACKET_TYPE.CLOSE,
        status: IRPC_STATUS.ERROR,
        error: { type: 'transport', code: 'error', message: 'Request failed.' },
      })
    );

    mockFetch.mockRestore();
  });

  it('should reject calls with timeout error when call timeout is exceeded', async () => {
    vi.useFakeTimers();

    const transport = new HTTPTransport({
      baseURL: 'https://api.example.com',
      timeout: 1000,
    });

    const mockFetch = vi.spyOn(globalThis, 'fetch').mockImplementationOnce((_, { signal }: AnyType) => {
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', reject);
      });
    });

    const call = {
      id: '1',
      payload: { name: 'test', args: [] },
      options: { timeout: 50 },
      reject: vi.fn(),
      enqueue: vi.fn().mockImplementation((...args: unknown[]) => call.reject(...args)),
    } as AnyType;

    const dispatchPromise = transport['dispatch']([call]);
    vi.advanceTimersByTime(100);
    await dispatchPromise;

    expect(call.reject).toHaveBeenCalled();

    vi.useRealTimers();
    mockFetch.mockRestore();
  });

  it('should reject calls with timeout error when transport config timeout is used', async () => {
    vi.useFakeTimers();

    const transport = new HTTPTransport({
      baseURL: 'https://api.example.com',
      timeout: 50,
    });

    const mockFetch = vi.spyOn(globalThis, 'fetch').mockImplementationOnce((_, { signal }: AnyType) => {
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', reject);
      });
    });

    const call = {
      id: '1',
      payload: { name: 'test', args: [] },
      reject: vi.fn(),
      enqueue: vi.fn().mockImplementation((...args: unknown[]) => call.reject(...args)),
    } as AnyType;

    const dispatchPromise = transport['dispatch']([call]);
    vi.advanceTimersByTime(50);
    await dispatchPromise;

    expect(call.reject).toHaveBeenCalled();

    vi.useRealTimers();
    mockFetch.mockRestore();
  });

  it('should use maximum timeout from multiple calls', async () => {
    vi.useFakeTimers();

    const transport = new HTTPTransport({
      baseURL: 'https://api.example.com',
      timeout: 50,
    });

    const mockFetch = vi.spyOn(globalThis, 'fetch').mockImplementationOnce((_, { signal }: AnyType) => {
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', reject);
      });
    });

    const call1 = {
      id: '1',
      payload: { name: 'test1', args: [] },
      reject: vi.fn(),
      timeout: 100,
      enqueue: vi.fn().mockImplementation((...args: unknown[]) => call1.reject(...args)),
    } as AnyType;

    const call2 = {
      id: '2',
      payload: { name: 'test2', args: [] },
      reject: vi.fn(),
      timeout: 200,
      enqueue: vi.fn().mockImplementation((...args: unknown[]) => call2.reject(...args)),
    } as AnyType;

    const dispatchPromise = transport['dispatch']([call1, call2]);
    vi.advanceTimersByTime(100);

    expect(call1.reject).not.toHaveBeenCalled();
    expect(call2.reject).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    await dispatchPromise;

    expect(call1.reject).toHaveBeenCalled();
    expect(call2.reject).toHaveBeenCalled();

    vi.useRealTimers();
    mockFetch.mockRestore();
  });

  it('should reject calls when fetch throws an error', async () => {
    const transport = new HTTPTransport({
      baseURL: 'https://api.example.com',
    });

    const mockFetch = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    const call = {
      id: '1',
      payload: { name: 'test', args: [] },
      enqueue: vi.fn(),
    } as AnyType;

    await transport['dispatch']([call]);

    expect(call.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: IRPC_PACKET_TYPE.CLOSE,
        status: IRPC_STATUS.ERROR,
        error: { type: 'transport', code: 'error', message: 'Network error' },
      })
    );

    mockFetch.mockRestore();
  });

  it('should reject calls when response body is invalid', async () => {
    const transport = new HTTPTransport({
      baseURL: 'https://api.example.com',
    });

    const call1 = { id: '1', payload: { name: 'test1' }, enqueue: vi.fn() } as AnyType;
    const call2 = { id: '2', payload: { name: 'test2' }, enqueue: vi.fn() } as AnyType;

    const response = {
      ok: true,
      body: null,
    };

    await transport['resolveAll']([call1, call2], response as AnyType);

    expect(call1.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: IRPC_PACKET_TYPE.CLOSE,
        status: IRPC_STATUS.ERROR,
        error: { type: 'transport', code: 'invalid_body', message: 'Invalid response body.' },
      })
    );
    expect(call2.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: IRPC_PACKET_TYPE.CLOSE,
        status: IRPC_STATUS.ERROR,
        error: { type: 'transport', code: 'invalid_body', message: 'Invalid response body.' },
      })
    );
  });

  it('should handle stream reading errors and clean up unresolved calls', async () => {
    errSpy = vi.spyOn(IRPC_STORE, 'error');
    const transport = new HTTPTransport({
      baseURL: 'https://api.example.com',
    });

    const call1 = { id: '1', payload: { name: 'test1' }, resolved: false, enqueue: vi.fn() } as AnyType;
    const call2 = { id: '2', payload: { name: 'test2' }, resolved: false, enqueue: vi.fn() } as AnyType;
    const calls = [call1, call2];

    const response = {
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockRejectedValueOnce(new Error('Stream read error')),
          releaseLock: vi.fn(),
        }),
      },
    };

    await transport['resolveAll'](calls, response as AnyType);

    expect(errSpy).toHaveBeenCalled();
    expect(call1.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: IRPC_PACKET_TYPE.CLOSE,
        status: IRPC_STATUS.ERROR,
        error: expect.objectContaining({ message: 'Response stream terminated.' }),
      })
    );
    expect(call2.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: IRPC_PACKET_TYPE.CLOSE,
        status: IRPC_STATUS.ERROR,
        error: expect.objectContaining({ message: 'Response stream terminated.' }),
      })
    );
    errSpy.mockRestore();
  });

  it('should only clean up unresolved calls on stream error, skipping already resolved ones', async () => {
    const transport = new HTTPTransport({
      baseURL: 'https://api.example.com',
    });

    const textEncoder = new TextEncoder();
    const call1 = { id: '1', payload: { name: 'test1' }, resolved: false, enqueue: vi.fn() } as AnyType;
    const call2 = { id: '2', payload: { name: 'test2' }, resolved: false, enqueue: vi.fn() } as AnyType;

    call1.enqueue.mockImplementation(() => {
      call1.resolved = true;
    });

    let readCount = 0;
    const response = {
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockImplementation(() => {
            readCount++;
            if (readCount === 1) {
              return Promise.resolve({
                done: false,
                value: textEncoder.encode(
                  JSON.stringify({
                    id: '1',
                    type: IRPC_PACKET_TYPE.ANSWER,
                    status: IRPC_STATUS.SUCCESS,
                    data: 'ok',
                    createdAt: 1,
                  }) + '\n'
                ),
              });
            }
            return Promise.reject(new Error('Connection reset'));
          }),
          releaseLock: vi.fn(),
        }),
      },
    };

    await transport['resolveAll']([call1, call2], response as AnyType);

    expect(call1.enqueue).toHaveBeenCalledTimes(1);
    expect(call1.enqueue).toHaveBeenCalledWith(expect.objectContaining({ id: '1', status: IRPC_STATUS.SUCCESS }));

    expect(call2.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: IRPC_PACKET_TYPE.CLOSE,
        status: IRPC_STATUS.ERROR,
        error: expect.objectContaining({ message: 'Response stream terminated.' }),
      })
    );
  });

  it('should resolve calls with valid response data', async () => {
    const transport = new HTTPTransport({
      baseURL: 'https://api.example.com',
    });

    const call1 = { id: '1', enqueue: vi.fn() } as AnyType;
    const call2 = { id: '2', enqueue: vi.fn() } as AnyType;
    const calls = [call1, call2];

    const textEncoder = new TextEncoder();

    let callCount = 0;
    const response = {
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({
                done: false,
                value: textEncoder.encode(
                  JSON.stringify({ id: '1', type: IRPC_PACKET_TYPE.EVENT, data: 'result1' }) + '\n'
                ),
              });
            } else if (callCount === 2) {
              return Promise.resolve({
                done: false,
                value: textEncoder.encode(
                  JSON.stringify({ id: '2', type: IRPC_PACKET_TYPE.EVENT, data: 'result2' }) + '\n'
                ),
              });
            } else {
              return Promise.resolve({
                done: true,
                value: undefined,
              });
            }
          }),
          releaseLock: vi.fn(),
        }),
      },
    };

    await transport['resolveAll'](calls, response as AnyType);

    expect(call1.enqueue).toHaveBeenCalledWith(expect.objectContaining({ data: 'result1' }));
    expect(call2.enqueue).toHaveBeenCalledWith(expect.objectContaining({ data: 'result2' }));
  });

  it('should skip response data for unknown call IDs', async () => {
    const transport = new HTTPTransport({
      baseURL: 'https://api.example.com',
    });

    const call1 = { id: '1', enqueue: vi.fn() } as AnyType;
    const calls = [call1];
    const textEncoder = new TextEncoder();

    let callCount = 0;
    const response = {
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({
                done: false,
                value: textEncoder.encode(JSON.stringify({ id: 'unknown', result: 'result' }) + '\n'),
              });
            } else {
              return Promise.resolve({
                done: true,
                value: undefined,
              });
            }
          }),
          releaseLock: vi.fn(),
        }),
      },
    };

    await transport['resolveAll'](calls, response as AnyType);
    expect(call1.enqueue).not.toHaveBeenCalled();
  });

  it('should handle JSON parsing errors in response stream', async () => {
    errSpy = vi.spyOn(IRPC_STORE, 'error');
    const transport = new HTTPTransport({
      baseURL: 'https://api.example.com',
    });

    const call1 = { id: '1', reject: vi.fn() } as AnyType;
    const calls = [call1];
    const textEncoder = new TextEncoder();

    let callCount = 0;
    const response = {
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({
                done: false,
                value: textEncoder.encode('invalid json\n'),
              });
            } else {
              return Promise.resolve({
                done: true,
                value: undefined,
              });
            }
          }),
          releaseLock: vi.fn(),
        }),
      },
    };

    await transport['resolveAll'](calls, response as AnyType);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('should handle EOF invalid framing securely', async () => {
    errSpy = vi.spyOn(IRPC_STORE, 'error');
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    const call1 = { id: '1', enqueue: vi.fn() } as AnyType;
    const textEncoder = new TextEncoder();

    let callCount = 0;
    const response = {
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1)
              return Promise.resolve({ done: false, value: textEncoder.encode('invalid terminator') });
            return Promise.resolve({ done: true, value: undefined });
          }),
          releaseLock: vi.fn(),
        }),
      },
    };

    await transport['resolveAll']([call1], response as AnyType);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('should evaluate EOF perfectly structured final packet block securely', async () => {
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    const call1 = { id: '1', enqueue: vi.fn() } as AnyType;
    const textEncoder = new TextEncoder();

    let callCount = 0;
    const response = {
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1)
              return Promise.resolve({
                done: false,
                value: textEncoder.encode(
                  JSON.stringify({ id: '1', type: IRPC_PACKET_TYPE.EVENT, data: 'eof_terminator' })
                ),
              });
            return Promise.resolve({ done: true, value: undefined });
          }),
          releaseLock: vi.fn(),
        }),
      },
    };

    await transport['resolveAll']([call1], response as AnyType);
    expect(call1.enqueue).toHaveBeenCalledWith(expect.objectContaining({ data: 'eof_terminator' }));
  });

  it('should cleanly skip empty or whitespace-only streaming blocks natively', async () => {
    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    const call1 = { id: '1', enqueue: vi.fn() } as AnyType;
    const textEncoder = new TextEncoder();

    let callCount = 0;
    const response = {
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) return Promise.resolve({ done: false, value: textEncoder.encode('\n \n\t\n') });
            return Promise.resolve({ done: true, value: undefined });
          }),
          releaseLock: vi.fn(),
        }),
      },
    };

    await transport['resolveAll']([call1], response as AnyType);
    expect(call1.enqueue).not.toHaveBeenCalled();
  });

  it('should correctly merge fetchOptions', async () => {
    vi.stubGlobal('location', { origin: undefined });
    const transport = new HTTPTransport({
      baseURL: 'https://api.example.com',
      headers: { Authorization: 'Bearer token' },
      fetchOptions: { credentials: 'omit', headers: { 'X-Custom': 'value' } },
    });

    let fetchOptions: AnyType = null;
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_, options) => {
      fetchOptions = options;
      return {
        ok: true,
        body: { getReader: () => ({ read: async () => ({ done: true }), releaseLock: () => {} }) },
      } as AnyType;
    });

    await transport['dispatch']([]);

    expect(fetchOptions).toMatchObject({
      method: 'POST',
      credentials: 'omit',
      headers: {
        Authorization: 'Bearer token',
        'X-Custom': 'value',
      },
    });

    mockFetch.mockRestore();
    vi.unstubAllGlobals();
  });

  it('should dispatch anchor:cookie-sync event when x-anchor-set-cookie header is present', async () => {
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
        body: { getReader: () => ({ read: async () => ({ done: true }), releaseLock: () => {} }) },
      } as AnyType;
    });

    await transport['dispatch']([]);

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

  it('should decode blob payloads in streaming packets and final buffer flush', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(new Response(new Blob(['data']), { status: 200 })));

    const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
    const call1 = { id: 'call-1', enqueue: vi.fn(), options: {} } as AnyType;
    const call2 = { id: 'call-2', enqueue: vi.fn(), options: {} } as AnyType;
    const textEncoder = new TextEncoder();

    const blobPayload = {
      type: 'IRPC_PACKET_BLOB',
      url: 'https://example.com/test.bin',
      meta: { name: 'test.bin', size: 4, type: 'application/octet-stream' },
    };

    let count = 0;
    const response = {
      ok: true,
      headers: { has: () => false },
      body: {
        getReader: () => ({
          read: vi.fn().mockImplementation(() => {
            count++;
            if (count === 1) {
              return Promise.resolve({
                done: false,
                value: textEncoder.encode(
                  JSON.stringify({
                    id: 'call-1',
                    type: IRPC_PACKET_TYPE.ANSWER,
                    status: IRPC_STATUS.SUCCESS,
                    data: { file: blobPayload },
                  }) + '\n'
                ),
              });
            }
            if (count === 2) {
              // emit without newline so it lands in done buffer
              return Promise.resolve({
                done: false,
                value: textEncoder.encode(
                  JSON.stringify({
                    id: 'call-2',
                    type: IRPC_PACKET_TYPE.ANSWER,
                    status: IRPC_STATUS.SUCCESS,
                    data: { file: blobPayload },
                  })
                ),
              });
            }
            return Promise.resolve({ done: true, value: undefined });
          }),
          releaseLock: vi.fn(),
        }),
      },
    };

    await transport['resolveAll']([call1, call2], response as AnyType);

    expect(call1.enqueue).toHaveBeenCalled();
    expect(call2.enqueue).toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
