import { createLifecycle, type ObjLike } from '@anchorlib/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { persistent, PersistentStorage, STORAGE_KEY, STORAGE_SYNC_DELAY } from '../src/index.js';

describe('Storage Module', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Persistent Storage', () => {
    it('should initialize a persistent storage', () => {
      const storage = new PersistentStorage('test', { a: 1 });

      expect(storage.get('a')).toBe(1);
      expect(storage.get('b' as never)).toBe(undefined);
    });

    it('should get the correct length', () => {
      const storage = new PersistentStorage('test', { a: 1, b: 2 });

      expect(storage.length).toBe(2);
    });

    it('should set and get values', () => {
      const storage = new PersistentStorage<{ a?: number; b?: string }>('test');

      storage.set('a', 1);
      storage.set('b', 'test');

      expect(storage.get('a')).toBe(1);
      expect(storage.get('b')).toBe('test');
    });

    it('should delete values', () => {
      const storage = new PersistentStorage('test', { a: 1, b: 2 });

      expect(storage.length).toBe(2);

      storage.delete('a');
      expect(storage.get('a')).toBe(undefined);
      expect(storage.length).toBe(1);
    });

    it('should assign data', () => {
      const storage = new PersistentStorage<Record<string, number>>('test', { a: 1 });

      storage.assign({ b: 2, c: 3 });

      expect(storage.get('a')).toBe(1);
      expect(storage.get('b')).toBe(2);
      expect(storage.get('c')).toBe(3);

      expect(storage.length).toBe(3);
    });

    it('should clear storage when empty', () => {
      const storage = new PersistentStorage('test-clear', { a: 1 });

      expect(storage.length).toBe(1);

      storage.delete('a');
      expect(storage.length).toBe(0);
    });

    it('should subscribe and publish events', () => {
      const storage = new PersistentStorage<{ a?: number }>('test');
      const subscriber = vi.fn();

      const unsubscribe = storage.subscribe(subscriber);
      storage.set('a', 1);

      expect(subscriber).toHaveBeenCalledWith({ type: 'set', name: 'a', value: 1 });

      storage.delete('a');
      expect(subscriber).toHaveBeenCalledWith({ type: 'delete', name: 'a' });

      unsubscribe();
      storage.set('a', 2);

      // Should not be called again after unsubscribe
      expect(subscriber).toHaveBeenCalledTimes(2);
    });

    it('should generate JSON representation', () => {
      const storage = new PersistentStorage('test-json', { a: 1, b: 'test' });
      const json = storage.json();

      expect(json).toBe(JSON.stringify({ a: 1, b: 'test' }));
    });

    it('should handle non supporting environment', () => {
      const currentGlobalStorage = global.localStorage;
      global.localStorage = undefined as never;

      const storage = new PersistentStorage('test-json', { a: 1, b: 'test' });

      expect(storage.get('a')).toBe(1);
      expect(global.localStorage).toBeUndefined();

      global.localStorage = currentGlobalStorage;
      expect(global.localStorage).toBe(currentGlobalStorage);
    });
  });
});

describe('Mocked Storage Module', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('Persistent Storage', () => {
    it('should write to localStorage', () => {
      const storage = new PersistentStorage<ObjLike>('test', { a: 1 });
      const key = PersistentStorage.key('test');

      expect(localStorage.getItem(key)).toBe(storage.json());

      storage.set('b', 2);
      expect(localStorage.getItem(key)).toBe(storage.json());

      storage.delete('a');
      expect(localStorage.getItem(key)).toBe(storage.json());

      storage.delete('b');
      expect(localStorage.getItem(key)).toBeNull();
    });

    it('should read from localStorage', () => {
      const key = PersistentStorage.key('test');
      localStorage.setItem(key, JSON.stringify({ a: 1, b: 'test' }));

      const storage = new PersistentStorage<{ a?: number; b?: string }>('test');

      expect(storage.get('a')).toBe(1);
      expect(storage.get('b')).toBe('test');
    });

    it('Should remove the old version from localStorage', () => {
      const oldKey = PersistentStorage.key('test');
      const newKey = `${STORAGE_KEY}-persistent://test@1.1.0`;

      localStorage.setItem(oldKey, JSON.stringify({ a: 1, b: 'test' }));
      expect(localStorage.getItem(oldKey)).toBe(JSON.stringify({ a: 1, b: 'test' }));

      const upgraded = new PersistentStorage<ObjLike>('test', { a: 1, b: 2 }, '1.1.0', '1.0.0');

      expect(upgraded.get('a')).toBe(1);
      expect(upgraded.get('b')).toBe(2);

      expect(localStorage.getItem(oldKey)).toBeNull();
      expect(localStorage.getItem(newKey)).toBe(upgraded.json());
    });

    it('should handle localStorage errors gracefully', async () => {
      const storage = new PersistentStorage<ObjLike>('test', { a: 1 });

      (storage as any).adapter = {
        setItem: vi.fn().mockImplementation(() => {
          throw new Error('Storage full');
        }),
      };
      storage.set('b', 2);

      await Promise.resolve();
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('Persistent Storage - Edge Cases', () => {
    it('should handle browser storage change event', () => {});
  });
});

describe('Reactive Storage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Persistent Storage', () => {
    it('should create a reactive persistent object', () => {
      const ssr = createLifecycle();
      const state = ssr.run(() => persistent('test-1', { a: 1, b: 'test' }));

      expect(state.a).toBe(1);
      expect(state.b).toBe('test');

      // Check if the state is stored in localStorage
      const key = PersistentStorage.key('test-1');
      expect(localStorage.getItem(key)).toBe(JSON.stringify({ a: 1, b: 'test' }));
      ssr.destroy();
    });

    it('should share the same persistent state with the same name', () => {
      const state1 = persistent('shared-test', { a: 1, b: 'test' });
      const state2 = persistent('shared-test', { a: 1, b: 'test' });

      expect(state1).toBe(state2);
    });

    it('should sync changes to local storage', () => {
      const state = persistent('test-2', { a: 1 });
      const key = PersistentStorage.key('test-2');

      // Initial state
      expect(localStorage.getItem(key)).toBe(JSON.stringify({ a: 1 }));

      // Update state
      state.a = 2;
      vi.advanceTimersByTime(STORAGE_SYNC_DELAY);
      expect(localStorage.getItem(key)).toBe(JSON.stringify({ a: 2 }));

      // Add new property
      (state as Record<string, unknown>).b = 'new';
      vi.advanceTimersByTime(STORAGE_SYNC_DELAY);
      expect(localStorage.getItem(key)).toBe(JSON.stringify({ a: 2, b: 'new' }));

      // Delete property
      delete (state as Record<string, unknown>).a;
      vi.advanceTimersByTime(STORAGE_SYNC_DELAY);
      expect(localStorage.getItem(key)).toBe(JSON.stringify({ b: 'new' }));
    });

    it('should leave a reactive persistent object', () => {
      const state = persistent('test-3', { a: 1 });
      const key = PersistentStorage.key('test-3');

      // Verify it's stored initially
      expect(localStorage.getItem(key)).toBe(JSON.stringify({ a: 1 }));

      // Leave the session
      persistent.leave(state);

      // Changes should no longer be synced to storage
      state.a = 2;
      expect(localStorage.getItem(key)).toBe(JSON.stringify({ a: 1 })); // Should remain unchanged
    });
  });
});
