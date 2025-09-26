import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchState, FetchStatus, subscribe } from '../../src/index.js';

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
    vi.restoreAllMocks();
  });

  describe('Fetch', () => {
    it('should initialize with pending status and default data', async () => {
      global.fetch = vi.fn(() => {
        return Promise.resolve(
          new Response(JSON.stringify(mockUserData), {
            status: 200,
          })
        );
      }) as never;

      const initialState = { message: 'loading...' };
      const state = fetchState(initialState, {
        url: 'https://api.example.com/data',
        method: 'GET',
      });

      expect(state.status).toBe(FetchStatus.Pending);
      expect(state.data).toEqual(initialState);
      expect(state.error).toBeUndefined();
      expect(state.response).toBeUndefined();

      vi.runAllTimers();
    });

    it('should handle successful fetch response', async () => {
      const mockResponse = new Response(JSON.stringify(mockUserData), {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      });

      const mockFetch = vi.fn(() => {
        return Promise.resolve(mockResponse);
      });
      global.fetch = mockFetch as never;

      const initialState = {};
      const state = fetchState(initialState, {
        url: 'https://api.example.com/users/1',
        method: 'GET',
      });

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Success);
      expect(state.data).toEqual(mockUserData);
      expect(state.response).toBe(mockResponse);
      expect(state.error).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({
          url: 'https://api.example.com/users/1',
          method: 'GET',
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should handle successful upstream fetch response', async () => {
      const mockResponse = new Response(JSON.stringify(mockUserData), {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      });

      const mockFetch = vi.fn(() => {
        return Promise.resolve(mockResponse);
      });
      global.fetch = mockFetch as never;

      const initialState = {};
      const state = fetchState(initialState, {
        url: 'https://api.example.com/users/1',
        method: 'post',
        body: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      });

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Success);
      expect(state.data).toEqual(mockUserData);
      expect(state.response).toBe(mockResponse);
      expect(state.error).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({
          url: 'https://api.example.com/users/1',
          method: 'post',
          body: JSON.stringify({
            name: 'John Doe',
            email: 'john@example.com',
          }),
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should handle fetch error response', async () => {
      const mockResponse = new Response(null, {
        status: 404,
        statusText: 'Not Found',
      });

      global.fetch = vi.fn(() => {
        return Promise.resolve(mockResponse);
      }) as never;

      const initialState = {};
      const state = fetchState(initialState, {
        url: 'https://api.example.com/nonexistent',
        method: 'GET',
      });

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Error);
      expect(state.error).toBeDefined();
      expect(state.error?.message).toBe('Not Found');
      expect(state.response).toBe(mockResponse);
    });

    it('should handle network error', async () => {
      const mockError = new Error('Network error');
      global.fetch = vi.fn().mockRejectedValue(mockError) as never;

      const initialState = {};
      const state = fetchState(initialState, {
        url: 'https://api.example.com/data',
        method: 'GET',
      });

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Error);
      expect(state.error).toBe(mockError);
      expect(state.data).toEqual(initialState);
    });

    it('should work with anchorable initial data', () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockUserData),
        status: 200,
        statusText: 'OK',
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse) as never;

      const initialState = {};
      const state = fetchState(initialState, {
        url: 'https://api.example.com/users',
        method: 'GET',
      });

      expect(state.data).toEqual(initialState);
      expect(typeof state.data).toBe('object');
      expect(subscribe.resolve(state.data)).toBeDefined();
    });

    it('should handle conversion to promise', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify([{ a: 1 }])),
      });
      vi.stubGlobal('fetch', mockFetch);

      const state = fetchState([], {
        url: 'https://api.example.com/users',
        method: 'GET',
      });

      const result = await fetchState.promise(state);

      expect(result.data).toEqual([{ a: 1 }]);
      expect(result.status).toBe(FetchStatus.Success);

      // Make sure conversion from a completed state still resolves.
      const result2 = await fetchState.promise(state);
      expect(result2.data).toEqual([{ a: 1 }]);
      expect(result2.status).toBe(FetchStatus.Success);
    });

    it('should handle promise error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      vi.stubGlobal('fetch', mockFetch);

      const handler = vi.fn();
      const state = fetchState([], {
        url: 'https://example.com/data',
      });

      await fetchState.promise(state).catch(handler);

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

      const state = fetchState('', {
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
      expect(mockFetch).toHaveBeenCalledWith(
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
      const state = fetchState(initialState, {
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

  describe('Fetch - Reactivities', () => {
    it('should notify to fetch state changes', async () => {
      const mockResponse = new Response('Hello World', {
        status: 200,
      });
      const mockFetch = vi.fn(() => {
        return Promise.resolve(mockResponse);
      });
      vi.stubGlobal('fetch', mockFetch);

      const subscriber = vi.fn();
      const state = fetchState('', {
        url: 'https://api.example.com/stream',
        method: 'GET',
      });
      const unsubscribe = subscribe(state, subscriber);

      expect(state.status).toBe(FetchStatus.Pending);
      expect(state.data).toBe('');
      expect(state.error).toBeUndefined();

      await vi.runAllTimersAsync();

      expect(state.status).toBe(FetchStatus.Success);
      expect(state.data).toBe('Hello World');
      expect(state.error).toBeUndefined();

      expect(subscriber).toHaveBeenCalledTimes(2);
      expect(subscriber).toHaveBeenNthCalledWith(1, state, { type: 'init', keys: [] });
      expect(subscriber).toHaveBeenNthCalledWith(2, state, {
        type: 'assign',
        keys: [],
        prev: {
          data: '',
          status: FetchStatus.Pending,
        },
        value: {
          status: FetchStatus.Success,
          response: expect.any(Response),
          data: 'Hello World',
        },
      });

      unsubscribe();
    });
  });
});
