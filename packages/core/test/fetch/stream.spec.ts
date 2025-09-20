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

    it('should handle successful upstream stream response with string chunks', async () => {
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
        method: 'post',
        body: {
          name: 'John Doe',
          age: 30,
        },
      });

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Success);
      expect(state.data).toBe('Hello World!');
      expect(state.error).toBeUndefined();
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/stream',
        expect.objectContaining({
          url: 'https://api.example.com/stream',
          method: 'post',
          body: JSON.stringify({
            name: 'John Doe',
            age: 30,
          }),
          signal: expect.any(AbortSignal),
        })
      );
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
      const encoder = new TextEncoder();

      // Test with different types of chunks
      const testCases = [
        {
          initialData: '',
          expected: 'done chunk',
          chunk: 'done chunk',
        },
        {
          initialData: undefined,
          expected: 'done chunk',
          chunk: 'done chunk',
        },
        {
          initialData: undefined,
          expected: { text: 'done chunk' },
          chunk: { text: 'done chunk' },
        },
        {
          initialData: undefined,
          expected: ['done chunk'],
          chunk: ['done chunk'],
        },
      ];

      for (const testCase of testCases) {
        const reader = {
          read() {
            return {
              done: true,
              value: encoder.encode(
                typeof testCase.chunk === 'string' ? testCase.chunk : JSON.stringify(testCase.chunk)
              ),
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

        const state = streamState(testCase.initialData, {
          url: 'https://example.com',
          method: 'GET',
        });

        await vi.runAllTimersAsync();

        expect(state.status).toBe(FetchStatus.Success);
        expect(state.data).toEqual(testCase.expected);
        expect(state.response?.status).toBe(mockResponse.status);
      }
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
        method: 'post',
        body: { title: 'foo' },
        deferred: true,
      });

      expect(state.status).toBe(FetchStatus.Idle);
      expect(state.data).toEqual('');

      state.fetch();

      expect(state.status).toBe(FetchStatus.Pending);
      expect(state.data).toEqual('');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://jsonplaceholder.typicode.com/posts',
        expect.objectContaining({
          url: 'https://jsonplaceholder.typicode.com/posts',
          method: 'post',
          body: JSON.stringify({ title: 'foo' }),
          signal: expect.any(AbortSignal),
        })
      );

      state.fetch(); // Should not re-trigger the fetch.
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Success);
      expect(state.data).toEqual('Hello World');

      state.fetch({ body: { title: 'bar' } });
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://jsonplaceholder.typicode.com/posts',
        expect.objectContaining({
          url: 'https://jsonplaceholder.typicode.com/posts',
          method: 'post',
          body: JSON.stringify({ title: 'bar' }),
          signal: expect.any(AbortSignal),
        })
      );

      await vi.runAllTimersAsync();
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

  describe('Stream - Readable', () => {
    it('should create a readable stream from initial value', () => {
      const initialState = 'initial';
      const [state, stream] = streamState.readable(initialState);

      expect(state.data).toBe(initialState);
      expect(state.status).toBe(FetchStatus.Idle);
      expect(stream).toBeInstanceOf(ReadableStream);
    });

    it('should enqueue string data to the stream', async () => {
      const initialState = '';
      const [state, stream] = streamState.readable(initialState);

      const chunks: string[] = [];
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      // Read in background
      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(decoder.decode(value as never));
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_error) {
          // Ignore for this test
        }
      })().catch(() => {});

      // Update state
      state.data = 'Hello';
      state.data = 'Hello World';

      // Mark as success to close stream
      state.status = FetchStatus.Success;

      // Wait a bit for async operations
      await vi.runAllTimersAsync();

      expect(chunks).toEqual(['', 'Hello', 'Hello World']);
    });

    it('should enqueue JSON stringifies object data to the stream', async () => {
      const initialState = {};
      const [state, stream] = streamState.readable(initialState);

      const chunks: string[] = [];
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      // Read in background
      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(decoder.decode(value as never));
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          // Ignore for this test
        }
      })().catch(() => {});

      // Update state
      state.data = { message: 'Hello' };
      state.data = { message: 'Hello', count: 1 };

      // Mark as success to close stream
      state.status = FetchStatus.Success;

      // Wait a bit for async operations
      await vi.runAllTimersAsync();

      expect(chunks).toEqual([
        JSON.stringify({}),
        JSON.stringify({ message: 'Hello' }),
        JSON.stringify({ message: 'Hello', count: 1 }),
      ]);
    });

    it('should close the stream when status becomes Success', async () => {
      const initialState = '';
      const [state, stream] = streamState.readable(initialState);

      let value: string | undefined;
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      // Start reading
      (async () => {
        try {
          while (true) {
            const result = await reader.read();
            if (result.done) break;
            value = decoder.decode(result.value as never);
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          // Ignore for this test
        }
      })().catch(() => {});

      // Update state
      state.data = 'test';
      state.status = FetchStatus.Success;

      // Wait a bit for async operations
      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Success);
      expect(value).toBe('test');
    });

    it('should error the stream when status becomes Error', async () => {
      const initialState = '';
      const [state, stream] = streamState.readable(initialState);

      let errorThrown = false;
      let errorValue: Error | undefined;

      const reader = stream.getReader();

      // Start reading
      const promise = (async () => {
        try {
          while (true) {
            const result = await reader.read();
            if (result.done) break;
          }
        } catch (error) {
          errorThrown = true;
          errorValue = error as Error;
        }
      })();

      // Update state
      state.data = 'test';
      state.status = FetchStatus.Error;

      // Wait a bit for async operations
      await promise.catch();
      await vi.runAllTimersAsync();

      expect(errorThrown).toBe(true);
      expect(errorValue).toBeInstanceOf(Error);
    });

    it('should handle edge case with undefined initial data', async () => {
      const [state, stream] = streamState.readable(undefined);

      const chunks: string[] = [];
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      // Read in background
      const promise = (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(decoder.decode(value as never));
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_error) {
          // Ignore for this test
        }
      })().catch(() => {});

      // Update state
      state.data = 'defined value' as never;
      state.status = FetchStatus.Success;

      // Wait a bit for async operations
      await promise.catch();

      expect(chunks).toEqual(['defined value']);
      expect(state.data).toBe('defined value');
    });

    it('should handle edge case with null initial data', async () => {
      const [state, stream] = streamState.readable(null);

      const chunks: string[] = [];
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      // Read in background
      const promise = (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(decoder.decode(value as never));
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_error) {
          // Ignore for this test
        }
      })().catch(() => {});

      // Update state
      state.data = 'not null' as never;
      state.status = FetchStatus.Success;

      // Wait a bit for async operations
      await promise;

      expect(chunks).toEqual([JSON.stringify(null), 'not null']);
    });

    it('should handle edge case with number initial data', async () => {
      const [state, stream] = streamState.readable(42);

      const chunks: string[] = [];
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      // Read in background
      const promise = (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(decoder.decode(value as never));
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_error) {
          // Ignore for this test
        }
      })().catch(() => {});

      // Update state
      state.data = 100;
      state.status = FetchStatus.Success;

      // Wait a bit for async operations
      await promise;

      expect(chunks).toEqual(['42', '100']);
    });
  });
});
