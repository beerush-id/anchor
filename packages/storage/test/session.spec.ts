import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type ObjLike } from '@anchorlib/core';
import { flushStorageCache, session, SessionStorage, STORAGE_SYNC_DELAY } from '../src/index.js';
import { clearStorageMocks, emitGlobalEvent, mockBrowserStorage } from '../mocks/storage-mock.js';

describe('Storage Module', () => {
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
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockBrowserStorage();
  });

  afterEach(() => {
    flushStorageCache();
    errorSpy.mockRestore();
    clearStorageMocks();
  });

  describe('Session Storage', () => {
    it('should write to sessionStorage', () => {
      const storage = new SessionStorage<ObjLike>('test', { a: 1 });
      const key = SessionStorage.key('test');

      expect(sessionStorage.getItem(key)).toBe(storage.json());

      storage.set('b', 2);
      expect(sessionStorage.getItem(key)).toBe(storage.json());

      storage.delete('a');
      expect(sessionStorage.getItem(key)).toBe(storage.json());

      storage.delete('b');
      expect(sessionStorage.getItem(key)).toBeNull();
    });

    it('should read from sessionStorage', () => {
      const key = SessionStorage.key('test');
      sessionStorage.setItem(key, JSON.stringify({ a: 1, b: 'test' }));

      const storage = new SessionStorage<{ a?: number; b?: string }>('test');

      expect(storage.get('a')).toBe(1);
      expect(storage.get('b')).toBe('test');
    });

    it('Should remove the old version from sessionStorage', () => {
      const oldKey = SessionStorage.key('test');
      const newKey = SessionStorage.key('test', '1.1.0');

      sessionStorage.setItem(oldKey, JSON.stringify({ a: 1, b: 'test' }));
      expect(sessionStorage.getItem(oldKey)).toBe(JSON.stringify({ a: 1, b: 'test' }));

      const upgraded = new SessionStorage<ObjLike>('test', { a: 1, b: 2 }, '1.1.0', '1.0.0');

      expect(upgraded.get('a')).toBe(1);
      expect(upgraded.get('b')).toBe(2);

      expect(sessionStorage.getItem(oldKey)).toBeNull();
      expect(sessionStorage.getItem(newKey)).toBe(upgraded.json());
    });

    it('should handle sessionStorage errors gracefully', () => {
      const storage = new SessionStorage<ObjLike>('test', { a: 1 });

      // Mock setItem to throw an error
      const originalSetItem = sessionStorage.setItem;
      sessionStorage.setItem = () => {
        throw new Error('Storage full');
      };

      storage.set('b', 2);

      expect(errorSpy).toHaveBeenCalled();

      // Restore original function
      sessionStorage.setItem = originalSetItem;
    });
  });

  describe('Session Storage - Edge Cases', () => {
    it('should handle error when initializing corrupted storage', () => {
      const key = SessionStorage.key('test');
      sessionStorage.setItem(key, '{"foo": "bar", "bar": -}');
      const storage = new SessionStorage<ObjLike>('test', { a: 1 });

      expect(storage.get('foo')).toBeUndefined();
      expect(storage.get('bar')).toBeUndefined();
      expect(storage.get('a')).toBe(1);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should share the same session state with the same name', () => {
      const state1 = session('shared-test', { a: 1 });
      const state2 = session('shared-test', { a: 2 });

      expect(state1).toBe(state2);
    });

    it('should handle storage change event with no key', () => {
      const storage = session('test', { a: 1 });

      emitGlobalEvent('storage', { key: null, newValue: null });
      expect(storage.a).toBe(1); // No side effect from storage change event.
    });

    it('should handle storage change event with a valid payload', () => {
      const key = SessionStorage.key('test');
      const storage = session('test', { a: 1 });

      expect(storage.a).toBe(1);
      emitGlobalEvent('storage', { key, newValue: JSON.stringify({ a: 2 }) });
      expect(storage.a).toBe(2); // Value should be updated.
    });

    it('should handle storage change event with an invalid payload', () => {
      const key = SessionStorage.key('test');
      const storage = session('test', { a: 1 });

      expect(storage.a).toBe(1);

      emitGlobalEvent('storage', { key, newValue: '{invalid}' });

      expect(storage.a).toBe(1); // Value should not be updated.
      expect(errorSpy).toHaveBeenCalledTimes(1);

      emitGlobalEvent('storage', { key, newValue: undefined });

      expect(storage.a).toBe(1);
      expect(errorSpy).toHaveBeenCalledTimes(2);
    });
  });
});

describe('Reactive Storage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockBrowserStorage();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearStorageMocks();
    flushStorageCache();
  });

  describe('Session Storage', () => {
    it('should create a reactive session object', () => {
      const state = session('test', { a: 1, b: 'test' });

      expect(state.a).toBe(1);
      expect(state.b).toBe('test');

      // Check if the state is stored in sessionStorage
      const key = SessionStorage.key('test');
      expect(sessionStorage.getItem(key)).toBe(JSON.stringify({ a: 1, b: 'test' }));
    });

    it('should sync changes to session storage', () => {
      const state = session('test', { a: 1 });
      const key = SessionStorage.key('test');

      // Initial state
      expect(sessionStorage.getItem(key)).toBe(JSON.stringify({ a: 1 }));

      // Update state
      state.a = 2;
      vi.advanceTimersByTime(STORAGE_SYNC_DELAY);
      expect(sessionStorage.getItem(key)).toBe(JSON.stringify({ a: 2 }));

      // Add new property
      (state as Record<string, unknown>).b = 'new';
      vi.advanceTimersByTime(STORAGE_SYNC_DELAY);
      expect(sessionStorage.getItem(key)).toBe(JSON.stringify({ a: 2, b: 'new' }));

      // Delete property
      delete (state as Record<string, unknown>).a;
      vi.advanceTimersByTime(STORAGE_SYNC_DELAY);
      expect(sessionStorage.getItem(key)).toBe(JSON.stringify({ b: 'new' }));
    });

    it('should leave a reactive session object', () => {
      const state = session('test', { a: 1 });
      const key = SessionStorage.key('test');

      // Verify it's stored initially
      expect(sessionStorage.getItem(key)).toBe(JSON.stringify({ a: 1 }));

      // Leave the session
      session.leave(state);

      // Changes should no longer be synced to storage
      state.a = 2;
      expect(sessionStorage.getItem(key)).toBe(JSON.stringify({ a: 1 })); // Should remain unchanged
    });

    it('should handle leaving shared reactive session objects', () => {
      const state1 = session('test', { a: 1 });
      const state2 = session('test', { a: 1 });
      const key = SessionStorage.key('test');

      expect(state1).toBe(state2);
      expect(sessionStorage.getItem(key)).toBe(JSON.stringify({ a: 1 }));

      session.leave(state1);

      state2.a = 2;
      vi.advanceTimersByTime(STORAGE_SYNC_DELAY);

      expect(sessionStorage.getItem(key)).toBe(JSON.stringify({ a: 2 }));
      expect(state1.a).toBe(2);

      expect(state2).toBe(state1);

      session.leave(state2);

      state1.a = 3;
      vi.advanceTimersByTime(STORAGE_SYNC_DELAY);

      expect(state1.a).toBe(3);
      expect(state2.a).toBe(3);

      expect(sessionStorage.getItem(key)).toBe(JSON.stringify({ a: 2 }));
    });
  });
});
