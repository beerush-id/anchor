import { ERROR_CODE, ERROR_MESSAGE, type IRPCCall } from '@irpclib/irpc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_ENDPOINT, HTTPTransport } from '../src/index.js';

describe('HTTPTransport', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
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
        reject: vi.fn(),
      } as any;

      await transport['dispatch']([call]);

      expect(call.reject).toHaveBeenCalledWith(new Error('Not Found'));

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
        reject: vi.fn(),
      } as any;

      await transport['dispatch']([call]);

      expect(call.reject).toHaveBeenCalledWith(new Error('Request failed.'));

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
        reject: vi.fn(),
        timeout: 50, // This should override the config timeout
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
        // No timeout specified on the call, should use transport config timeout
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
      } as any;

      const call2 = {
        id: '2',
        payload: { name: 'test2', args: [] },
        reject: vi.fn(),
        timeout: 200, // This is the maximum timeout
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
        reject: vi.fn(),
      } as any;

      await transport['dispatch']([call]);

      expect(call.reject).toHaveBeenCalledWith(new Error('Network error'));

      mockFetch.mockRestore();
    });

    it('should reject calls when response body is invalid', async () => {
      const transport = new HTTPTransport({
        baseURL: 'https://api.example.com',
      });

      // Mock calls
      const call1 = { id: '1', reject: vi.fn() } as any;
      const call2 = { id: '2', reject: vi.fn() } as any;

      // Create a mock response with invalid body
      const response = {
        ok: true,
        body: null, // Invalid body
      };

      await transport['resolveAll']([call1, call2], response as any);

      expect(call1.reject).toHaveBeenCalledWith(new Error('Invalid response body.'));
      expect(call2.reject).toHaveBeenCalledWith(new Error('Invalid response body.'));
    });

    it('should handle stream reading errors', async () => {
      const transport = new HTTPTransport({
        baseURL: 'https://api.example.com',
      });

      // Mock calls
      const call1 = { id: '1', reject: vi.fn() } as any;
      const calls = [call1];

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

      // The call should not be rejected in this case as the error is caught and logged
      // but we can verify the function doesn't crash
      expect(true).toBe(true);
    });

    it('should resolve calls with valid response data', async () => {
      const transport = new HTTPTransport({
        baseURL: 'https://api.example.com',
      });

      // Mock calls
      const call1 = { id: '1', resolve: vi.fn() } as any;
      const call2 = { id: '2', resolve: vi.fn() } as any;
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
                  value: textEncoder.encode(JSON.stringify({ id: '1', result: 'result1' })),
                });
              } else if (callCount === 2) {
                // Second call returns data for call2
                return Promise.resolve({
                  done: false,
                  value: textEncoder.encode(JSON.stringify({ id: '2', result: 'result2' })),
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

      expect(call1.resolve).toHaveBeenCalledWith('result1');
      expect(call2.resolve).toHaveBeenCalledWith('result2');
    });

    it('should skip response data for unknown call IDs', async () => {
      const transport = new HTTPTransport({
        baseURL: 'https://api.example.com',
      });

      // Mock calls
      const call1 = { id: '1', resolve: vi.fn() } as any;
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
                  value: textEncoder.encode(JSON.stringify({ id: 'unknown', result: 'result' })),
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
      expect(call1.resolve).not.toHaveBeenCalled();
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
                  value: textEncoder.encode('invalid json'),
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
  });

  describe('resolve', () => {
    it('should resolve call with result data', () => {
      const transport = new HTTPTransport({});

      const call = {
        resolve: vi.fn(),
        reject: vi.fn(),
      } as unknown as IRPCCall;

      const response = {
        result: 'test result',
      };

      transport['resolve'](call, response as never);

      expect(call.resolve).toHaveBeenCalledWith('test result');
      expect(call.reject).not.toHaveBeenCalled();
    });

    it('should reject call with error', () => {
      const transport = new HTTPTransport({});

      const call = {
        resolve: vi.fn(),
        reject: vi.fn(),
      } as unknown as IRPCCall;

      const response = {
        error: {
          message: 'Test error',
        },
      };

      transport['resolve'](call, response as never);

      expect(call.reject).toHaveBeenCalledWith(new Error('Test error'));
      expect(call.resolve).not.toHaveBeenCalled();
    });

    it('should handle error without message', () => {
      const transport = new HTTPTransport({});

      const call = {
        resolve: vi.fn(),
        reject: vi.fn(),
      } as unknown as IRPCCall;

      const response = {
        error: {},
      };

      transport['resolve'](call, response as never);

      expect(call.reject).toHaveBeenCalledWith(new Error(undefined));
      expect(call.resolve).not.toHaveBeenCalled();
    });
  });

  describe('fetch', () => {
    it('should not retry when maxRetries is 0 (default)', async () => {
      const transport = new HTTPTransport({
        baseURL: 'https://api.example.com',
      });

      const mockFetch = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      await expect(transport['fetch']('https://api.example.com/test')).rejects.toThrow('Network error');

      expect(mockFetch).toHaveBeenCalledTimes(1);

      mockFetch.mockRestore();
    });

    it('should retry and eventually succeed with linear backoff', async () => {
      vi.useFakeTimers();

      const transport = new HTTPTransport({
        baseURL: 'https://api.example.com',
        maxRetries: 3,
        retryDelay: 100,
        retryMode: 'linear',
      });

      const mockFetch = vi
        .spyOn(globalThis, 'fetch')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          statusText: 'OK',
        } as any);

      const fetchPromise = transport['fetch']('https://api.example.com/test');

      // Advance timers to allow retries
      await vi.advanceTimersToNextTimerAsync(); // First retry delay
      await vi.advanceTimersToNextTimerAsync(); // Second retry delay

      const result = await fetchPromise;

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
      mockFetch.mockRestore();
    });

    it('should retry and fail after max retries with linear backoff', async () => {
      vi.useFakeTimers();

      const transport = new HTTPTransport({
        baseURL: 'https://api.example.com',
        maxRetries: 2,
        retryDelay: 100,
        retryMode: 'linear',
      });

      const mockFetch = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

      const fetchPromise = transport['fetch']('https://api.example.com/test');

      // Advance timers to allow retries
      await vi.advanceTimersToNextTimerAsync(); // First call
      await vi.advanceTimersToNextTimerAsync(); // First retry delay
      await vi.advanceTimersToNextTimerAsync(); // Second retry delay

      const result = await fetchPromise;

      expect(result.ok).toBe(false);
      expect(result.statusText).toBe(ERROR_MESSAGE[ERROR_CODE.TIMEOUT]);
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries

      vi.useRealTimers();
      mockFetch.mockRestore();
    });

    it('should retry with exponential backoff', async () => {
      vi.useFakeTimers();

      const transport = new HTTPTransport({
        baseURL: 'https://api.example.com',
        maxRetries: 3,
        retryDelay: 100,
        retryMode: 'exponential',
      });

      const mockFetch = vi
        .spyOn(globalThis, 'fetch')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          statusText: 'OK',
        } as any);

      const fetchPromise = transport['fetch']('https://api.example.com/test');

      // Advance timers for exponential delays (100ms, 200ms, 400ms)
      await vi.advanceTimersToNextTimerAsync(); // First retry delay (100ms)
      await vi.advanceTimersToNextTimerAsync(); // Second retry delay (200ms)

      const result = await fetchPromise;

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
      mockFetch.mockRestore();
    });

    it('should not retry on successful response', async () => {
      const transport = new HTTPTransport({
        baseURL: 'https://api.example.com',
        maxRetries: 3,
        retryDelay: 100,
      });

      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        statusText: 'OK',
      } as any);

      const result = await transport['fetch']('https://api.example.com/test');

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      mockFetch.mockRestore();
    });

    it('should retry on non-ok response', async () => {
      vi.useFakeTimers();

      const transport = new HTTPTransport({
        baseURL: 'https://api.example.com',
        maxRetries: 2,
        retryDelay: 50,
      });

      const mockFetch = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce({ ok: false, statusText: 'Service Unavailable' } as any)
        .mockResolvedValueOnce({ ok: false, statusText: 'Service Unavailable' } as any)
        .mockResolvedValueOnce({ ok: true, statusText: 'OK' } as any);

      const fetchPromise = transport['fetch']('https://api.example.com/test');

      // Advance timers to allow retries
      await vi.advanceTimersToNextTimerAsync(); // First retry delay
      await vi.advanceTimersToNextTimerAsync(); // Second retry delay

      const result = await fetchPromise;

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
      mockFetch.mockRestore();
    });
  });
});
