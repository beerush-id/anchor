import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useFetch, useStream } from '../../src/fetch';
import { setDevMode } from '../../src/dev';
import { FetchStatus } from '@anchorlib/core';

describe('Anchor React - Fetch', () => {
  const originalFetch = global.fetch;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Use fake timers like in core tests
    vi.useFakeTimers();

    // Disable dev mode to prevent console warnings
    setDevMode(false);

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    errorSpy.mockRestore();
    // Clean up like in core tests
    vi.useRealTimers();
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('useFetch', () => {
    it('should create a fetch state with initial value and idle status', () => {
      const initialData = { name: 'test' };
      const options = { url: '/api/test', method: 'GET' as const };

      const { result } = renderHook(() => useFetch(initialData, options));

      const [value, ref, setter] = result.current;

      expect(value.data).toEqual(initialData);
      expect(value.status).toBe(FetchStatus.Idle);
      expect(value.error).toBeUndefined();
      expect(typeof value.fetch).toBe('function');
      expect(typeof value.abort).toBe('function');

      expect(ref.value.data).toEqual(initialData);
      expect(typeof setter).toBe('function');
    });

    it('should handle successful fetch requests when triggered manually', async () => {
      // Create a real fetch mock that resolves with proper response
      const mockFetch = vi.fn().mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          text: () => Promise.resolve(JSON.stringify({ items: [{ id: 1, name: 'item1' }] })),
          json: () => Promise.resolve({ items: [{ id: 1, name: 'item1' }] }),
        });
      });
      global.fetch = mockFetch as never;

      const initialData = { items: [] };
      const options = { url: '/api/items', method: 'GET' as const };
      const { result } = renderHook(() => useFetch(initialData, options));

      // Initially should have initial data and idle status
      expect(result.current[0].data).toEqual(initialData);
      expect(result.current[0].status).toBe(FetchStatus.Idle);

      // Trigger fetch manually
      act(() => {
        result.current[0].fetch();
      });

      // Should immediately switch to pending
      expect(result.current[0].status).toBe(FetchStatus.Pending);

      // Advance timers to resolve the fetch
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Should have fetched data and success status
      expect(result.current[0].data).toEqual({ items: [{ id: 1, name: 'item1' }] });
      expect(result.current[0].status).toBe(FetchStatus.Success);
      expect(result.current[0].error).toBeUndefined();
    });

    it('should handle fetch errors', async () => {
      // Create a real fetch mock that rejects
      const mockError = new Error('Network error');
      const mockFetch = vi.fn().mockImplementation(() => Promise.reject(mockError));
      global.fetch = mockFetch as never;

      const initialData = { items: [] };
      const options = { url: '/api/items', method: 'GET' as const };
      const { result } = renderHook(() => useFetch(initialData, options));

      // Initially should have initial data and idle status
      expect(result.current[0].data).toEqual(initialData);
      expect(result.current[0].status).toBe(FetchStatus.Idle);

      // Trigger fetch
      act(() => {
        result.current[0].fetch();
      });

      // Should immediately switch to pending
      expect(result.current[0].status).toBe(FetchStatus.Pending);

      // Advance timers to resolve the fetch
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Should have error status
      expect(result.current[0].data).toEqual(initialData); // Data unchanged
      expect(result.current[0].status).toBe(FetchStatus.Error);
      expect(result.current[0].error).toBe(mockError);
    });

    it('should handle POST requests with body', async () => {
      // Create a real fetch mock that resolves with proper response
      let fetchCallArgs: any[] = [];
      const mockFetch = vi.fn().mockImplementation((...args: any[]) => {
        fetchCallArgs = args;
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          text: () => Promise.resolve(JSON.stringify({ id: 1, name: 'new item' })),
          json: () => Promise.resolve({ id: 1, name: 'new item' }),
        });
      });
      global.fetch = mockFetch as never;

      const initialData = { id: 0, name: '' };
      const requestBody = { name: 'new item' };
      const options = {
        url: '/api/items',
        method: 'POST' as const,
        body: JSON.stringify(requestBody),
      };

      const { result } = renderHook(() => useFetch(initialData, options));

      // Trigger fetch
      act(() => {
        result.current[0].fetch();
      });

      // Should immediately switch to pending
      expect(result.current[0].status).toBe(FetchStatus.Pending);

      // Advance timers to resolve the fetch
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Should have fetched data
      expect(result.current[0].data).toEqual({ id: 1, name: 'new item' });
      expect(result.current[0].status).toBe(FetchStatus.Success);

      // Check that fetch was called with correct parameters
      expect(fetchCallArgs[0]).toBe('/api/items');
      expect(fetchCallArgs[1]).toMatchObject({
        method: 'POST',
      });
    });
  });

  describe('useStream', () => {
    it('should create a stream state with initial value and idle status', () => {
      const initialData = '';
      const options = { url: '/api/stream', method: 'GET' as const };

      const { result } = renderHook(() => useStream(initialData, options));

      const [value, ref, setter] = result.current;

      expect(value.data).toEqual(initialData);
      expect(value.status).toBe(FetchStatus.Idle);
      expect(value.error).toBeUndefined();
      expect(typeof value.fetch).toBe('function');
      expect(typeof value.abort).toBe('function');

      expect(ref.value.data).toEqual(initialData);
      expect(typeof setter).toBe('function');
    });

    it('should handle stream fetch requests when triggered manually', async () => {
      // Create a proper ReadableStream mock that simulates streaming JSON data
      const jsonChunks = [JSON.stringify({ id: 1, content: 'item1' }), JSON.stringify({ id: 2, content: 'item2' })];

      const encoder = new TextEncoder();
      let readCount = 0;

      const mockReader = {
        read: vi.fn().mockImplementation(() => {
          if (readCount < jsonChunks.length) {
            const chunk = jsonChunks[readCount];
            readCount++;
            return Promise.resolve({
              done: false,
              value: encoder.encode(chunk),
            });
          } else {
            return Promise.resolve({
              done: true,
              value: undefined,
            });
          }
        }),
        releaseLock: vi.fn(),
      };

      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        body: {
          getReader: () => mockReader,
        },
      };

      const mockFetch = vi.fn().mockResolvedValue(mockResponse);
      global.fetch = mockFetch as never;

      const initialData = { items: [] };
      const options = { url: '/api/stream', method: 'GET' as const };
      const { result } = renderHook(() => useStream(initialData, options));

      // Initially should have initial data and idle status
      expect(result.current[0].data).toEqual(initialData);
      expect(result.current[0].status).toBe(FetchStatus.Idle);

      // Trigger fetch
      act(() => {
        result.current[0].fetch();
      });

      // Should immediately switch to pending
      expect(result.current[0].status).toBe(FetchStatus.Pending);

      // Advance timers to resolve the fetch
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Should have success status
      expect(result.current[0].status).toBe(FetchStatus.Success);
      expect(result.current[0].error).toBeUndefined();
    });

    it('should handle stream fetch errors', async () => {
      // Create a real fetch mock that rejects
      const mockError = new Error('Stream error');
      const mockFetch = vi.fn().mockImplementation(() => Promise.reject(mockError));
      global.fetch = mockFetch as never;

      const initialData = '';
      const options = { url: '/api/stream', method: 'GET' as const };
      const { result } = renderHook(() => useStream(initialData, options));

      // Initially should have initial data and idle status
      expect(result.current[0].data).toEqual(initialData);
      expect(result.current[0].status).toBe(FetchStatus.Idle);

      // Trigger fetch
      act(() => {
        result.current[0].fetch();
      });

      // Should immediately switch to pending
      expect(result.current[0].status).toBe(FetchStatus.Pending);

      // Advance timers to resolve the fetch
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Should have error
      expect(result.current[0].status).toBe(FetchStatus.Error);
      expect(result.current[0].error).toBe(mockError);
    });

    it('should handle POST stream requests with body', async () => {
      // Create a proper ReadableStream mock that simulates streaming JSON data
      const jsonChunks = [JSON.stringify({ id: 1, title: 'result1' }), JSON.stringify({ id: 2, title: 'result2' })];

      const encoder = new TextEncoder();
      let readCount = 0;

      const mockReader = {
        read: vi.fn().mockImplementation(() => {
          if (readCount < jsonChunks.length) {
            const chunk = jsonChunks[readCount];
            readCount++;
            return Promise.resolve({
              done: false,
              value: encoder.encode(chunk),
            });
          } else {
            return Promise.resolve({
              done: true,
              value: undefined,
            });
          }
        }),
        releaseLock: vi.fn(),
      };

      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        body: {
          getReader: () => mockReader,
        },
      };

      let fetchCallArgs: any[] = [];
      const mockFetch = vi.fn().mockImplementation((...args: any[]) => {
        fetchCallArgs = args;
        return Promise.resolve(mockResponse);
      });
      global.fetch = mockFetch as never;

      const initialData = { results: [] };
      const requestBody = { query: 'test search' };
      const options = {
        url: '/api/search/stream',
        method: 'POST' as const,
        body: JSON.stringify(requestBody),
      };

      const { result } = renderHook(() => useStream(initialData, options));

      // Trigger fetch
      act(() => {
        result.current[0].fetch();
      });

      // Should immediately switch to pending
      expect(result.current[0].status).toBe(FetchStatus.Pending);

      // Advance timers to resolve the fetch
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Should have success status
      expect(result.current[0].status).toBe(FetchStatus.Success);

      // Check that fetch was called with correct parameters
      expect(fetchCallArgs[0]).toBe('/api/search/stream');
      expect(fetchCallArgs[1]).toMatchObject({
        method: 'POST',
      });
    });
  });
});
