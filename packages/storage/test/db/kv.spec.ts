import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearIndexedDBMock, mockIndexedDB } from '../../mocks/indexeddb-mock.js';
import { IDBStatus, IndexedKv } from '../../src/db/index.js';

describe('IndexedKV Module', () => {
  describe('IndexedKv', () => {
    it('should initialize a kv store', () => {
      const kv = new IndexedKv<string>('test-kv');

      expect(kv).toBeInstanceOf(IndexedKv);
      expect(kv.status).toBe(IDBStatus.Closed);
    });

    it('should handle IndexedDB not supported', () => {
      const kv = new IndexedKv<string>('test-kv');

      expect(kv.status).toBe(IDBStatus.Closed);
      expect(kv.error).toBeDefined();
      expect(kv.error?.message).toBe('IndexedDB is not available.');
    });

    it('should support initialization promise', async () => {
      const kv = new IndexedKv<string>('test-kv');
      const event = await kv.promise();

      expect(event.type).toBe(IDBStatus.Closed);
      expect(kv.status).toBe(IDBStatus.Closed);
      expect(kv.error).toBeDefined();
    });
  });
});

describe('Mocked IndexedKV Module', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockIndexedDB();
  });

  afterEach(() => {
    errorSpy.mockRestore();
    clearIndexedDBMock();
  });

  describe('IndexedKv', () => {
    it('should initialize a kv store', async () => {
      const kv = new IndexedKv<string>('test-kv');
      expect(kv.status).toBe(IDBStatus.Init);

      const event = await kv.promise();

      expect(event.type).toBe(IDBStatus.Open);
      expect(kv.status).toBe(IDBStatus.Open);
      expect(kv.error).toBeUndefined();
    });

    it('should handle busy state', async () => {
      const kv = new IndexedKv<string>('test-kv');
      await kv.promise();

      kv.set('key1', 'value1');
      expect(kv.busy).toBe(true);

      await kv.completed();
      expect(kv.busy).toBe(false);
    });

    it('should set and get values', async () => {
      const kv = new IndexedKv<string>('test-kv');
      await kv.promise();

      kv.set('key1', 'value1');

      await kv.completed();
      expect(kv.get('key1')).toBe('value1');

      kv.set('key2', 'value2');

      await kv.completed();
      expect(kv.get('key2')).toBe('value2');
    });

    it('should populates the existing values', async () => {
      const kv = new IndexedKv<string>('test-kv');
      await kv.promise();

      expect(kv.get('key1')).toBe('value1');
      expect(kv.get('key2')).toBe('value2');
    });

    it('should handle promise based set operations', async () => {
      const kv = new IndexedKv<string>('test-kv');
      await kv.promise();

      await kv.set('key1', 'value1').promise();

      const result = kv.set('key3', 'value3');
      await result.promise();
      await result.promise();

      expect(kv.get('key1')).toBe('value1');
    });

    it('should delete values', async () => {
      const kv = new IndexedKv<string>('test-kv');
      await kv.promise();

      kv.set('key1', 'value1');

      await kv.completed();
      expect(kv.get('key1')).toBe('value1');

      kv.delete('key1');

      await kv.completed();
      expect(kv.get('key1')).toBeUndefined();
    });

    it('should handle promise based delete operation', async () => {
      const kv = new IndexedKv<string>('test-kv');
      await kv.promise();

      await kv.set('k1', 'value1').promise();
      expect(kv.get('k1')).toBe('value1');

      await kv.delete('k1').promise();
      expect(kv.get('k1')).toBeUndefined();

      await kv.set('k2', 'value2').promise();
      expect(kv.get('k2')).toBe('value2');

      const result = kv.delete('k2');
      await result.promise();
      await result.promise(); // Should not throw an error.

      expect(kv.get('k2')).toBeUndefined();
    });

    it('should handle deleting non-existent key', async () => {
      const kv = new IndexedKv<string>('test-kv');
      await kv.promise();

      // Should not throw an error when deleting non-existent key
      expect(() => kv.delete('non-existent')).not.toThrow();
    });

    it('should subscribe and publish events', async () => {
      const kv = new IndexedKv<string>('test-kv');
      await kv.promise();

      const subscriber = vi.fn();
      const unsubscribe = kv.subscribe(subscriber);

      kv.set('key1', 'value1');

      await kv.completed();
      expect(subscriber).toHaveBeenCalledWith({ type: 'set', key: 'key1', value: 'value1' });

      kv.delete('key1');

      await kv.completed();
      expect(subscriber).toHaveBeenCalledWith({ type: 'delete', key: 'key1' });

      unsubscribe();
      kv.set('key2', 'value2');

      // Should not be called again after unsubscribe
      expect(subscriber).toHaveBeenCalledTimes(2);
    });

    it('should handle set errors gracefully', async () => {
      const kv = new IndexedKv<string>('test-kv');
      await kv.promise();

      const onErrorSpy = vi.fn();

      // Force an error by closing the database first
      kv.close(new Error('Test error'));

      kv.set('key1', 'value1', onErrorSpy);

      await kv.completed();

      expect(errorSpy).toHaveBeenCalled();
      expect(onErrorSpy).toHaveBeenCalled();
      expect(kv.get('key1')).toBeUndefined(); // Value should not be stored
    });

    it('should handle delete errors gracefully', async () => {
      const kv = new IndexedKv<string>('test-kv');
      await kv.promise();

      const onErrorSpy = vi.fn();

      kv.set('key1', 'value1');

      await kv.completed();
      expect(kv.get('key1')).toBe('value1');

      // Force an error by closing the database first
      kv.close(new Error('Test error'));

      kv.delete('key1', onErrorSpy);

      // Wait for the async operation
      await kv.completed();

      expect(errorSpy).toHaveBeenCalled();
      expect(onErrorSpy).toHaveBeenCalled();
      expect(kv.get('key1')).toBe('value1'); // Value should be restored
    });

    it('should handle complex data types', async () => {
      const kv = new IndexedKv<Record<string, unknown>>('test-kv');
      await kv.promise();

      const complexValue = {
        name: 'test',
        count: 42,
        nested: {
          enabled: true,
          items: [1, 2, 3],
        },
      };

      kv.set('complex', complexValue);

      await kv.completed();
      expect(kv.get('complex')).toEqual(complexValue);
    });

    it('should handle concurrent operations during initialization', async () => {
      const kv = new IndexedKv<string>('test-kv');

      const promises = [
        new Promise((resolve) => kv.set('concurrent-1', 'value1', resolve as never)),
        new Promise((resolve) => {
          const value = kv.get('concurrent-1');
          resolve(value);
        }),
        new Promise((resolve) => kv.delete('concurrent-1', resolve as never)),
      ];

      const results = await Promise.allSettled(promises);
      const fulfilled = results.filter((result) => result.status === 'fulfilled');

      expect(fulfilled.length).toBeGreaterThan(0);
    });
  });
});
