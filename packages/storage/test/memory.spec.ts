import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '@anchor/core';
import { MemoryStorage } from '../src/index.js';

describe('Storage Module', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(logger as never as typeof console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Memory Storage', () => {
    it('should initialize a memory storage', () => {
      const storage = new MemoryStorage({ a: 1 });

      expect(storage.get('a')).toBe(1);
      expect(storage.get('b' as never)).toBe(undefined);
    });

    it('should get the correct length', () => {
      const storage = new MemoryStorage({ a: 1, b: 2 });

      expect(storage.length).toBe(2);
    });

    it('should set and get values', () => {
      const storage = new MemoryStorage<{ a?: number; b?: string }>();

      storage.set('a', 1);
      storage.set('b', 'test');

      expect(storage.get('a')).toBe(1);
      expect(storage.get('b')).toBe('test');
    });

    it('should delete values', () => {
      const storage = new MemoryStorage({ a: 1, b: 2 });

      expect(storage.length).toBe(2);

      storage.delete('a');
      expect(storage.get('a')).toBe(undefined);
      expect(storage.length).toBe(1);
    });

    it('should assign data', () => {
      const storage = new MemoryStorage<Record<string, number>>({ a: 1 });

      storage.assign({ b: 2, c: 3 });

      expect(storage.get('a')).toBe(1);
      expect(storage.get('b')).toBe(2);
      expect(storage.get('c')).toBe(3);

      expect(storage.length).toBe(3);
    });

    it('should subscribe and publish events', () => {
      const storage = new MemoryStorage<{ a?: number }>();
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
      const storage = new MemoryStorage({ a: 1, b: 'test' });
      const json = storage.json();

      expect(json).toBe(JSON.stringify({ a: 1, b: 'test' }));
    });

    it('should get the storage keys', () => {
      const storage = new MemoryStorage({ a: 1, b: 'test' });
      const keys = storage.keys;

      expect(keys).toEqual(['a', 'b']);
    });

    it('should clear the storage object', () => {
      const storage = new MemoryStorage({ a: 1, b: 'test' });
      const handler = vi.fn();
      const unsubscribe = storage.subscribe(handler);

      storage.clear();

      expect(storage.get('a')).toBeUndefined();
      expect(storage.get('b')).toBeUndefined();
      expect(storage.keys).toEqual([]);
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();
    });
  });
});
