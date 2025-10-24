import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  anchor,
  createContext,
  createObserver,
  ensureContext,
  getContext,
  setContext,
  setContextStore,
  withContext,
} from '../../src/index.js';

describe('Anchor Utilities - Context', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal('window', {});

    ensureContext(undefined, true);
    setContextStore(undefined as never);

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

    it('should handle error when running outside store in server', () => {
      vi.stubGlobal('window', undefined);

      withContext(createContext(), () => {
        // Do nothing
      });

      expect(errorSpy).toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it('should register context store', () => {
      const ctx = createContext([['foo', 'bar']]);

      setContextStore({
        run: vi.fn(),
        getStore() {
          return ctx;
        },
      });

      setContext('bar', 'baz');

      expect(getContext('foo')).toBe('bar');
      expect(getContext('bar')).toBe('baz');
    });

    it('should handle running inside a store', () => {
      const ctx1 = createContext([['foo', 'baz']]);
      const ctx2 = createContext([['foo', 'boz']]);

      setContextStore({
        ctx: null as never,
        run(ctx: unknown, fn: () => void) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this as any).ctx = ctx as never;
          fn();
        },
        getStore() {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (this as any).ctx;
        },
      } as never);

      withContext(ctx1, () => {
        expect(getContext('foo')).toBe('baz');
      });

      withContext(ctx2, () => {
        expect(getContext('foo')).toBe('boz');
      });
    });

    it('should handle running inside a context', () => {
      vi.useFakeTimers();

      setContextStore(undefined as never);
      ensureContext(null as never, true);
      const ctx = createContext([['foo', 'bar']]);

      withContext(ctx, () => {
        const value = getContext('foo');
        expect(value).toBe('bar');
      });

      expect(errorSpy).not.toHaveBeenCalled();

      // Context no longer active after timer fire.
      const foo = getContext('foo');

      vi.runAllTimers();

      expect(foo).toBeUndefined();
      expect(errorSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('Context Access', () => {
    it('should set and get context values when context is activated', () => {
      ensureContext(createContext([['foo', 'init']]));

      setContext('key1', 'value1');
      setContext('key2', 42);

      expect(getContext('key1')).toBe('value1');
      expect(getContext('key2')).toBe(42);
    });

    it('should return undefined for non-existent keys', () => {
      expect(getContext('nonexistent')).toBeUndefined();
    });

    it('should handle different types of keys and values', () => {
      const symbolKey = Symbol('test');

      setContext('stringKey', 'stringValue');
      setContext(42, 'numericKey');
      setContext(symbolKey, { complex: 'object' });

      expect(getContext('stringKey')).toBe('stringValue');
      expect(getContext(42)).toBe('numericKey');
      expect(getContext(symbolKey)).toEqual({ complex: 'object' });
    });

    it('should return the fallback value', () => {
      setContext('fallback-1', 'value1');

      expect(getContext('fallback-1', 'fallback')).toBe('value1');
      expect(getContext('fallback-2', 'fallback')).toBe('fallback');
    });
  });

  describe('Error handling', () => {
    it('should warn when setContext is called outside of context', () => {
      ensureContext(null as never, true);
      setContextStore(undefined as never);
      setContext('key', 'value');
      expect(errorSpy).toHaveBeenCalled();

      ensureContext(undefined, true);
    });

    it('should warn when getContext is called outside of context', () => {
      vi.stubGlobal('window', undefined);

      const value = getContext('key');

      expect(value).toBeUndefined();
      expect(errorSpy).toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it('should handle when no window object', () => {
      vi.stubGlobal('window', undefined);

      expect(getContext('no-window')).toBeUndefined();
      expect(errorSpy).toHaveBeenCalled();

      vi.unstubAllGlobals();
    });
  });

  describe('Reactivity', () => {
    it('should react to context changes', () => {
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
    });

    it('should react to context changes with object value', () => {
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
    });
  });

  describe('Edge cases', () => {
    it('should handle falsy values correctly', () => {
      setContext('falsy', false);
      setContext('nullish', null);
      setContext('zero', 0);
      setContext('empty', '');

      expect(getContext('falsy')).toBe(false);
      expect(getContext('nullish')).toBe(null);
      expect(getContext('zero')).toBe(0);
      expect(getContext('empty')).toBe('');
    });

    it('should handle setting the same key multiple times', () => {
      setContext('key', 'value1');
      expect(getContext('key')).toBe('value1');

      setContext('key', 'value2');
      expect(getContext('key')).toBe('value2');

      setContext('key', undefined);
      expect(getContext('key')).toBeUndefined();
    });

    it('should handle large number of context entries', () => {
      // Add many entries
      for (let i = 0; i < 1000; i++) {
        setContext(`key${i}`, `value${i}`);
      }

      // Verify some entries
      expect(getContext('key0')).toBe('value0');
      expect(getContext('key500')).toBe('value500');
      expect(getContext('key999')).toBe('value999');
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

      setContext('complex', complexObject);
      const retrieved = getContext<typeof complexObject>('complex');

      expect(retrieved).toEqual(complexObject);
      expect(retrieved?.nested.array).toEqual(complexObject.nested.array);
    });
  });
});
