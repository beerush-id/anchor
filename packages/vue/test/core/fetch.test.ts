import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { fetchRef, streamRef } from '../../src/fetch.js';

describe('Anchor Vue - Fetch', () => {
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

        const wrapper = mount({
          template: '<div>{{ state.data.name }}</div>',
          setup() {
            const state = fetchRef(initialData, options);
            return { state };
          },
        });

        expect(wrapper.text()).toBe('test');
        expect(typeof wrapper.vm.state.fetch).toBe('function');
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

        const wrapper = mount({
          template: '<div>{{ state.data.name }}</div>',
          setup() {
            const state = streamRef(initialData, options);
            return { state };
          },
        });

        expect(wrapper.text()).toBe('test');
        expect(typeof wrapper.vm.state.fetch).toBe('function');
      });
    });
  });
});
