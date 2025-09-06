import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { derive, FetchStatus, streamState } from '../../src/index.js';

describe('Reactive Request', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  const mockUserData = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
  };

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
    vi.resetAllMocks();
  });

  describe('Stream', () => {
    it('should initialize with pending status and default data', () => {
      global.fetch = vi.fn(() => {
        return Promise.resolve(new Response(JSON.stringify(mockUserData), { status: 200 }));
      }) as never;

      const initialState = 'loading...';
      const state = streamState(initialState, {
        url: 'https://api.example.com/stream',
        method: 'GET',
      });

      expect(state.status).toBe(FetchStatus.Pending);
      expect(state.data).toBe(initialState);
      expect(state.error).toBeUndefined();
      expect(state.response).toBeUndefined();
    });

    it('should handle successful stream response with string chunks', async () => {
      const textChunks = ['Hello', ' ', 'World', '!'];

      const encoder = new TextEncoder();
      const mockReadable = new ReadableStream({
        async start(controller) {
          for (const chunk of textChunks) {
            controller.enqueue(encoder.encode(chunk));
          }

          controller.close();
        },
      });

      const mockResponse = new Response(mockReadable, { status: 200 });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as never;

      const initialState = '';
      const state = streamState(initialState, {
        url: 'https://api.example.com/stream',
        method: 'GET',
      });

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Success);
      expect(state.data).toBe('Hello World!');
      expect(state.error).toBeUndefined();
    });

    it('should handle successful stream response with JSON chunks', async () => {
      const jsonChunks = [JSON.stringify({ id: 1, name: 'John' }), JSON.stringify({ id: 2, name: 'Jane' })];

      const encoder = new TextEncoder();
      const mockReadable = new ReadableStream({
        start: (controller) => {
          for (const chunk of jsonChunks) {
            controller.enqueue(encoder.encode(chunk));
          }

          controller.close();
        },
      });

      const mockResponse = new Response(mockReadable, { status: 200 });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as never;

      const initialState: Record<string, unknown> = {};
      const state = streamState(initialState, {
        url: 'https://api.example.com/stream',
        method: 'GET',
      });

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Success);
      expect(state.data).toEqual({ id: 2, name: 'Jane' });
    });

    it('should handle successful stream response with array chunks', async () => {
      const arrayChunks = [
        [1, 2, 3],
        [4, 5, 6],
      ];

      const encoder = new TextEncoder();
      const mockReadable = new ReadableStream({
        start: (controller) => {
          for (const chunk of arrayChunks) {
            controller.enqueue(encoder.encode(JSON.stringify(chunk)));
          }

          controller.close();
        },
      });

      const mockResponse = new Response(mockReadable, { status: 200 });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as never;

      const initialState: unknown[] = [];
      const state = streamState(initialState, {
        url: 'https://api.example.com/stream',
        method: 'GET',
      });

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Success);
      expect(state.data).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should handle fetch error response', async () => {
      const mockResponse = new Response('', { status: 500, statusText: 'Internal server error' });
      global.fetch = vi.fn().mockResolvedValue(mockResponse) as never;

      const state = streamState('', {
        url: 'https://api.example.com/stream',
        method: 'GET',
      });

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Error);
      expect(state.error).toBeDefined();
      expect(state.error?.message).toBe('Internal server error');
      expect(state.response).toBe(mockResponse);
    });

    it('should handle stream with transform function', async () => {
      const textChunks = ['Hello', ' ', 'World'];

      const encoder = new TextEncoder();
      const mockReadable = new ReadableStream({
        start: (controller) => {
          for (const chunk of textChunks) {
            controller.enqueue(encoder.encode(chunk));
          }

          controller.close();
        },
      });

      const mockResponse = new Response(mockReadable, { status: 200 });

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as never;

      const initialState = '';
      const state = streamState(initialState, {
        url: 'https://api.example.com/stream',
        method: 'GET',
        transform: (current, chunk) => `[${chunk}]`,
      });

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Success);
      expect(state.data).toBe('[Hello][ ][World]');
    });

    it('should handle invalid response body', async () => {
      const mockResponse = {
        ok: true,
        body: null,
        status: 200,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as never;

      const initialState = '';
      const state = streamState(initialState, {
        url: 'https://api.example.com/stream',
        method: 'GET',
      });

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Error);
      expect(state.error).toBeDefined();
      expect(state.error?.message).toContain('Invalid response body');
    });

    it('should handle fetch error in stream', async () => {
      const mockError = new Error('Network error');
      global.fetch = vi.fn().mockRejectedValue(mockError) as never;

      const initialState = '';
      const state = streamState(initialState, {
        url: 'https://api.example.com/stream',
        method: 'GET',
      });

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Error);
      expect(state.error).toBe(mockError);
    });

    it('should handle done stream contains value', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let jsonChunk: any = undefined;

      const encoder = new TextEncoder();
      const reader = {
        read() {
          return {
            done: true,
            value: encoder.encode(jsonChunk ? JSON.stringify(jsonChunk) : 'done' + ' chunk'),
          };
        },
      };
      const mockReadable = {
        getReader: () => reader,
      };
      const mockResponse = {
        body: mockReadable,
        status: 200,
        ok: true,
      } as never as Response;

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as never;

      const state = streamState('', {
        url: 'https://example.com',
        method: 'GET',
      });

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Success);
      expect(state.data).toBe('done chunk');
      expect(state.response?.status).toBe(mockResponse.status);

      // Handle undefined as Init.

      // Text chunk.
      const undefState = streamState(undefined, {
        url: 'https://example.com',
        method: 'GET',
      });

      await vi.runAllTimersAsync();

      expect(undefState.status).toBe(FetchStatus.Success);
      expect(undefState.data).toBe('done chunk');
      expect(undefState.response?.status).toBe(mockResponse.status);

      expect(state.response?.status).toBe(mockResponse.status);

      // Object chunk.
      jsonChunk = { text: 'done chunk' };
      const objState = streamState(undefined, {
        url: 'https://example.com',
        method: 'GET',
      });

      await vi.runAllTimersAsync();

      expect(objState.status).toBe(FetchStatus.Success);
      expect(objState.data).toEqual(jsonChunk);
      expect(objState.response?.status).toBe(mockResponse.status);

      // Array chunk.
      jsonChunk = ['done chunk'];
      const arrState = streamState(undefined, {
        url: 'https://example.com',
        method: 'GET',
      });

      await vi.runAllTimersAsync();

      expect(arrState.status).toBe(FetchStatus.Success);
      expect(arrState.data).toEqual(jsonChunk);
      expect(arrState.response?.status).toBe(mockResponse.status);
    });

    it('should handle conversion to promise', async () => {
      const textChunks = ['Hello', ' ', 'World'];

      const encoder = new TextEncoder();
      const mockReadable = new ReadableStream({
        start: (controller) => {
          for (const chunk of textChunks) {
            controller.enqueue(encoder.encode(chunk));
          }

          controller.close();
        },
      });

      const mockResponse = new Response(mockReadable, { status: 200 });
      global.fetch = vi.fn().mockResolvedValue(mockResponse) as never;

      const state = streamState('', {
        url: 'https://example.com/api/data',
        method: 'GET',
      });
      const result = await streamState.promise(state);

      expect(result.data).toBe('Hello World');
      expect(result.status).toBe(FetchStatus.Success);

      // Make sure conversion from a completed state still resolves.
      const result2 = await streamState.promise(state);

      expect(result2.data).toBe('Hello World');
      expect(result2.status).toBe(FetchStatus.Success);
    });

    it('should handle promise error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      vi.stubGlobal('fetch', mockFetch);

      const handler = vi.fn();
      const state = streamState([], {
        url: 'https://example.com/data',
      });

      await streamState.promise(state).catch(handler);

      expect(state.status).toBe(FetchStatus.Error);
      expect(handler).toHaveBeenCalled();
    });

    it('should defer the fetch request', async () => {
      const mockResponse = new Response('Hello World', {
        status: 200,
      });
      const mockFetch = vi.fn(() => {
        return Promise.resolve(mockResponse);
      });
      vi.stubGlobal('fetch', mockFetch);

      const state = streamState('', {
        url: 'https://jsonplaceholder.typicode.com/posts',
        method: 'GET',
        deferred: true,
      });

      expect(state.status).toBe(FetchStatus.Idle);
      expect(state.data).toEqual('');

      state.fetch();

      expect(state.status).toBe(FetchStatus.Pending);
      expect(state.data).toEqual('');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      state.fetch(); // Should not re-trigger the fetch.
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Success);
      expect(state.data).toEqual('Hello World');
    });

    it('should handle aborting the fetch request', async () => {
      const mockFetch = vi.fn((url, options) => {
        return new Promise((resolve, reject) => {
          const abortSignal = options.signal;

          abortSignal.addEventListener('abort', () => {
            reject(new Error('Request aborted'));
          });

          // Simulate a delayed response
          setTimeout(() => {
            if (!abortSignal.aborted) {
              resolve(
                new Response(JSON.stringify(mockUserData), {
                  status: 200,
                  headers: {
                    'Content-Type': 'application/json',
                  },
                })
              );
            }
          }, 100);
        });
      });

      vi.stubGlobal('fetch', mockFetch);

      const initialState = {};
      const state = streamState(initialState, {
        url: 'https://api.example.com/users/1',
        method: 'GET',
      });

      expect(state.status).toBe(FetchStatus.Pending);

      // Abort the request
      state.abort();

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Error);
      expect(state.error).toBeDefined();
      expect(state.error?.message).toBe('Request aborted');
    });
  });

  describe('Stream - Reactivities', () => {
    it('should notify to stream state changes', async () => {
      const chunks = ['Hello', ' ', 'World'];
      const encoder = new TextEncoder();
      const mockReadable = new ReadableStream({
        start: (controller) => {
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(chunk));
          }

          controller.close();
        },
      });
      const mockResponse = new Response(mockReadable, { status: 200 });
      global.fetch = vi.fn().mockResolvedValue(mockResponse) as never;

      const subscriber = vi.fn();
      const state = streamState('', {
        url: 'https://api.example.com/stream',
        method: 'GET',
      });
      const unsubscribe = derive(state, subscriber);

      expect(state.status).toBe(FetchStatus.Pending);
      expect(state.data).toBe('');
      expect(state.error).toBeUndefined();

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Success);
      expect(state.data).toBe('Hello World');
      expect(state.error).toBeUndefined();

      expect(subscriber).toHaveBeenCalledTimes(5);
      expect(subscriber).toHaveBeenNthCalledWith(1, state, { type: 'init', keys: [] });
      expect(subscriber).toHaveBeenNthCalledWith(2, state, {
        type: 'set',
        keys: ['data'],
        prev: '',
        value: 'Hello',
      });
      expect(subscriber).toHaveBeenNthCalledWith(3, state, {
        type: 'set',
        keys: ['data'],
        prev: 'Hello',
        value: 'Hello ',
      });
      expect(subscriber).toHaveBeenNthCalledWith(4, state, {
        type: 'set',
        keys: ['data'],
        prev: 'Hello ',
        value: 'Hello World',
      });
      expect(subscriber).toHaveBeenNthCalledWith(5, state, {
        type: 'assign',
        keys: [],
        prev: {
          status: FetchStatus.Pending,
        },
        value: {
          status: FetchStatus.Success,
          response: expect.any(Response),
        },
      });
      unsubscribe();
    });
  });
});
