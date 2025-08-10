import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger, type PlainObject } from '@anchor/core';
import { session, SessionStorage, STORAGE_KEY } from '../src/index.js';
import { clearStorageMocks, mockBrowserStorage } from '../mocks/storage-mock.js';

describe('Storage Module', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(logger as never as typeof console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Session Storage', () => {
    it('should initialize a session storage', () => {
      const storage = new SessionStorage('test', { a: 1 });

      expect(storage.get('a')).toBe(1);
      expect(storage.get('b' as never)).toBe(undefined);
    });

    it('should get the correct length', () => {
      const storage = new SessionStorage('test', { a: 1, b: 2 });

      expect(storage.length).toBe(2);
    });

    it('should set and get values', () => {
      const storage = new SessionStorage<{ a?: number; b?: string }>('test');

      storage.set('a', 1);
      storage.set('b', 'test');

      expect(storage.get('a')).toBe(1);
      expect(storage.get('b')).toBe('test');
    });

    it('should delete values', () => {
      const storage = new SessionStorage('test', { a: 1, b: 2 });

      expect(storage.length).toBe(2);

      storage.delete('a');
      expect(storage.get('a')).toBe(undefined);
      expect(storage.length).toBe(1);
    });

    it('should assign data', () => {
      const storage = new SessionStorage<Record<string, number>>('test', { a: 1 });

      storage.assign({ b: 2, c: 3 });

      expect(storage.get('a')).toBe(1);
      expect(storage.get('b')).toBe(2);
      expect(storage.get('c')).toBe(3);

      expect(storage.length).toBe(3);
    });

    it('should clear storage when empty', () => {
      const storage = new SessionStorage('test', { a: 1 });

      expect(storage.length).toBe(1);

      storage.delete('a');
      expect(storage.length).toBe(0);
    });

    it('should subscribe and publish events', () => {
      const storage = new SessionStorage<{ a?: number }>('test');
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
      const storage = new SessionStorage('test', { a: 1, b: 'test' });
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

  describe('Session Storage', () => {
    it('should write to sessionStorage', () => {
      const storage = new SessionStorage<PlainObject>('test', { a: 1 });
      const key = `${STORAGE_KEY}-session://test@1.0.0`;

      expect(sessionStorage.getItem(key)).toBe(storage.json());

      storage.set('b', 2);
      expect(sessionStorage.getItem(key)).toBe(storage.json());

      storage.delete('a');
      expect(sessionStorage.getItem(key)).toBe(storage.json());

      storage.delete('b');
      expect(sessionStorage.getItem(key)).toBeNull();
    });

    it('should read from sessionStorage', () => {
      const key = `${STORAGE_KEY}-session://test@1.0.0`;
      sessionStorage.setItem(key, JSON.stringify({ a: 1, b: 'test' }));

      const storage = new SessionStorage<{ a?: number; b?: string }>('test');

      expect(storage.get('a')).toBe(1);
      expect(storage.get('b')).toBe('test');
    });

    it('Should remove the old version from sessionStorage', () => {
      const oldKey = `${STORAGE_KEY}-session://test@1.0.0`;
      const newKey = `${STORAGE_KEY}-session://test@1.1.0`;

      sessionStorage.setItem(oldKey, JSON.stringify({ a: 1, b: 'test' }));
      expect(sessionStorage.getItem(oldKey)).toBe(JSON.stringify({ a: 1, b: 'test' }));

      const upgraded = new SessionStorage<PlainObject>('test', { a: 1, b: 2 }, '1.1.0', '1.0.0');

      expect(upgraded.get('a')).toBe(1);
      expect(upgraded.get('b')).toBe(2);

      expect(sessionStorage.getItem(oldKey)).toBeNull();
      expect(sessionStorage.getItem(newKey)).toBe(upgraded.json());
    });

    it('should handle sessionStorage errors gracefully', () => {
      const storage = new SessionStorage<PlainObject>('test', { a: 1 });
      const consoleErrorSpy = vi.spyOn(logger as never as typeof console, 'error').mockImplementation(() => {});

      // Mock setItem to throw an error
      const originalSetItem = sessionStorage.setItem;
      sessionStorage.setItem = () => {
        throw new Error('Storage full');
      };

      storage.set('b', 2);

      expect(consoleErrorSpy).toHaveBeenCalled();

      // Restore original function
      sessionStorage.setItem = originalSetItem;
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

  describe('Session Storage', () => {
    it('should create a reactive session object', () => {
      const state = session('test', { a: 1, b: 'test' });

      expect(state.a).toBe(1);
      expect(state.b).toBe('test');

      // Check if the state is stored in sessionStorage
      const key = `${STORAGE_KEY}-session://test@1.0.0`;
      expect(sessionStorage.getItem(key)).toBe(JSON.stringify({ a: 1, b: 'test' }));
    });

    it('should sync changes to session storage', () => {
      const state = session('test', { a: 1 });
      const key = `${STORAGE_KEY}-session://test@1.0.0`;

      // Initial state
      expect(sessionStorage.getItem(key)).toBe(JSON.stringify({ a: 1 }));

      // Update state
      state.a = 2;
      expect(sessionStorage.getItem(key)).toBe(JSON.stringify({ a: 2 }));

      // Add new property
      (state as Record<string, unknown>).b = 'new';
      expect(sessionStorage.getItem(key)).toBe(JSON.stringify({ a: 2, b: 'new' }));

      // Delete property
      delete (state as Record<string, unknown>).a;
      expect(sessionStorage.getItem(key)).toBe(JSON.stringify({ b: 'new' }));
    });

    it('should leave a reactive session object', () => {
      const state = session('test', { a: 1 });
      const key = `${STORAGE_KEY}-session://test@1.0.0`;

      // Verify it's stored initially
      expect(sessionStorage.getItem(key)).toBe(JSON.stringify({ a: 1 }));

      // Leave the session
      session.leave(state);

      // Changes should no longer be synced to storage
      state.a = 2;
      expect(sessionStorage.getItem(key)).toBe(JSON.stringify({ a: 1 })); // Should remain unchanged
    });
  });
});
