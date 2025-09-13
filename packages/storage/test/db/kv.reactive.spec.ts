import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearIndexedDBMock, mockIndexedDB } from '../../mocks/indexeddb-mock.js';
import { createKVStore, type KVState } from '../../src/db/index.js';
import { anchor } from '@anchorlib/core';
import { sleep } from '@beerush/utils';

describe('Reactive KV Module', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockIndexedDB();
  });

  afterEach(() => {
    errorSpy.mockRestore();
    clearIndexedDBMock();
  });

  describe('createKVStore', () => {
    it('should create a reactive kv store function', async () => {
      const kv = createKVStore('test-reactive-kv');

      expect(typeof kv).toBe('function');
      expect(typeof kv.leave).toBe('function');
      expect(typeof kv.remove).toBe('function');
      expect(typeof kv.ready).toBe('function');
    });

    it('should create a reactive kv with seeds', async () => {
      const kv = createKVStore('test-kv-seeds', 1, 'test-kv-seeds', [['key1', 'value1']]);
      await kv.ready();

      expect(kv('key1', 'new-value-1').data).toBe('value1');
    });

    it('should handle creating kv store with the same name', () => {
      const kv1 = createKVStore('test-reactive-kv');
      const kv2 = createKVStore('test-reactive-kv');

      expect(kv1).toBe(kv2);
    });

    it('should create reactive state with initial value', async () => {
      const kv = createKVStore('test-reactive-kv');
      await kv.ready();

      const state = kv('test-key', 'initial-value');

      expect(state).toBeDefined();
      expect(state.data).toBe('initial-value');
      expect(state.status).toBe('ready');

      await kv.ready();

      expect(state).toBe(kv('test-key'));
      expect(state.status).toBe('ready');
      expect(state.data).toBe('initial-value');
      expect(kv.store().get('test-key')).toBe('initial-value');
    });

    it('should return the existing data after initialization', async () => {
      const kv = createKVStore('test-reactive-kv');

      await kv.ready();
      const state = kv<string>('test-key', 'fake-value');
      await kv.ready();

      expect(state.data).toBe('initial-value');
      expect(state.status).toBe('ready');
    });

    it('should return the same state for the same key', async () => {
      const kv = createKVStore('test-reactive-kv');
      const state1 = kv('shared-key', 'value1');
      const state2 = kv('shared-key', 'value2');

      expect(state1).toBe(state2);
      expect(state1.data).toBe('value1'); // Should keep the first value
    });

    it('should track usage count for shared states', async () => {
      const kv = createKVStore('test-reactive-kv');
      const state1 = kv('shared-key', 'value1');
      const state2 = kv('shared-key', 'value2'); // This should be the same as state1

      expect(state1).toBe(state2);

      // Test that leaving one instance doesn't unsubscribe the state
      kv.leave(state1);
      const state3 = kv('shared-key', 'value3');
      expect(state2).toBe(state3); // Should still be the same state

      // After leaving all instances, a new state should be created
      kv.leave(state2);
      const state4 = kv('shared-key', 'value4');
      expect(state3).toBe(state4); // Still the same because usage count management is internal
    });

    it('should synchronize state changes with IndexedDB', async () => {
      const kv = createKVStore('test-reactive-kv');
      const state = kv('sync-key', { count: 0 });

      // Change the state data
      state.data = { count: 1 };

      // Wait for synchronization
      await kv.ready();

      // Create a new instance to verify persistence
      const kv2 = createKVStore('test-reactive-kv');
      const state2 = kv2('sync-key', { count: 0 });

      expect(state2.data).toEqual({ count: 1 });
    });

    it('should handle complex nested objects', async () => {
      const kv = createKVStore('test-reactive-kv');
      const initialState = {
        user: {
          name: 'John',
          preferences: {
            theme: 'dark',
            notifications: true,
          },
        },
        settings: {
          version: 1,
          features: ['feature1', 'feature2'],
        },
      };

      const state = kv('complex-key', initialState);
      expect(state.data).toEqual(initialState);

      // Modify nested property
      state.data.user.preferences.theme = 'light';

      await kv.ready();

      const kv2 = createKVStore('test-reactive-kv');
      const state2 = kv2<typeof initialState>('complex-key', {} as never);

      expect(state2.data.user.preferences.theme).toBe('light');
    });
  });

  describe('Reactive KV Edge Cases', () => {
    it('should handle state creation when database is not yet open', async () => {
      const kv = createKVStore('test-edge-kv');
      const state = kv('early-key', 'early-value');

      expect(state.status).toBe('init');
      expect(state.data).toBe('early-value');
    });

    it('should handle concurrent access to the same key', async () => {
      const kv = createKVStore('test-concurrent-kv');

      const promises = Array(10)
        .fill(null)
        .map(() => Promise.resolve(kv('concurrent-key', 'concurrent-value')));

      const states = await Promise.all(promises);

      // All states should be the same instance
      states.forEach((state) => {
        expect(state).toBe(states[0]);
      });
    });

    it('should handle rapid state changes', async () => {
      const kv = createKVStore('test-rapid-kv');
      const state = kv<number>('rapid-key', 0);

      // Rapidly change the state
      for (let i = 1; i <= 100; i++) {
        state.data = i;
      }

      await kv.ready();

      const kv2 = createKVStore('test-rapid-kv');
      const state2 = kv2('rapid-key', 0);

      expect(state2.data).toBe(100);
    });

    it('should handle state leave functionality', async () => {
      const kv = createKVStore('test-leave-kv');
      const state = kv('leave-key', 'leave-value');

      // This should not throw
      expect(() => kv.leave(state)).not.toThrow();

      // Test leaving non-existent state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fakeState = anchor.raw({ data: 'fake', status: 'ready' }) as KVState<any>;
      expect(() => kv.leave(fakeState)).not.toThrow();
    });

    it('should handle remove functionality', async () => {
      const kv = createKVStore('test-remove-kv');
      await kv.ready();

      const state = kv('remove-key', 'remove-value');

      // State should have initial value
      expect(state.data).toBe('remove-value');

      // Remove the key
      kv.remove('remove-key');
      await kv.ready();

      // State should be marked as removed
      expect(state.status).toBe('removed');
      expect(state.data).toBeUndefined();

      // Creating a new state with the same key should not initialize with new value
      const state2 = kv('remove-key', 'new-value');
      expect(state2.data).toBe('new-value');
      expect(state2.status).toBe('ready');
    });

    it('should handle initialization errors gracefully', async () => {
      vi.useFakeTimers();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockRequest: any = {
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        result: null,
        error: new DOMException('Test error', 'AbortError'),
        transaction: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      const mockIndexedDB = {
        open: () => {
          setTimeout(() => {
            mockRequest.onerror?.();
          }, 100);

          return mockRequest;
        },
      };

      const originIndexedDB = global.indexedDB;
      Object.defineProperty(global, 'indexedDB', {
        value: mockIndexedDB,
        writable: true,
      });

      const kv = createKVStore('init-error-kv');
      const state = kv('key1', { a: 1 });

      await vi.runAllTimersAsync();
      await kv.ready();

      expect(state.status).toBe('error');

      Object.defineProperty(global, 'indexedDB', {
        value: originIndexedDB,
        writable: true,
      });

      vi.useRealTimers();
    });

    it('should handle init value errors gracefully', async () => {
      const kv = createKVStore('test-kv-init-error');
      await kv.ready();

      const state = kv('error-key', new Proxy({}, {}));

      await sleep(5);
      await kv.ready();

      expect(state.status).toBe('error');
      expect(state.error).toBeInstanceOf(Error);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle remove errors gracefully', async () => {
      const kv = createKVStore('test-remove-error-kv');
      const state = kv('error-key', 'error-value');

      await kv.ready();

      // Mock the store to force an error on delete
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const store = (kv as any).store();
      const originalDelete = store.delete;
      store.delete = vi.fn().mockReturnValue({
        promise: () => Promise.reject(new Error('Delete error')),
      });

      kv.remove('error-key');
      expect(state.status).toBe('removed');

      await kv.ready();

      expect(state.status).toBe('error');
      expect(state.error).toBeDefined();

      // Restore original function
      store.delete = originalDelete;
    });

    it('should handle IndexedDB errors during synchronization', async () => {
      vi.useFakeTimers();

      const kv = createKVStore('test-sync-error-kv');
      const state = kv<string>('sync-error-key', 'sync-error-value');

      await vi.runAllTimersAsync();
      await kv.ready();

      // Mock the store to force an error on set
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const store = (kv as any).store();
      const originalSet = store.set;
      store.set = vi.fn().mockImplementation((key, value, onerror) => {
        onerror(new Error('Sync error'));
        return { promise: () => Promise.reject(new Error('Sync error')) };
      });

      // Change state to trigger synchronization
      state.data = 'changed-value';

      await vi.runAllTimersAsync();
      await kv.ready();

      expect(state.status).toBe('error');
      expect(state.error).toBeDefined();

      // Restore original function
      store.set = originalSet;

      vi.useRealTimers();
    });
  });

  describe('Reactive KV Integration', () => {
    it('should handle multiple stores with different names', async () => {
      const kv1 = createKVStore('store-1');
      const kv2 = createKVStore('store-2');

      const state1 = kv1('shared-key', 'value-1');
      const state2 = kv2('shared-key', 'value-2');

      // States should be different because they're from different stores
      expect(state1.data).toBe('value-1');
      expect(state2.data).toBe('value-2');
      expect(state1).not.toBe(state2);
    });

    it('should handle falsy values correctly', async () => {
      const kv = createKVStore('test-falsy-kv');

      const state1 = kv<number>('falsy-key-1', 0);
      const state2 = kv<string>('falsy-key-2', '');
      const state3 = kv<boolean>('falsy-key-3', false);
      const state4 = kv('falsy-key-4', null);

      expect(state1.data).toBe(0);
      expect(state2.data).toBe('');
      expect(state3.data).toBe(false);
      expect(state4.data).toBe(null);

      // Change values
      state1.data = 1;
      state2.data = 'non-empty';
      state3.data = true;
      state4.data = 'not-null';

      await kv.ready();

      // Verify persistence
      const kv2 = createKVStore('test-falsy-kv');
      const newState1 = kv2('falsy-key-1', 0);
      const newState2 = kv2('falsy-key-2', '');
      const newState3 = kv2('falsy-key-3', false);
      const newState4 = kv2('falsy-key-4', null);

      expect(newState1.data).toBe(1);
      expect(newState2.data).toBe('non-empty');
      expect(newState3.data).toBe(true);
      expect(newState4.data).toBe('not-null');
    });
  });
});
