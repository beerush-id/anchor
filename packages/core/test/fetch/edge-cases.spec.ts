import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchState, FetchStatus, streamState } from '@anchor/core';

describe('Reactive Fetch - Edge Cases', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
    errorSpy.mockRestore();
  });

  describe('Fetch Edge Cases', () => {
    it('should handle non-JSON response with text content', async () => {
      const mockResponse = new Response('Hello World', {
        headers: {
          'Content-Type': 'text/plain',
        },
        status: 200,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as never;

      const state = fetchState('', {
        url: 'https://api.example.com/text',
        method: 'GET',
      });

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Success);
      expect(state.data).toBe('Hello World');
    });

    it('should handle empty response', async () => {
      const mockResponse = new Response('', {
        headers: {
          'Content-Type': 'text/plain',
        },
        status: 200,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as never;

      const state = fetchState('initial', {
        url: 'https://api.example.com/empty',
        method: 'GET',
      });

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Success);
      expect(state.data).toBe('');
    });

    it('should handle response with invalid JSON', async () => {
      const mockResponse = new Response('{"invalid": json}', {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as never;

      const state = fetchState(
        {},
        {
          url: 'https://api.example.com/invalid-json',
          method: 'GET',
        }
      );

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Error);
      expect(state.error).toBeDefined();
      expect(state.data).toEqual({});
    });

    it('should handle network timeout', async () => {
      // Simulate a fetch that never resolves
      global.fetch = vi.fn().mockImplementation(() => {
        return new Promise(() => {}); // Never resolves
      }) as never;

      const state = fetchState('initial', {
        url: 'https://api.example.com/timeout',
        method: 'GET',
      });

      // Advance timers but not enough to trigger any timeout logic in the implementation
      await vi.advanceTimersByTimeAsync(5000);

      // State should still be pending
      expect(state.status).toBe(FetchStatus.Pending);
      expect(state.data).toBe('initial');
    });

    it('should handle HTTP redirect responses', async () => {
      const mockResponse = new Response(JSON.stringify({ redirected: true }), {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as never;

      const state = fetchState(
        {},
        {
          url: 'https://api.example.com/redirect',
          method: 'GET',
        }
      );

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Success);
      expect(state.data).toEqual({ redirected: true });
    });

    it('should handle different HTTP error status codes', async () => {
      // Test 500 error
      global.fetch = vi.fn().mockResolvedValue(
        new Response('Internal Server Error', {
          status: 500,
          statusText: 'Internal Server Error',
        })
      ) as never;

      const state = fetchState(
        {},
        {
          url: 'https://api.example.com/error',
          method: 'GET',
        }
      );

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Error);
      expect(state.error).toBeDefined();
      expect(state.error?.message).toBe('Internal Server Error');
    });

    it('should handle CORS errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as never;

      const state = fetchState(
        {},
        {
          url: 'https://blocked.example.com/data',
          method: 'GET',
        }
      );

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Error);
      expect(state.error).toBeDefined();
      expect(state.error?.message).toBe('Failed to fetch');
    });

    it('should handle URL with query parameters', async () => {
      const mockResponse = new Response(JSON.stringify({ query: 'test' }), {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as never;

      const state = fetchState(
        {},
        {
          url: 'https://api.example.com/data?param1=value1&param2=value2',
          method: 'GET',
        }
      );

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Success);
      expect(state.data).toEqual({ query: 'test' });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data?param1=value1&param2=value2',
        expect.any(Object)
      );
    });
  });

  describe('Stream Edge Cases', () => {
    it('should handle stream with no chunks', async () => {
      const mockReadable = new ReadableStream({
        start(controller) {
          controller.close(); // Close immediately with no chunks
        },
      });

      const mockResponse = new Response(mockReadable, { status: 200 });
      global.fetch = vi.fn().mockResolvedValue(mockResponse) as never;

      const initialState = 'initial';
      const state = streamState(initialState, {
        url: 'https://api.example.com/empty-stream',
        method: 'GET',
      });

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Success);
      expect(state.data).toBe('initial'); // Should remain unchanged
    });

    it('should handle stream with invalid JSON chunks', async () => {
      const textChunks = ['{"valid": "json"}', '{"invalid": json}', '{"valid2": "json2"}'];

      const encoder = new TextEncoder();
      const mockReadable = new ReadableStream({
        start(controller) {
          for (const chunk of textChunks) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        },
      });

      const mockResponse = new Response(mockReadable, { status: 200 });
      global.fetch = vi.fn().mockResolvedValue(mockResponse) as never;

      const initialState: Record<string, unknown> = {};
      const state = streamState(initialState, {
        url: 'https://api.example.com/invalid-json-stream',
        method: 'GET',
      });

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Success);
      // Should have processed valid chunks and skipped invalid ones
      expect(state.data).toEqual({ valid: 'json', valid2: 'json2' });
    });

    it('should handle stream error mid-stream', async () => {
      const encoder = new TextEncoder();
      const mockReadable = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('{"chunk": 1}'));
          controller.error(new Error('Stream error'));
        },
      });

      const mockResponse = new Response(mockReadable, { status: 200 });
      global.fetch = vi.fn().mockResolvedValue(mockResponse) as never;

      const initialState: Record<string, unknown> = {};
      const state = streamState(initialState, {
        url: 'https://api.example.com/error-stream',
        method: 'GET',
      });

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Error);
      expect(state.error).toBeDefined();
    });

    it('should handle stream with binary data', async () => {
      const binaryData = new Uint8Array([0, 1, 2, 3, 4, 5]);
      const mockReadable = new ReadableStream({
        start(controller) {
          controller.enqueue(binaryData);
          controller.close();
        },
      });

      const mockResponse = new Response(mockReadable, { status: 200 });
      global.fetch = vi.fn().mockResolvedValue(mockResponse) as never;

      const initialState = new Uint8Array();
      const state = streamState(initialState, {
        url: 'https://api.example.com/binary-stream',
        method: 'GET',
      });

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Success);
      // For binary data, we might not be able to do much other than complete successfully
    });

    it('should handle stream with delayed chunks', async () => {
      const textChunks = ['Hello', ' ', 'World'];

      const encoder = new TextEncoder();
      const mockReadable = new ReadableStream({
        async start(controller) {
          for (const chunk of textChunks) {
            controller.enqueue(encoder.encode(chunk));
            await new Promise((resolve) => setTimeout(resolve, 50)); // Delay between chunks
          }
          controller.close();
        },
      });

      const mockResponse = new Response(mockReadable, { status: 200 });
      global.fetch = vi.fn().mockResolvedValue(mockResponse) as never;

      const initialState = '';
      const state = streamState(initialState, {
        url: 'https://api.example.com/delayed-stream',
        method: 'GET',
      });

      // Run all timers to completion
      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Success);
      expect(state.data).toBe('Hello World');
    });
  });
});
