import { AsyncScope, type AsyncStore, getAsyncScope } from '@anchorlib/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createContext, getContext, setContext, setContextProvider, withContext } from '../src/context.js';
import type { IRPCContextProvider } from '../src/index.js';

describe('Context', () => {
  describe('Default Provider', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('should set and get context within withContext', async () => {
      const result = await withContext(createContext(), () => {
        setContext('key', 'value');
        return getContext('key');
      });

      expect(result).toBe('value');
    });

    it('should isolate context between withContext calls', async () => {
      await withContext(createContext(), () => {
        setContext('key', 'first');
      });

      const result = await withContext(createContext(), () => {
        return getContext('key');
      });

      expect(result).toBeUndefined();
    });

    it('should return fallback when key is not set', async () => {
      const result = await withContext(createContext(), () => {
        return getContext('missing', 'fallback');
      });

      expect(result).toBe('fallback');
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

  describe('Custom Provider', () => {
    it('set custom context provider', async () => {
      const prevProvider = getAsyncScope();
      const nextProvider = new AsyncScope<AsyncStore>();

      setContextProvider(nextProvider as IRPCContextProvider);
      expect(getAsyncScope()).toBe(nextProvider);
      expect(getAsyncScope()).not.toBe(prevProvider);
      setContextProvider(prevProvider as IRPCContextProvider);
    });
  });
});
