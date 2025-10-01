import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@solidjs/testing-library';
import { fetchRef, streamRef } from '../../src/fetch';

describe('Anchor Solid - Fetch', () => {
  const globalFetch = global.fetch;

  afterEach(() => {
    global.fetch = globalFetch;
  });

  describe('fetchRef', () => {
    describe('Basic Usage', () => {
      it('should create a fetch state with initial value', () => {
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

        const initialData = { name: 'test' };
        const options = { url: '/api/test', method: 'GET' as const };
        const { result } = renderHook(() => fetchRef(initialData, options));

        expect(result.data).toEqual(initialData);
        expect(result.status).toBeDefined();
        expect(typeof result.fetch).toBe('function');
      });
    });
  });

  describe('streamRef', () => {
    describe('Basic Usage', () => {
      it('should create a stream state with initial value', () => {
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

        const initialData = { name: 'test' };
        const options = { url: '/api/stream', method: 'GET' as const, onData: () => {} };
        const { result } = renderHook(() => streamRef(initialData, options));

        expect(result.data).toEqual(initialData);
        expect(result.status).toBeDefined();
        expect(typeof result.fetch).toBe('function');
      });
    });
  });
});
