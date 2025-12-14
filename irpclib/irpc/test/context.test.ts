import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createContext, getContext, setContext, setContextProvider, withContext } from '../src/context.js';
import type { IRPCContextProvider } from '../src/types.js';

describe('Context', () => {
  beforeEach(() => {
    // Clear any existing context provider
    // @ts-expect-error - accessing private variable for testing
    setContextProvider(undefined);
  });

  describe('Context Provider Registration', () => {
    it('should set the context provider', () => {
      const provider: IRPCContextProvider = {
        run: vi.fn(),
        getStore: vi.fn(),
      };

      setContextProvider(provider);
      // We can't easily verify this without accessing private variables
      // But we can test the behavior in withContext
    });
  });

  describe('Context Isolation Call', () => {
    it('should run function without context when no provider is set', () => {
      const fn = vi.fn().mockReturnValue('result');
      const ctx = createContext([['key', 'value']]);

      const result = withContext(ctx, fn);

      expect(fn).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('should run function with context when provider is set', () => {
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

  describe('Context Assignment', () => {
    it('should set and get context values without provider', () => {
      // Without a provider, these should not throw but won't actually store values
      expect(() => setContext('key', 'value')).not.toThrow();
      expect(getContext('key')).toBeUndefined();
      expect(getContext('key', 'fallback')).toBe('fallback');
    });

    it('should work with provider', () => {
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

      // Test within context
      const result = withContext(createContext(), () => {
        setContext('key', 'value');
        return getContext('key');
      });

      expect(result).toBe('value');
    });
  });
});
