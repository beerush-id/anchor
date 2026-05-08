import { ERROR_CODE, IRPC_PACKET_TYPE, IRPC_STATUS, type IRPCCall, IRPCFile } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COOKIES_EVENT, COOKIES_SYNC_KEY, DEFAULT_ENDPOINT, HTTPTransport, IRPC_JSON_KEY } from '../src/index.js';

describe('HTTPTransport', () => {
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
      const call = { id: 'call-id' } as any;
      const abortSpy = vi.fn();

      const mapGetSpy = vi
        .spyOn(transport['abortControllers'] as any, 'get')
        .mockReturnValue({ abort: abortSpy } as any);
      const mapDeleteSpy = vi.spyOn(transport['abortControllers'] as any, 'delete');

      transport.close(call);

      expect(abortSpy).toHaveBeenCalledTimes(1);
      expect(mapDeleteSpy).toHaveBeenCalledWith(call);

      mapGetSpy.mockRestore();
      mapDeleteSpy.mockRestore();
    });
  });

  describe('dispatch', () => {
    it('should handle dispatch without throwing', async () => {
      const transport = new HTTPTransport({
        baseURL: 'https://api.example.com',
      });

      // Mock fetch to avoid actual network requests
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        statusText: 'OK',
        body: {
          getReader: () => null,
        },
      } as any);

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

      let fetchBody: any = null;
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
        } as any;
      });

      await transport['dispatch'](calls);

      expect(calls[0].enqueue).not.toHaveBeenCalledWith(expect.objectContaining({ status: IRPC_STATUS.ERROR }));

      expect(fetchBody).toBeTruthy();
      expect(fetchBody.constructor.name).toBe('FormData');
      expect(mockFetch).toHaveBeenCalled();

      if (typeof fetchBody.get === 'function') {
        const jsonHeader = fetchBody.get(IRPC_JSON_KEY);
        const parsedNode = JSON.parse(jsonHeader as string);
        const uploadFileId = parsedNode?.[0]?.args?.[0]?.file?.id;
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

      // Mock fetch to return a non-ok response
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        payload: { name: 'test', args: [] },
        statusText: 'Not Found',
      } as any);

      const call = {
        id: '1',
        payload: { name: 'test', args: [] },
        options: {},
        enqueue: vi.fn(),
      } as any;

      await transport['dispatch']([call]);

      expect(call.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: IRPC_PACKET_TYPE.CLOSE,
          status: IRPC_STATUS.ERROR,
          error: { code: ERROR_CODE.UNKNOWN, message: 'Not Found' },
        })
      );

      mockFetch.mockRestore();
    });

    it('should reject calls when response error without statusText', async () => {
      const transport = new HTTPTransport({
        baseURL: 'https://api.example.com',
      });

      // Mock fetch to return a non-ok response
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        payload: { name: 'test', args: [] },
      } as any);

      const call = {
        id: '1',
        payload: { name: 'test', args: [] },
        enqueue: vi.fn(),
      } as any;

      await transport['dispatch']([call]);

      expect(call.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: IRPC_PACKET_TYPE.CLOSE,
          status: IRPC_STATUS.ERROR,
          error: { code: ERROR_CODE.UNKNOWN, message: 'Request failed.' },
        })
      );

      mockFetch.mockRestore();
    });

    it('should reject calls with timeout error when call timeout is exceeded', async () => {
      // Use fake timers for timeout testing
      vi.useFakeTimers();

      const transport = new HTTPTransport({
        baseURL: 'https://api.example.com',
        timeout: 1000, // This should be overridden by call timeout
      });

      // Mock fetch to never resolve, simulating a hanging request
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockImplementationOnce((_, { signal }: any) => {
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
      } as any;

      // Execute dispatch
      const dispatchPromise = transport['dispatch']([call]);

      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(100);

      // Wait for dispatch to complete
      await dispatchPromise;

      // Check that the call was rejected with a timeout error
      expect(call.reject).toHaveBeenCalled();

      // Clean up
      vi.useRealTimers();
      mockFetch.mockRestore();
    });

    it('should reject calls with timeout error when transport config timeout is used', async () => {
      // Use fake timers for timeout testing
      vi.useFakeTimers();

      const transport = new HTTPTransport({
        baseURL: 'https://api.example.com',
        timeout: 50,
      });

      // Mock fetch to never resolve, simulating a hanging request
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockImplementationOnce((_, { signal }: any) => {
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', reject);
        });
      });

      const call = {
        id: '1',
        payload: { name: 'test', args: [] },
        reject: vi.fn(),
        enqueue: vi.fn().mockImplementation((...args: unknown[]) => call.reject(...args)),
      } as any;

      // Execute dispatch
      const dispatchPromise = transport['dispatch']([call]);

      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(50);

      // Wait for dispatch to complete
      await dispatchPromise;

      // Check that the call was rejected with a timeout error
      expect(call.reject).toHaveBeenCalled();

      // Clean up
      vi.useRealTimers();
      mockFetch.mockRestore();
    });

    it('should use maximum timeout from multiple calls', async () => {
      // Use fake timers for timeout testing
      vi.useFakeTimers();

      const transport = new HTTPTransport({
        baseURL: 'https://api.example.com',
        timeout: 50, // Should be overridden by max call timeout
      });

      // Mock fetch to never resolve, simulating a hanging request
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockImplementationOnce((_, { signal }: any) => {
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
      } as any;

      const call2 = {
        id: '2',
        payload: { name: 'test2', args: [] },
        reject: vi.fn(),
        timeout: 200, // This is the maximum timeout
        enqueue: vi.fn().mockImplementation((...args: unknown[]) => call2.reject(...args)),
      } as any;

      // Execute dispatch
      const dispatchPromise = transport['dispatch']([call1, call2]);

      // Fast-forward time to 100ms - call1 timeout
      vi.advanceTimersByTime(100);

      // At 100ms, neither call should be rejected yet since max timeout is 200ms
      expect(call1.reject).not.toHaveBeenCalled();
      expect(call2.reject).not.toHaveBeenCalled();

      // Fast-forward time to 200ms - call2 timeout (max timeout)
      vi.advanceTimersByTime(100);

      // Wait for dispatch to complete
      await dispatchPromise;

      // Both calls should be rejected with a timeout error
      expect(call1.reject).toHaveBeenCalled();
      expect(call2.reject).toHaveBeenCalled();

      // Clean up
      vi.useRealTimers();
      mockFetch.mockRestore();
    });

    it('should reject calls when fetch throws an error', async () => {
      const transport = new HTTPTransport({
        baseURL: 'https://api.example.com',
      });

      // Mock fetch to throw an error
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const call = {
        id: '1',
        payload: { name: 'test', args: [] },
        enqueue: vi.fn(),
      } as any;

      await transport['dispatch']([call]);

      expect(call.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: IRPC_PACKET_TYPE.CLOSE,
          status: IRPC_STATUS.ERROR,
          error: { code: ERROR_CODE.UNKNOWN, message: 'Network error' },
        })
      );

      mockFetch.mockRestore();
    });

    it('should reject calls when response body is invalid', async () => {
      const transport = new HTTPTransport({
        baseURL: 'https://api.example.com',
      });

      // Mock calls
      const call1 = { id: '1', payload: { name: 'test1' }, enqueue: vi.fn() } as any;
      const call2 = { id: '2', payload: { name: 'test2' }, enqueue: vi.fn() } as any;

      // Create a mock response with invalid body
      const response = {
        ok: true,
        body: null, // Invalid body
      };

      await transport['resolveAll']([call1, call2], response as any);

      expect(call1.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: IRPC_PACKET_TYPE.CLOSE,
          status: IRPC_STATUS.ERROR,
          error: { code: ERROR_CODE.UNKNOWN, message: 'Invalid response body.' },
        })
      );
      expect(call2.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: IRPC_PACKET_TYPE.CLOSE,
          status: IRPC_STATUS.ERROR,
          error: { code: ERROR_CODE.UNKNOWN, message: 'Invalid response body.' },
        })
      );
    });

    it('should handle stream reading errors and clean up unresolved calls', async () => {
      const transport = new HTTPTransport({
        baseURL: 'https://api.example.com',
      });

      // Mock calls
      const call1 = { id: '1', payload: { name: 'test1' }, resolved: false, enqueue: vi.fn() } as any;
      const call2 = { id: '2', payload: { name: 'test2' }, resolved: false, enqueue: vi.fn() } as any;
      const calls = [call1, call2];

      // Create a mock response with a reader that throws an error
      const response = {
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockRejectedValueOnce(new Error('Stream read error')),
            releaseLock: vi.fn(),
          }),
        },
      };

      await transport['resolveAll'](calls, response as any);

      expect(errSpy).toHaveBeenCalled();

      // Both unresolved calls should receive CLOSE/ERROR packets.
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
    });

    it('should only clean up unresolved calls on stream error, skipping already resolved ones', async () => {
      const transport = new HTTPTransport({
        baseURL: 'https://api.example.com',
      });

      const textEncoder = new TextEncoder();

      // call1 will be resolved before the stream errors, call2 will not.
      const call1 = { id: '1', payload: { name: 'test1' }, resolved: false, enqueue: vi.fn() } as any;
      const call2 = { id: '2', payload: { name: 'test2' }, resolved: false, enqueue: vi.fn() } as any;

      // Mark call1 as resolved after it receives its packet.
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
                // Deliver a terminal packet for call1.
                return Promise.resolve({
                  done: false,
                  value: textEncoder.encode(
                    JSON.stringify({ id: '1', type: IRPC_PACKET_TYPE.ANSWER, status: IRPC_STATUS.SUCCESS, data: 'ok', createdAt: 1 }) + '\n'
                  ),
                });
              }
              // Then stream errors.
              return Promise.reject(new Error('Connection reset'));
            }),
            releaseLock: vi.fn(),
          }),
        },
      };

      await transport['resolveAll']([call1, call2], response as any);

      // call1 received its packet (ANSWER) and was marked resolved.
      expect(call1.enqueue).toHaveBeenCalledTimes(1);
      expect(call1.enqueue).toHaveBeenCalledWith(expect.objectContaining({ id: '1', status: IRPC_STATUS.SUCCESS }));

      // call2 was unresolved and should receive CLOSE/ERROR from the cleanup.
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

      // Mock calls
      const call1 = { id: '1', enqueue: vi.fn() } as any;
      const call2 = { id: '2', enqueue: vi.fn() } as any;
      const calls = [call1, call2];

      // Text encoder for simulating stream data
      const textEncoder = new TextEncoder();

      // Create a mock response with a reader that returns valid data
      let callCount = 0;
      const response = {
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                // First call returns data for call1
                return Promise.resolve({
                  done: false,
                  value: textEncoder.encode(
                    JSON.stringify({ id: '1', type: IRPC_PACKET_TYPE.EVENT, data: 'result1' }) + '\n'
                  ),
                });
              } else if (callCount === 2) {
                // Second call returns data for call2
                return Promise.resolve({
                  done: false,
                  value: textEncoder.encode(
                    JSON.stringify({ id: '2', type: IRPC_PACKET_TYPE.EVENT, data: 'result2' }) + '\n'
                  ),
                });
              } else {
                // Third call indicates stream is done
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

      await transport['resolveAll'](calls, response as any);

      expect(call1.enqueue).toHaveBeenCalledWith(expect.objectContaining({ data: 'result1' }));
      expect(call2.enqueue).toHaveBeenCalledWith(expect.objectContaining({ data: 'result2' }));
    });

    it('should skip response data for unknown call IDs', async () => {
      const transport = new HTTPTransport({
        baseURL: 'https://api.example.com',
      });

      // Mock calls
      const call1 = { id: '1', enqueue: vi.fn() } as any;
      const calls = [call1];

      // Text encoder for simulating stream data
      const textEncoder = new TextEncoder();

      // Create a mock response with a reader that returns data with unknown ID
      let callCount = 0;
      const response = {
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                // First call returns data with unknown ID
                return Promise.resolve({
                  done: false,
                  value: textEncoder.encode(JSON.stringify({ id: 'unknown', result: 'result' }) + '\n'),
                });
              } else {
                // Second call indicates stream is done
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

      await transport['resolveAll'](calls, response as any);

      // call1 should not be resolved since the response ID doesn't match
      expect(call1.enqueue).not.toHaveBeenCalled();
    });

    it('should handle JSON parsing errors in response stream', async () => {
      const transport = new HTTPTransport({
        baseURL: 'https://api.example.com',
      });

      // Mock calls
      const call1 = { id: '1', reject: vi.fn() } as any;
      const calls = [call1];

      // Text encoder for simulating invalid JSON data
      const textEncoder = new TextEncoder();

      // Create a mock response with a reader that returns invalid JSON
      let callCount = 0;
      const response = {
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                // First call returns invalid JSON
                return Promise.resolve({
                  done: false,
                  value: textEncoder.encode('invalid json\n'),
                });
              } else {
                // Second call indicates stream is done
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

      await transport['resolveAll'](calls, response as any);

      // The call should not be rejected due to parsing error being caught and logged
      // but we can verify the function doesn't crash
      expect(true).toBe(true);
      expect(errSpy).toHaveBeenCalled();
    });

    it('should handle EOF invalid framing securely', async () => {
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const call1 = { id: '1', enqueue: vi.fn() } as any;
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

      await transport['resolveAll']([call1], response as any);
      expect(errSpy).toHaveBeenCalled();
    });

    it('should evaluate EOF perfectly structured final packet block securely', async () => {
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const call1 = { id: '1', enqueue: vi.fn() } as any;
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

      await transport['resolveAll']([call1], response as any);
      expect(call1.enqueue).toHaveBeenCalledWith(expect.objectContaining({ data: 'eof_terminator' }));
    });

    it('should cleanly skip empty or whitespace-only streaming blocks natively', async () => {
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });
      const call1 = { id: '1', enqueue: vi.fn() } as any;
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

      await transport['resolveAll']([call1], response as any);
      expect(call1.enqueue).not.toHaveBeenCalled();
      expect(errSpy).not.toHaveBeenCalled();
    });

    it('should correctly merge fetchOptions', async () => {
      const transport = new HTTPTransport({
        baseURL: 'https://api.example.com',
        headers: { Authorization: 'Bearer token' },
        fetchOptions: { credentials: 'omit', headers: { 'X-Custom': 'value' } },
      });

      let fetchOptions: any = null;
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_, options) => {
        fetchOptions = options;
        return {
          ok: true,
          body: { getReader: () => ({ read: async () => ({ done: true }), releaseLock: () => {} }) },
        } as any;
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
    });

    it('should dispatch anchor:cookie-sync event when x-anchor-set-cookie header is present', async () => {
      const isWindowDefined = typeof window !== 'undefined';
      if (!isWindowDefined) {
        (globalThis as any).window = { dispatchEvent: vi.fn(), location: { origin: 'http://localhost' } };
      }
      const isCustomEventDefined = typeof CustomEvent !== 'undefined';
      if (!isCustomEventDefined) {
        (globalThis as any).CustomEvent = class {
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
        } as any;
      });

      await transport['dispatch']([]);

      expect(dispatchSpy).toHaveBeenCalled();
      expect((dispatchSpy.mock.calls[0][0] as any).type).toBe(COOKIES_EVENT);

      dispatchSpy.mockRestore();
      mockFetch.mockRestore();

      if (!isWindowDefined) {
        delete (globalThis as any).window;
      }
      if (!isCustomEventDefined) {
        delete (globalThis as any).CustomEvent;
      }
    });
  });

  describe('XHR dispatch', () => {
    let MockXHR: any;
    let xhrInstance: any;

    beforeEach(() => {
      xhrInstance = {
        open: vi.fn(),
        setRequestHeader: vi.fn(),
        send: vi.fn(),
        abort: vi.fn(),
        readyState: 0,
        status: 0,
        statusText: '',
        responseText: '',
        onprogress: null as any,
        onreadystatechange: null as any,
        onload: null as any,
        onerror: null as any,
        onabort: null as any,
        getAllResponseHeaders: vi.fn().mockReturnValue('content-type: application/x-ndjson\r\nx-custom: value'),
        HEADERS_RECEIVED: 2,
      };

      MockXHR = vi.fn().mockImplementation(() => xhrInstance);
      MockXHR.HEADERS_RECEIVED = 2;
      vi.stubGlobal('XMLHttpRequest', MockXHR);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should use XHR when XMLHttpRequest is available', async () => {
      const transport = new HTTPTransport({
        baseURL: 'https://api.example.com',
        headers: { Authorization: 'Bearer token' },
      });

      xhrInstance.send.mockImplementation(() => {
        // Simulate headers received.
        xhrInstance.readyState = 2;
        xhrInstance.status = 200;
        xhrInstance.statusText = 'OK';
        xhrInstance.onreadystatechange();

        // Simulate progress with a chunk.
        xhrInstance.responseText = JSON.stringify({
          id: '1',
          type: IRPC_PACKET_TYPE.ANSWER,
          status: IRPC_STATUS.SUCCESS,
          data: 'result',
          createdAt: Date.now(),
        }) + '\n';
        xhrInstance.onprogress();

        // Simulate load complete.
        xhrInstance.onload();
      });

      const call = {
        id: '1',
        payload: { name: 'test', args: [] },
        options: {},
        enqueue: vi.fn(),
      } as any;

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
      } as any;

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
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });

      xhrInstance.send.mockImplementation(() => {
        // Simulate headers received first.
        xhrInstance.readyState = 2;
        xhrInstance.status = 200;
        xhrInstance.statusText = 'OK';
        xhrInstance.onreadystatechange();

        // Then simulate error mid-stream.
        xhrInstance.onerror();
      });

      const call = {
        id: '1',
        payload: { name: 'test', args: [] },
        options: {},
        resolved: false,
        enqueue: vi.fn(),
      } as any;

      await transport['dispatch']([call]);

      // resolveAll's catch should log the stream read error.
      expect(errSpy).toHaveBeenCalled();

      // Unresolved call should receive CLOSE/ERROR from cleanup.
      expect(call.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: IRPC_PACKET_TYPE.CLOSE,
          status: IRPC_STATUS.ERROR,
          error: expect.objectContaining({ message: 'Response stream terminated.' }),
        })
      );
    });

    it('should bridge AbortController signal to xhr.abort()', async () => {
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });

      xhrInstance.send.mockImplementation(() => {
        // Simulate headers received.
        xhrInstance.readyState = 2;
        xhrInstance.status = 200;
        xhrInstance.statusText = 'OK';
        xhrInstance.onreadystatechange();
      });

      // Simulate abort AFTER the response resolves.
      xhrInstance.abort.mockImplementation(() => {
        xhrInstance.onabort();
      });

      const call = {
        id: '1',
        payload: { name: 'test', args: [] },
        options: { timeout: 10 },
        enqueue: vi.fn(),
      } as any;

      vi.useFakeTimers();

      const dispatchPromise = transport['dispatch']([call]);

      // Advance past the timeout to trigger abort.
      vi.advanceTimersByTime(20);

      await dispatchPromise;

      expect(xhrInstance.abort).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should handle multiple progress events with incremental text', async () => {
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });

      const packet1 = JSON.stringify({ id: '1', type: IRPC_PACKET_TYPE.EVENT, status: IRPC_STATUS.PENDING, data: 'chunk1', createdAt: 1 });
      const packet2 = JSON.stringify({ id: '1', type: IRPC_PACKET_TYPE.ANSWER, status: IRPC_STATUS.SUCCESS, data: 'chunk2', createdAt: 2 });

      xhrInstance.send.mockImplementation(() => {
        xhrInstance.readyState = 2;
        xhrInstance.status = 200;
        xhrInstance.statusText = 'OK';
        xhrInstance.onreadystatechange();

        // First progress.
        xhrInstance.responseText = packet1 + '\n';
        xhrInstance.onprogress();

        // Second progress.
        xhrInstance.responseText = packet1 + '\n' + packet2 + '\n';
        xhrInstance.onprogress();

        xhrInstance.onload();
      });

      const call = {
        id: '1',
        payload: { name: 'test', args: [] },
        options: {},
        enqueue: vi.fn(),
      } as any;

      await transport['dispatch']([call]);

      expect(call.enqueue).toHaveBeenCalledTimes(2);
      expect(call.enqueue).toHaveBeenCalledWith(expect.objectContaining({ data: 'chunk1' }));
      expect(call.enqueue).toHaveBeenCalledWith(expect.objectContaining({ data: 'chunk2' }));
    });

    it('should handle remaining data in onload flush', async () => {
      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });

      const packet = JSON.stringify({ id: '1', type: IRPC_PACKET_TYPE.ANSWER, status: IRPC_STATUS.SUCCESS, data: 'final', createdAt: 1 });

      xhrInstance.send.mockImplementation(() => {
        xhrInstance.readyState = 2;
        xhrInstance.status = 200;
        xhrInstance.statusText = 'OK';
        xhrInstance.onreadystatechange();

        // No progress events — all data arrives at onload.
        xhrInstance.responseText = packet;
        xhrInstance.onload();
      });

      const call = {
        id: '1',
        payload: { name: 'test', args: [] },
        options: {},
        enqueue: vi.fn(),
      } as any;

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
      } as any;

      await transport['dispatch']([call]);

      expect(xhrInstance.setRequestHeader).not.toHaveBeenCalled();
    });

    it('should fall back to fetch when XMLHttpRequest is undefined', async () => {
      vi.unstubAllGlobals();

      const transport = new HTTPTransport({ baseURL: 'https://api.example.com' });

      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => ({ read: async () => ({ done: true }), releaseLock: () => {} }) },
      } as any);

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
        // ctrl.error() is a no-op on a closed stream — should not crash.
        xhrInstance.onerror();
      });

      const call = {
        id: '1',
        payload: { name: 'test', args: [] },
        options: {},
        enqueue: vi.fn(),
      } as any;

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
        // ctrl.close() is a no-op on a closed stream — should not crash.
        xhrInstance.onabort();
      });

      const call = {
        id: '1',
        payload: { name: 'test', args: [] },
        options: {},
        enqueue: vi.fn(),
      } as any;

      await transport['dispatch']([call]);
      expect(true).toBe(true);
    });
  });
});
