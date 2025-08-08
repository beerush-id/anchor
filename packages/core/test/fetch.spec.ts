import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchState, FetchStatus, streamState } from '../src/fetch/index.js';
import { derive } from '../src/derive.js';

describe('Reactive Fetch', () => {
  const mockUserData = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
  };

  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Fetch', () => {
    it('should initialize with pending status and default data', () => {
      global.fetch = vi.fn(() => {
        return Promise.resolve(
          new Response(JSON.stringify(mockUserData), {
            status: 200,
          })
        );
      });

      const initialState = { message: 'loading...' };
      const state = fetchState(initialState, {
        url: 'https://api.example.com/data',
        method: 'GET',
      });

      expect(state.status).toBe(FetchStatus.Pending);
      expect(state.data).toEqual(initialState);
      expect(state.error).toBeUndefined();
      expect(state.response).toBeUndefined();
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
      global.fetch = mockFetch;

      const initialState = {};
      const state = fetchState(initialState, {
        url: 'https://api.example.com/users/1',
        method: 'GET',
      });

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(state.status).toBe(FetchStatus.Success);
      expect(state.data).toEqual(mockUserData);
      expect(state.response).toBe(mockResponse);
      expect(state.error).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/users/1', {
        url: 'https://api.example.com/users/1',
        method: 'GET',
      });
    });

    it('should handle fetch error response', async () => {
      const mockResponse = new Response(null, {
        status: 404,
        statusText: 'Not Found',
      });

      global.fetch = vi.fn(() => {
        return Promise.resolve(mockResponse);
      });

      const initialState = {};
      const state = fetchState(initialState, {
        url: 'https://api.example.com/nonexistent',
        method: 'GET',
      });

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(state.status).toBe(FetchStatus.Error);
      expect(state.error).toBeDefined();
      expect(state.error?.message).toBe('Not Found');
      expect(state.response).toBe(mockResponse);
    });

    it('should handle network error', async () => {
      const mockError = new Error('Network error');
      global.fetch = vi.fn().mockRejectedValue(mockError);

      const initialState = {};
      const state = fetchState(initialState, {
        url: 'https://api.example.com/data',
        method: 'GET',
      });

      await new Promise((resolve) => setTimeout(resolve, 0));

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

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const initialState = {};
      const state = fetchState(initialState, {
        url: 'https://api.example.com/users',
        method: 'GET',
      });

      expect(state.data).toEqual(initialState);
      expect(typeof state.data).toBe('object');
      expect(derive.resolve(state.data)).toBeDefined();
    });
  });

  describe('Stream', () => {
    it('should initialize with pending status and default data', () => {
      global.fetch = vi.fn(() => {
        return Promise.resolve(new Response(JSON.stringify(mockUserData), { status: 200 }));
      });

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

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const initialState = '';
      const state = streamState(initialState, {
        url: 'https://api.example.com/stream',
        method: 'GET',
      });

      await new Promise((resolve) => setTimeout(resolve, 0));

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

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const initialState: Record<string, unknown> = {};
      const state = streamState(initialState, {
        url: 'https://api.example.com/stream',
        method: 'GET',
      });

      await new Promise((resolve) => setTimeout(resolve, 0));

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

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const initialState: unknown[] = [];
      const state = streamState(initialState, {
        url: 'https://api.example.com/stream',
        method: 'GET',
      });

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(state.status).toBe(FetchStatus.Success);
      expect(state.data).toEqual([1, 2, 3, 4, 5, 6]);
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

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const initialState = '';
      const state = streamState(initialState, {
        url: 'https://api.example.com/stream',
        method: 'GET',
        transform: (current, chunk) => `[${chunk}]`,
      });

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(state.status).toBe(FetchStatus.Success);
      expect(state.data).toBe('[Hello][ ][World]');
    });

    it('should handle invalid response body', async () => {
      const mockResponse = {
        ok: true,
        body: null,
        status: 200,
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const initialState = '';
      const state = streamState(initialState, {
        url: 'https://api.example.com/stream',
        method: 'GET',
      });

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(state.status).toBe(FetchStatus.Error);
      expect(state.error).toBeDefined();
      expect(state.error?.message).toContain('Invalid response body');
    });

    it('should handle fetch error in stream', async () => {
      const mockError = new Error('Network error');
      global.fetch = vi.fn().mockRejectedValue(mockError);

      const initialState = '';
      const state = streamState(initialState, {
        url: 'https://api.example.com/stream',
        method: 'GET',
      });

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(state.status).toBe(FetchStatus.Error);
      expect(state.error).toBe(mockError);
    });
  });

  describe('Reactivities', () => {
    it('should notify to fetch state changes', async () => {
      global.fetch = vi.fn().mockResolvedValue(new Response('Ok', { status: 200 }));

      const subscriber = vi.fn();
      const state = fetchState('', {
        url: 'https://api.example.com/data',
        method: 'GET',
      });
      const unsubscribe = derive(state, subscriber);

      expect(state.status).toBe(FetchStatus.Pending);
      expect(state.data).toBe('');
      expect(state.error).toBeUndefined();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(state.status).toBe(FetchStatus.Success);
      expect(state.data).toBe('Ok');

      expect(subscriber).toHaveBeenCalledTimes(2); // Init + Success.
      expect(subscriber).toHaveBeenNthCalledWith(1, state, { type: 'init', keys: [] });
      expect(subscriber).toHaveBeenNthCalledWith(2, state, {
        type: 'assign',
        keys: [],
        prev: {
          data: '',
          status: FetchStatus.Pending,
        },
        value: {
          data: 'Ok',
          status: FetchStatus.Success,
          response: expect.any(Response),
        },
      });

      unsubscribe();
    });

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
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const subscriber = vi.fn();
      const state = streamState('', {
        url: 'https://api.example.com/stream',
        method: 'GET',
      });
      const unsubscribe = derive(state, subscriber);

      expect(state.status).toBe(FetchStatus.Pending);
      expect(state.data).toBe('');
      expect(state.error).toBeUndefined();

      await new Promise((resolve) => setTimeout(resolve, 0));

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
