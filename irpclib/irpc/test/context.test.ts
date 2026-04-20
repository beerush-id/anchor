import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createContext, getContext, setContext, setContextProvider, withContext } from '../src/context.js';
import type { IRPCContextProvider } from '../src/types.js';

describe('Context', () => {
  describe('Default Provider', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('should set and get context within withContext', () => {
      const result = withContext(createContext(), () => {
        setContext('key', 'value');
        return getContext('key');
      });

      expect(result).toBe('value');
    });

    it('should isolate context between withContext calls', () => {
      withContext(createContext(), () => {
        setContext('key', 'first');
      });

      const result = withContext(createContext(), () => {
        return getContext('key');
      });

      expect(result).toBeUndefined();
    });

    it('should return fallback when key is not set', () => {
      const result = withContext(createContext(), () => {
        return getContext('missing', 'fallback');
      });

      expect(result).toBe('fallback');
    });

    it('should warn on non-browser environments', () => {
      withContext(createContext(), () => {});

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No context provider set'),
      );
    });
  });

  describe('Explicit Provider', () => {
    it('should use explicit provider when set', () => {
      const runMock = vi.fn((ctx, fn) => fn());
      const getStoreMock = vi.fn();

      const provider: IRPCContextProvider = {
        run: runMock,
        getStore: getStoreMock,
      };

      setContextProvider(provider);

      const fn = vi.fn().mockReturnValue('result');
      const ctx = createContext([['key', 'value']]);

      const result = withContext(ctx, fn);

      expect(runMock).toHaveBeenCalledWith(ctx, fn);
      expect(fn).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('should set and get context with provider', () => {
      let currentContext: Map<string, unknown> | undefined;

      const provider: IRPCContextProvider = {
        run: vi.fn(<R>(ctx: Map<string, unknown>, fn: () => R) => {
          const previousContext = currentContext;
          currentContext = ctx;
          try {
            return fn();
          } finally {
            currentContext = previousContext;
          }
        }) as never,
        getStore: vi.fn(() => currentContext) as never,
      };

      setContextProvider(provider);

      const result = withContext(createContext(), () => {
        setContext('key', 'value');
        return getContext('key');
      });

      expect(result).toBe('value');
    });
  });

  describe('Invalid Provider', () => {
    it('should throw on undefined', () => {
      // @ts-expect-error - testing invalid provider
      expect(() => setContextProvider(undefined)).toThrow(TypeError);
    });

    it('should throw on non-object values', () => {
      // @ts-expect-error - testing invalid provider
      expect(() => setContextProvider(true)).toThrow(TypeError);
      // @ts-expect-error - testing invalid provider
      expect(() => setContextProvider('string')).toThrow(TypeError);
      // @ts-expect-error - testing invalid provider
      expect(() => setContextProvider(null)).toThrow(TypeError);
    });

    it('should throw on objects missing required methods', () => {
      // @ts-expect-error - testing invalid provider
      expect(() => setContextProvider({ run: vi.fn() })).toThrow(TypeError);
      // @ts-expect-error - testing invalid provider
      expect(() => setContextProvider({ getStore: vi.fn() })).toThrow(TypeError);
    });
  });

  describe('Creating Context', () => {
    it('should create empty context', () => {
      const ctx = createContext();
      expect(ctx).toBeInstanceOf(Map);
      expect(ctx.size).toBe(0);
    });

    it('should create context with initial values', () => {
      const ctx = createContext([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);
      expect(ctx).toBeInstanceOf(Map);
      expect(ctx.size).toBe(2);
      expect(ctx.get('key1')).toBe('value1');
      expect(ctx.get('key2')).toBe('value2');
    });
  });
});
