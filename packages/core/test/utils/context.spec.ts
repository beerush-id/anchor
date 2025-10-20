import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  activateContext,
  anchor,
  createContext,
  createObserver,
  deactivateGlobalContext,
  getActiveContext,
  getContext,
  setContext,
  withinContext,
  withinGlobalContext,
} from '../../src/index.js';

describe('Anchor Utilities - Context', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
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

  describe('activateContext and getContext/setContext', () => {
    it('should set global context in browser', () => {
      vi.stubGlobal('window', {});

      expect(getContext('foo')).toBeUndefined();
      expect(errorSpy).not.toHaveBeenCalled();

      setContext('foo', 'bar');

      expect(getContext('foo')).toBe('bar');
      expect(errorSpy).not.toHaveBeenCalled();

      // Remove global context.
      deactivateGlobalContext();
      deactivateGlobalContext(); // To verify the coverage.

      vi.restoreAllMocks();
    });

    it('should set and get context values when context is activated', () => {
      const context = createContext();
      const restore = activateContext(context);

      setContext('key1', 'value1');
      setContext('key2', 42);

      expect(getContext('key1')).toBe('value1');
      expect(getContext('key2')).toBe(42);

      restore();
    });

    it('should return undefined for non-existent keys', () => {
      const context = createContext();
      const restore = activateContext(context);

      expect(getContext('nonexistent')).toBeUndefined();

      restore();
    });

    it('should handle different types of keys and values', () => {
      const context = createContext();
      const restore = activateContext(context);
      const symbolKey = Symbol('test');

      setContext('stringKey', 'stringValue');
      setContext(42, 'numericKey');
      setContext(symbolKey, { complex: 'object' });

      expect(getContext('stringKey')).toBe('stringValue');
      expect(getContext(42)).toBe('numericKey');
      expect(getContext(symbolKey)).toEqual({ complex: 'object' });

      restore();
    });

    it('should handle context switching', () => {
      const context1 = createContext();
      const context2 = createContext();

      const restore1 = activateContext(context1);
      setContext('key', 'value1');
      expect(getActiveContext()).toBe(context1);
      expect(getContext('key')).toBe('value1');

      const restore2 = activateContext(context2);
      setContext('key', 'value2');
      expect(getContext('key')).toBe('value2');

      restore2();
      expect(getContext('key')).toBe('value1');

      restore1();
    });

    it('should return the same restore function when activating the same context', () => {
      const context = createContext();
      const restore1 = activateContext(context);
      const restore2 = activateContext(context);

      expect(restore1).toBe(restore2);

      restore1();
    });

    it('should not allow duplicate restoration', () => {
      const context = createContext();
      const restore = activateContext(context);

      setContext('key', 'value');
      expect(getContext('key')).toBe('value');

      restore();
      restore(); // Second call should not affect anything

      // After restoration, getContext should produce an error message
      expect(getContext('key')).toBeUndefined();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should return the fallback value', () => {
      const context = createContext();
      const restore = activateContext(context);

      setContext('key1', 'value1');

      expect(getContext('key1', 'fallback')).toBe('value1');
      expect(getContext('key2', 'fallback')).toBe('fallback');

      restore();
    });

    it('should run inside of global context', () => {
      vi.stubGlobal('window', {});
      const foo = withinGlobalContext(() => 10);

      expect(foo).toBe(10);
      expect(errorSpy).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    });

    it('should detect withinGlobalContext error', () => {
      expect(() =>
        withinGlobalContext(() => {
          throw new Error('test');
        })
      ).not.toThrow();
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('withinContext', () => {
    it('should execute function within context and return its result', () => {
      const context = createContext();
      const result = withinContext(context, () => {
        setContext('key', 'value');
        return getContext('key');
      });

      expect(result).toBe('value');
    });

    it('should automatically restore context after function execution', () => {
      const outerContext = createContext([['outer', 'outer-value']]);
      const innerContext = createContext();

      const restore = activateContext(outerContext);

      const result = withinContext(innerContext, () => {
        setContext('inner', 'inner-value');
        return getContext('inner');
      });

      // After withinContext, we should be back to outer context
      expect(result).toBe('inner-value');
      expect(getContext('inner')).toBe(undefined);
      expect(getContext('outer')).toBe('outer-value');

      restore();

      // getContext should now fail because we're outside any context
      expect(getContext('outer')).toBeUndefined();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should restore context even if function throws', () => {
      const context = createContext();
      const outerContext = createContext([['outer', 'value']]);
      const restore = activateContext(outerContext);

      expect(() => {
        withinContext(context, () => {
          setContext('inner', 'value');
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      // After withinContext, we should be back to outer context
      expect(getContext('inner')).toBeUndefined();
      restore();
    });
  });

  describe('Error handling', () => {
    it('should warn when setContext is called outside of context', () => {
      setContext('key', 'value');

      expect(errorSpy).toHaveBeenCalled();
    });

    it('should warn when getContext is called outside of context', () => {
      const value = getContext('key');

      expect(value).toBeUndefined();
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle nested context activations', () => {
      const context1 = createContext();
      const context2 = createContext();

      const restore1 = activateContext(context1);
      setContext('level', 1);

      const restore2 = activateContext(context2);
      setContext('level', 2);
      expect(getContext('level')).toBe(2);

      restore2();
      expect(getContext('level')).toBe(1);

      restore1();
    });
  });

  describe('Reactivity', () => {
    it('should react to context changes', () => {
      const context = createContext();
      const restore = activateContext(context);

      const handler = vi.fn();
      const observer = createObserver(handler);

      setContext('key1', 'value1');

      expect(handler).not.toHaveBeenCalled();

      observer.run(() => expect(getContext('key1')).toBe('value1'));
      observer.run(() => expect(getContext('key2')).toBeUndefined());

      setContext('key2', 'value2');
      expect(handler).toHaveBeenCalledTimes(1);

      setContext('key1', 'value3');
      expect(handler).toHaveBeenCalledTimes(2);

      expect(getContext('key1')).toBe('value3');
      expect(getContext('key2')).toBe('value2');

      restore();
    });

    it('should react to context changes with object value', () => {
      const context = createContext();
      const restore = activateContext(context);

      const handler = vi.fn();
      const observer = createObserver(handler);

      setContext('object', { count: 0 });
      expect(handler).not.toHaveBeenCalled();

      observer.run(() => expect(getContext('object')).toEqual({ count: 0 }));

      const state = getContext('object') as { count: number };
      expect(state).toEqual({ count: 0 });

      state.count++;
      expect(handler).toHaveBeenCalledTimes(1);
      expect(getContext('object')).toEqual({ count: 1 });

      state.count++;
      expect(handler).toHaveBeenCalledTimes(2);
      expect(getContext('object')).toEqual({ count: 2 });

      // Replace the context value.
      setContext('object', { count: 0 });

      expect(handler).toHaveBeenCalledTimes(3);
      expect(getContext('object')).toEqual({ count: 0 }); // New value is reflected.
      expect(state).toEqual({ count: 2 }); // Stale state is not updated.

      restore();
    });
  });

  describe('Edge cases', () => {
    it('should handle falsy values correctly', () => {
      const context = createContext();
      const restore = activateContext(context);

      setContext('falsy', false);
      setContext('nullish', null);
      setContext('zero', 0);
      setContext('empty', '');

      expect(getContext('falsy')).toBe(false);
      expect(getContext('nullish')).toBe(null);
      expect(getContext('zero')).toBe(0);
      expect(getContext('empty')).toBe('');

      restore();
    });

    it('should handle setting the same key multiple times', () => {
      const context = createContext();
      const restore = activateContext(context);

      setContext('key', 'value1');
      expect(getContext('key')).toBe('value1');

      setContext('key', 'value2');
      expect(getContext('key')).toBe('value2');

      setContext('key', undefined);
      expect(getContext('key')).toBeUndefined();

      restore();
    });

    it('should handle large number of context entries', () => {
      const context = createContext();
      const restore = activateContext(context);

      // Add many entries
      for (let i = 0; i < 1000; i++) {
        setContext(`key${i}`, `value${i}`);
      }

      // Verify some entries
      expect(getContext('key0')).toBe('value0');
      expect(getContext('key500')).toBe('value500');
      expect(getContext('key999')).toBe('value999');

      restore();
    });

    it('should handle complex nested objects', () => {
      const context = createContext();
      const restore = activateContext(context);

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

      restore();
    });
  });
});
