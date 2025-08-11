import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '@anchor/core';
import { persistent, PersistentStorage, STORAGE_KEY } from '../src/index.js';
import { clearStorageMocks, mockBrowserStorage } from '../mocks/storage-mock.js';

describe('Storage Module', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(logger as never as typeof console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
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
      const storage = new PersistentStorage('test', { a: 1 });

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
      const storage = new PersistentStorage('test', { a: 1, b: 'test' });
      const json = storage.json();

      expect(json).toBe(JSON.stringify({ a: 1, b: 'test' }));
    });
  });
});

describe('Mocked Storage Module', () => {
  beforeEach(() => {
    mockBrowserStorage();
  });

  afterEach(() => {
    clearStorageMocks();
  });

  describe('Persistent Storage', () => {
    it('should write to localStorage', () => {
      const storage = new PersistentStorage<ObjLike>('test', { a: 1 });
      const key = `${STORAGE_KEY}-persistent://test@1.0.0`;

      expect(localStorage.getItem(key)).toBe(storage.json());

      storage.set('b', 2);
      expect(localStorage.getItem(key)).toBe(storage.json());

      storage.delete('a');
      expect(localStorage.getItem(key)).toBe(storage.json());

      storage.delete('b');
      expect(localStorage.getItem(key)).toBeNull();
    });

    it('should read from localStorage', () => {
      const key = `${STORAGE_KEY}-persistent://test@1.0.0`;
      localStorage.setItem(key, JSON.stringify({ a: 1, b: 'test' }));

      const storage = new PersistentStorage<{ a?: number; b?: string }>('test');

      expect(storage.get('a')).toBe(1);
      expect(storage.get('b')).toBe('test');
    });

    it('Should remove the old version from localStorage', () => {
      const oldKey = `${STORAGE_KEY}-persistent://test@1.0.0`;
      const newKey = `${STORAGE_KEY}-persistent://test@1.1.0`;

      localStorage.setItem(oldKey, JSON.stringify({ a: 1, b: 'test' }));
      expect(localStorage.getItem(oldKey)).toBe(JSON.stringify({ a: 1, b: 'test' }));

      const upgraded = new PersistentStorage<ObjLike>('test', { a: 1, b: 2 }, '1.1.0', '1.0.0');

      expect(upgraded.get('a')).toBe(1);
      expect(upgraded.get('b')).toBe(2);

      expect(localStorage.getItem(oldKey)).toBeNull();
      expect(localStorage.getItem(newKey)).toBe(upgraded.json());
    });

    it('should handle localStorage errors gracefully', () => {
      const storage = new PersistentStorage<ObjLike>('test', { a: 1 });
      const consoleErrorSpy = vi.spyOn(logger as never as typeof console, 'error').mockImplementation(() => {});

      // Mock setItem to throw an error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => {
        throw new Error('Storage full');
      };

      storage.set('b', 2);

      expect(consoleErrorSpy).toHaveBeenCalled();

      // Restore original function
      localStorage.setItem = originalSetItem;
      consoleErrorSpy.mockRestore();
    });
  });
});

describe('Reactive Storage', () => {
  beforeEach(() => {
    mockBrowserStorage();
  });

  afterEach(() => {
    clearStorageMocks();
  });

  describe('Persistent Storage', () => {
    it('should create a reactive persistent object', () => {
      const state = persistent('test', { a: 1, b: 'test' });

      expect(state.a).toBe(1);
      expect(state.b).toBe('test');

      // Check if the state is stored in localStorage
      const key = `${STORAGE_KEY}-persistent://test@1.0.0`;
      expect(localStorage.getItem(key)).toBe(JSON.stringify({ a: 1, b: 'test' }));
    });

    it('should sync changes to local storage', () => {
      const state = persistent('test', { a: 1 });
      const key = `${STORAGE_KEY}-persistent://test@1.0.0`;

      // Initial state
      expect(localStorage.getItem(key)).toBe(JSON.stringify({ a: 1 }));

      // Update state
      state.a = 2;
      expect(localStorage.getItem(key)).toBe(JSON.stringify({ a: 2 }));

      // Add new property
      (state as Record<string, unknown>).b = 'new';
      expect(localStorage.getItem(key)).toBe(JSON.stringify({ a: 2, b: 'new' }));

      // Delete property
      delete (state as Record<string, unknown>).a;
      expect(localStorage.getItem(key)).toBe(JSON.stringify({ b: 'new' }));
    });

    it('should leave a reactive persistent object', () => {
      const state = persistent('test', { a: 1 });
      const key = `${STORAGE_KEY}-persistent://test@1.0.0`;

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
