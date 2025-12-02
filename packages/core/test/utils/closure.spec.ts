import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClosureAdapter, createClosure, isolated, setAsyncStorageAdapter } from '../../src/index.js';

describe('Anchor Utilities - Closure', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal('window', {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setAsyncStorageAdapter(new ClosureAdapter());
  });

  afterEach(() => {
    errorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe('createClosure', () => {
    it('should create a closure storage with isolated context', () => {
      const closure = createClosure<string, string>('test-closure');

      expect(closure).toBeDefined();
      expect(typeof closure.get).toBe('function');
      expect(typeof closure.set).toBe('function');
      expect(typeof closure.run).toBe('function');
    });

    it('should set and get values within the closure', () => {
      const closure = createClosure<string, string>('test-closure');

      closure.set('key1', 'value1');
      closure.set('key2', 'value2');

      expect(closure.get('key1')).toBe('value1');
      expect(closure.get('key2')).toBe('value2');
    });

    it('should handle different types of keys and values', () => {
      const closure = createClosure<PropertyKey, unknown>('typed-closure');
      const symbolKey = Symbol('test');

      closure.set('string-key', 'string-value');
      closure.set(42, 123);
      closure.set(symbolKey, { complex: 'object' });

      expect(closure.get('string-key')).toBe('string-value');
      expect(closure.get(42)).toBe(123);
      expect(closure.get(symbolKey)).toEqual({ complex: 'object' });
    });

    it('should maintain separate contexts for different closure instances', () => {
      const closure1 = createClosure<string, string>('closure-1');
      const closure2 = createClosure<string, string>('closure-2');

      closure1.set('shared-key', 'value1');
      closure2.set('shared-key', 'value2');

      expect(closure1.get('shared-key')).toBe('value1');
      expect(closure2.get('shared-key')).toBe('value2');
    });

    it('should handle falsy values correctly', () => {
      const closure = createClosure<string, unknown>('falsy-closure');

      closure.set('falsy', false);
      closure.set('nullish', null);
      closure.set('zero', 0);
      closure.set('empty', '');

      expect(closure.get('falsy')).toBe(false);
      expect(closure.get('nullish')).toBe(null);
      expect(closure.get('zero')).toBe(0);
      expect(closure.get('empty')).toBe('');
    });

    it('should return undefined for non-existent keys', () => {
      const closure = createClosure<string, string>('empty-closure');

      expect(closure.get('non-existent')).toBeUndefined();
    });

    it('should override existing keys with new values', () => {
      const closure = createClosure<string, string>('override-closure');

      closure.set('key', 'initial');
      expect(closure.get('key')).toBe('initial');

      closure.set('key', 'updated');
      expect(closure.get('key')).toBe('updated');
    });
  });

  describe('isolated', () => {
    it('should execute function within a new empty context', () => {
      const closure = createClosure<string, string>('test-closure');
      let result: string | undefined;

      const returnValue = isolated(() => {
        closure.set('key', 'value');
        result = closure.get('key');
        return 'test-result';
      });

      expect(result).toBe('value');
      expect(returnValue).toBe('test-result');
      expect(closure.get('key')).toBeUndefined(); // Context should be cleared
    });

    it('should handle async functions within isolated context', async () => {
      const closure = createClosure<string, string>('async-closure');
      let result: string | undefined;

      const returnValue = await isolated.async(async () => {
        closure.set('async-key', 'async-value');
        result = closure.get('async-key');
        return Promise.resolve('async-result');
      });

      expect(result).toBe('async-value');
      expect(returnValue).toBe('async-result');
      expect(closure.get('async-key')).toBeUndefined(); // Context should be cleared
    });

    it('should maintain context isolation between concurrent operations', () => {
      const closure1 = createClosure<string, string>('closure-1');
      const closure2 = createClosure<string, string>('closure-2');

      let result1: string | undefined;
      let result2: string | undefined;

      isolated(() => {
        closure1.set('key', 'value1');
        result1 = closure1.get('key');
      });

      isolated(() => {
        closure2.set('key', 'value2');
        result2 = closure2.get('key');
      });

      expect(result1).toBe('value1');
      expect(result2).toBe('value2');
      expect(closure1.get('key')).toBeUndefined();
      expect(closure2.get('key')).toBeUndefined();
    });

    it('should clear context after execution even if function throws', () => {
      const closure = createClosure<string, string>('error-closure');

      expect(() => {
        isolated(() => {
          closure.set('error-key', 'error-value');
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      expect(closure.get('error-key')).toBeUndefined();
    });

    it('should clear context after async execution even if function rejects', async () => {
      const closure = createClosure<string, string>('async-error-closure');

      await expect(async () => {
        await isolated.async(async () => {
          closure.set('async-error-key', 'async-error-value');
          return Promise.reject(new Error('Async test error'));
        });
      }).rejects.toThrow('Async test error');

      expect(closure.get('async-error-key')).toBeUndefined();
    });
  });

  describe('setAsyncStorageAdapter', () => {
    it('should set a custom async storage adapter', () => {
      const mockAdapter = {
        run: vi.fn((ctx, fn) => fn()),
        getStore: vi.fn(() => new Map()),
      };

      expect(() => setAsyncStorageAdapter(mockAdapter as never)).not.toThrow();
    });

    it('should throw error when invalid adapter is provided', () => {
      expect(() => setAsyncStorageAdapter({} as any)).toThrow('Invalid Closure Adapter');
      expect(() => setAsyncStorageAdapter({ run: () => {} } as any)).toThrow('Invalid Closure Adapter');
      expect(() => setAsyncStorageAdapter({ getStore: () => {} } as any)).toThrow('Invalid Closure Adapter');
    });

    it('should use custom adapter when provided', () => {
      const mockRun = vi.fn((ctx, fn) => {
        const result = fn();
        ctx.clear();
        return result;
      });

      const mockGetStore = vi.fn(() => new Map());

      const mockAdapter = {
        run: mockRun,
        getStore: mockGetStore,
      };

      setAsyncStorageAdapter(mockAdapter as never);

      const closure = createClosure<string, string>('adapter-closure');
      isolated(() => {
        closure.set('adapter-key', 'adapter-value');
      });

      expect(mockRun).toHaveBeenCalled();
      expect(mockGetStore).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle large number of entries', () => {
      const closure = createClosure<string, number>('large-closure');

      for (let i = 0; i < 1000; i++) {
        closure.set(`key-${i}`, i);
      }

      expect(closure.get('key-0')).toBe(0);
      expect(closure.get('key-500')).toBe(500);
      expect(closure.get('key-999')).toBe(999);
    });

    it('should handle complex nested objects', () => {
      const complexObject = {
        nested: {
          array: [1, 2, { deep: 'value' }],
          date: new Date(),
          regex: /test/gi,
        },
        symbol: Symbol('test'),
      };
      const closure = createClosure<string, typeof complexObject>('complex-closure');

      closure.set('complex', complexObject);
      const retrieved = closure.get('complex');

      expect(retrieved).toEqual(complexObject);
      expect(retrieved?.nested.array).toEqual(complexObject.nested.array);
    });

    it('should handle symbol identifiers for closure creation', () => {
      const symbolId = Symbol('test-id');
      const closure = createClosure<string, string>(symbolId);

      closure.set('symbol-key', 'symbol-value');

      expect(closure.get('symbol-key')).toBe('symbol-value');
    });

    it('should get all context values', () => {
      const closure = createClosure<string, string>('get-all-closure');
      expect(closure.all()).toBeInstanceOf(Map);
    });
  });

  describe('Error Handling', () => {
    it('should warn when no server adapter implemented', () => {
      vi.stubGlobal('window', undefined);
      vi.useFakeTimers();

      const closure = createClosure<string, string>('server-closure');
      const result = closure.get('server-key');

      vi.runAllTimers();

      expect(result).toBeUndefined();
      expect(errorSpy).toHaveBeenCalled();

      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it('should handle missing adapter error', () => {
      setAsyncStorageAdapter({
        run: () => {},
        getStore: () => undefined,
      } as never);
      const closure = createClosure<string, string>('missing-adapter');

      expect(() => {
        return closure.get('missing-adapter-key');
      }).toThrow('Closure adapter is missing.');
    });

    it('should handle calling closure.get outside of a context', () => {
      const closure = createClosure<string, string>('outside-context');

      const result = closure.run(undefined as never, () => {
        return closure.get('outside-context-key');
      });

      expect(result).toBeUndefined();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle calling closure.set outside of a context', () => {
      const closure = createClosure<string, string>('outside-context');

      closure.run(undefined as never, () => {
        closure.set('outside-context-key', 'outside-context-value');
      });

      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle calling closure.all outside of a context', () => {
      const closure = createClosure<string, string>('outside-context');

      closure.run(undefined as never, () => {
        expect(closure.all()).toBeUndefined();
      });

      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
