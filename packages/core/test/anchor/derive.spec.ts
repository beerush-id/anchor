import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, derive } from '../../src/index.js';

describe('Anchor Core - Derivation', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  describe('Derivation', () => {
    it('should subscribe to changes in anchored state', () => {
      const state = anchor({ count: 0 });
      const handler = vi.fn();

      const unsubscribe = derive(state, handler);

      // Handler should be called with init event
      expect(handler).toHaveBeenCalledWith(state, { type: 'init', keys: [] });

      // Update state and check if handler is called
      state.count = 1;
      expect(handler).toHaveBeenCalledWith(state, {
        type: 'set',
        keys: ['count'],
        prev: 0,
        value: 1,
      });

      // Unsubscribe and verify it works
      unsubscribe();
      handler.mockClear();
      state.count = 2;
      expect(handler).not.toHaveBeenCalled();
    });

    it('should work with non-reactive state', () => {
      const nonReactive = { count: 0 };
      const handler = vi.fn();

      const unsubscribe = derive(nonReactive, handler);

      // Handler should be called with init event even for non-reactive state
      expect(handler).toHaveBeenCalledWith(nonReactive, { type: 'init', keys: [] });
      expect(warnSpy).toHaveBeenCalled();

      // Unsubscribe should be a no-op
      unsubscribe();
    });

    it('should handle recursive subscription', () => {
      const state = anchor({
        user: {
          profile: {
            name: 'John',
          },
        },
      });
      const handler = vi.fn();

      const unsubscribe = derive(state, handler, true);

      // Initial call
      expect(handler).toHaveBeenCalledWith(state, { type: 'init', keys: [] });

      // Update nested property
      state.user.profile.name = 'Jane';
      expect(handler).toHaveBeenCalledWith(state, {
        type: 'set',
        keys: ['user', 'profile', 'name'],
        prev: 'John',
        value: 'Jane',
      });

      unsubscribe();
    });
  });

  describe('Logging', () => {
    it('should log state changes to console', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const state = anchor({ message: 'hello' });

      const unsubscribe = derive.log(state);

      // Check initial log
      expect(consoleSpy).toHaveBeenCalledWith(state, { type: 'init', keys: [] });

      // Update state and check if logged
      state.message = 'world';
      expect(consoleSpy).toHaveBeenCalledWith(state, {
        type: 'set',
        keys: ['message'],
        prev: 'hello',
        value: 'world',
      });

      unsubscribe();
      consoleSpy.mockRestore();
    });
  });

  describe('Piping', () => {
    it('should pipe changes from source to target', () => {
      const source = anchor({ count: 0 });
      const target: { count?: number } = {};

      const unsubscribe = derive.pipe(source, target);

      // Initial state
      expect(target).toEqual({ count: 0 });

      // Update source and check target
      source.count = 5;
      expect(target).toEqual({ count: 5 });

      unsubscribe();
      source.count = 10;
      expect(target).toEqual({ count: 5 }); // Should not change after unsubscribe
    });

    it('should pipe changes with transformation', () => {
      const source = anchor({ count: 1 });
      const target: { doubled?: number } = {};

      const unsubscribe = derive.pipe(source, target, (current) => ({ doubled: current.count * 2 }));

      // Initial state
      expect(target).toEqual({ doubled: 2 });

      // Update source and check transformed target
      source.count = 3;
      expect(target).toEqual({ doubled: 6 });

      unsubscribe();
    });

    it('should handle piping from non-reactive source', () => {
      const source = { count: 0 };
      const target: { count?: number } = {};

      const unsubscribe = derive.pipe(source, target);

      // Should log error but not throw
      expect(errorSpy).toHaveBeenCalled();
      expect(target).toEqual({});

      unsubscribe();
    });

    it('should handle piping to non-assignable target', () => {
      const source = anchor({ count: 0 });
      const target = 'not-an-object';

      // @ts-expect-error Testing invalid target
      const unsubscribe = derive.pipe(source, target);

      // Should log error but not throw
      expect(errorSpy).toHaveBeenCalled();

      unsubscribe();
    });
  });

  describe('Binding', () => {
    it('should bind two states together', () => {
      const left = anchor({ value: 1 });
      const right = anchor({ value: 2 });

      const unsubscribe = derive.bind(left, right);

      // Initial binding - right should take left's value
      expect(left.value).toBe(1);
      expect(right.value).toBe(1);

      // Update left and check right
      left.value = 10;
      expect(left.value).toBe(10);
      expect(right.value).toBe(10);

      // Update right and check left
      right.value = 20;
      expect(left.value).toBe(20);
      expect(right.value).toBe(20);

      unsubscribe();
    });

    it('should bind with transformations', () => {
      const left = anchor({ celsius: 0 });
      const right = anchor({ fahrenheit: 32 });

      const unsubscribe = derive.bind(
        left,
        right,
        (current) => ({ fahrenheit: (current.celsius * 9) / 5 + 32 }),
        (current) => ({ celsius: ((current.fahrenheit - 32) * 5) / 9 })
      );

      // Initial binding
      expect(left.celsius).toBe(0);
      expect(right.fahrenheit).toBe(32);

      // Update celsius and check fahrenheit
      left.celsius = 100;
      expect(left.celsius).toBe(100);
      expect(right.fahrenheit).toBe(212);

      // Update fahrenheit and check celsius
      right.fahrenheit = 32;
      expect(left.celsius).toBe(0);
      expect(right.fahrenheit).toBe(32);

      unsubscribe();
    });

    it('should handle binding non-reactive states', () => {
      const left = { value: 1 };
      const right = anchor({ value: 2 });

      const unsubscribe = derive.bind(left, right);

      // Should log error but not throw
      expect(errorSpy).toHaveBeenCalled();

      unsubscribe();
    });
  });

  describe('Resolve', () => {
    it('should resolve controller for anchored state', () => {
      const state = anchor({ count: 0 });
      const controller = derive.resolve(state);

      expect(controller).toBeDefined();
      expect(controller?.meta).toBeDefined();
      expect(typeof controller?.subscribe).toBe('function');
      expect(typeof controller?.destroy).toBe('function');
    });

    it('should return undefined for non-reactive state', () => {
      const nonReactive = { count: 0 };
      const controller = derive.resolve(nonReactive);

      expect(controller).toBeUndefined();
    });
  });
});
