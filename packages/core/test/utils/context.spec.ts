import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  anchor,
  contextProvider,
  createContext,
  getAllContext,
  getContext,
  setContext,
  withContext,
} from '../../src/index.js';

describe('Anchor Utilities - Context', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal('window', {});

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  describe('createContext', () => {
    it('should create an empty context when no initial values provided', () => {
      const context = createContext();
      expect(context).toBeInstanceOf(Map);
      expect(context.size).toBe(0);
      expect(anchor.has(context));
    });

    it('should create a context with initial values', () => {
      const context = createContext([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);

      expect(context).toBeInstanceOf(Map);
      expect(context.size).toBe(2);
      expect(context.get('key1')).toBe('value1');
      expect(context.get('key2')).toBe('value2');
    });
  });

  describe('Context Store', () => {
    it('should handle error when running outside store', () => {
      withContext(null as never, () => {
        // Do nothing
      });

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('Context Access', () => {
    it('should set and get context values when context is activated', () => {
      const context = createContext();
      withContext(context, () => {
        setContext('key1', 'value1');
        setContext('key2', 42);

        expect(getContext('key1')).toBe('value1');
        expect(getContext('key2')).toBe(42);
      });
    });

    it('should return undefined for non-existent keys', () => {
      const context = createContext();
      withContext(context, () => {
        expect(getContext('nonexistent')).toBeUndefined();
      });
    });

    it('should handle different types of keys and values', () => {
      const context = createContext();
      withContext(context, () => {
        const symbolKey = Symbol('test');

        setContext('stringKey', 'stringValue');
        setContext(42, 'numericKey');
        setContext(symbolKey, { complex: 'object' });

        expect(getContext('stringKey')).toBe('stringValue');
        expect(getContext(42)).toBe('numericKey');
        expect(getContext(symbolKey)).toEqual({ complex: 'object' });
      });
    });

    it('should return the fallback value', () => {
      const context = createContext();
      withContext(context, () => {
        setContext('fallback-1', 'value1');

        expect(getContext('fallback-1', 'fallback')).toBe('value1');
        expect(getContext('fallback-2', 'fallback')).toBe('fallback');
      });
    });
  });

  describe('Edge cases', () => {
    it('should get all context value', () => {
      expect(getAllContext()).toBeInstanceOf(Map);
    });

    it('should handle falsy values correctly', () => {
      const context = createContext();
      withContext(context, () => {
        setContext('falsy', false);
        setContext('nullish', null);
        setContext('zero', 0);
        setContext('empty', '');

        expect(getContext('falsy')).toBe(false);
        expect(getContext('nullish')).toBe(null);
        expect(getContext('zero')).toBe(0);
        expect(getContext('empty')).toBe('');
      });
    });

    it('should handle setting the same key multiple times', () => {
      const context = createContext();
      withContext(context, () => {
        setContext('key', 'value1');
        expect(getContext('key')).toBe('value1');

        setContext('key', 'value2');
        expect(getContext('key')).toBe('value2');

        setContext('key', undefined);
        expect(getContext('key')).toBeUndefined();
      });
    });

    it('should handle large number of context entries', () => {
      const context = createContext();
      withContext(context, () => {
        // Add many entries
        for (let i = 0; i < 1000; i++) {
          setContext(`key${i}`, `value${i}`);
        }

        // Verify some entries
        expect(getContext('key0')).toBe('value0');
        expect(getContext('key500')).toBe('value500');
        expect(getContext('key999')).toBe('value999');
      });
    });

    it('should handle complex nested objects', () => {
      const context = createContext();

      withContext(context, () => {
        const complexObject = {
          nested: {
            array: [1, 2, { deep: 'value' }],
            date: new Date(),
            regex: /test/gi,
          },
          symbol: Symbol('test'),
        };

        setContext('complex', complexObject);
        const retrieved = getContext<typeof complexObject>('complex');

        expect(retrieved).toEqual(complexObject);
        expect(retrieved?.nested.array).toEqual(complexObject.nested.array);
      });
    });

    it('should run context provider', () => {
      setContext('provider-key', 'value1');
      const provide = contextProvider('provider-key', 'value2');

      expect(getContext('provider-key')).toBe('value1');
      provide(() => {
        expect(getContext('provider-key')).toBe('value2');
      });
    });
  });
});
