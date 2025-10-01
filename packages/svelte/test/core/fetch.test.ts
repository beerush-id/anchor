import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import FetchBasic from './fetch/fetch-basic.svelte';
import StreamBasic from './fetch/stream-basic.svelte';

describe('Anchor Svelte - Fetch', () => {
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

        render(FetchBasic);

        expect(screen.getByTestId('data-name').textContent).toBe('test');
        // We can't easily test the fetch function exists in Svelte like we do in Vue
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

        render(StreamBasic);

        expect(screen.getByTestId('data-name').textContent).toBe('test');
        // We can't easily test the fetch function exists in Svelte like we do in Vue
      });
    });
  });
});
