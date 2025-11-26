import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { binding } from '../../src/binding.js';
import { anchor, type StateBindingRef, subscribe } from '../../src/index.js';

describe('Anchor Core - Binding Function', () => {
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

  describe('Basic Binding', () => {
    it('should bind source ref to target property and sync values', () => {
      const source = anchor({ value: 10 }) as StateBindingRef<number>;
      const target = anchor({ result: 5 });
      const targetHandler = vi.fn();

      // Subscribe to target to track changes
      const unsubscribeTarget = subscribe(target, targetHandler);

      // Initial values
      expect(source.value).toBe(10);
      expect(target.result).toBe(5);

      // Bind source.value to target.result
      const unsubscribe = binding<number, typeof source>(source, target, 'result');

      // After binding, target should be updated to match source
      expect(source.value).toBe(10);
      expect(target.result).toBe(10);

      // Clear initial calls
      targetHandler.mockClear();

      // Update source, target should be updated
      source.value = 20;
      expect(source.value).toBe(20);
      expect(target.result).toBe(20);
      expect(targetHandler).toHaveBeenCalled();

      unsubscribe();
      unsubscribeTarget();
    });

    it('should bind source property to target property and sync values', () => {
      const source = anchor({ count: 1 });
      const target = anchor({ counter: 2 });
      const sourceHandler = vi.fn();
      const targetHandler = vi.fn();

      // Subscribe to both to track changes
      const unsubscribeSource = subscribe(source, sourceHandler);
      const unsubscribeTarget = subscribe(target, targetHandler);

      // Initial values
      expect(source.count).toBe(1);
      expect(target.counter).toBe(2);

      // Bind source.count to target.counter
      const unsubscribe = binding<number, typeof source>([source, 'count'], target, 'counter');

      // After binding, target should be updated to match source
      expect(source.count).toBe(1);
      expect(target.counter).toBe(1);

      // Clear initial calls
      sourceHandler.mockClear();
      targetHandler.mockClear();

      // Update source, target should be updated
      source.count = 10;
      expect(source.count).toBe(10);
      expect(target.counter).toBe(10);
      expect(sourceHandler).toHaveBeenCalled();
      expect(targetHandler).toHaveBeenCalled();

      // Clear mocks
      sourceHandler.mockClear();
      targetHandler.mockClear();

      // Update target, source should be updated
      target.counter = 20;
      expect(source.count).toBe(20);
      expect(target.counter).toBe(20);
      expect(sourceHandler).toHaveBeenCalled();
      expect(targetHandler).toHaveBeenCalled();

      unsubscribe();
      unsubscribeSource();
      unsubscribeTarget();
    });

    it('should properly unsubscribe and stop syncing', () => {
      const source = anchor({ value: 1 }) as StateBindingRef<number>;
      const target = anchor({ result: 2 });
      const targetHandler = vi.fn();

      const unsubscribeTarget = subscribe(target, targetHandler);

      // Bind source.value to target.result
      const unsubscribe = binding<number, typeof source>(source, target, 'result');

      // After binding
      expect(source.value).toBe(1);
      expect(target.result).toBe(1);

      // Clear initial calls
      targetHandler.mockClear();

      // Unsubscribe the binding
      unsubscribe();

      // Update source, target should NOT be updated
      source.value = 10;
      expect(source.value).toBe(10);
      expect(target.result).toBe(1);
      expect(targetHandler).not.toHaveBeenCalled();

      unsubscribeTarget();
    });
  });

  describe('Binding Edge Cases', () => {
    it('should handle binding with non-reactive source', () => {
      const source = { value: 1 }; // Not reactive
      const target = anchor({ result: 2 });

      // This should not throw but log an error
      const unsubscribe = binding(source as never, target, 'result');

      // Should log error but not throw
      expect(errorSpy).toHaveBeenCalled();

      // Values should remain unchanged
      expect(source.value).toBe(1);
      expect(target.result).toBe(2);

      unsubscribe();
    });

    it('should handle binding with non-reactive target', () => {
      const source = anchor({ value: 1 }) as StateBindingRef<number>;
      const target = { result: 2 }; // Not reactive

      // This should not throw but log an error
      const unsubscribe = binding<number, typeof source>(source, target as never, 'result');

      // Should log error but not throw
      expect(errorSpy).toHaveBeenCalled();

      // Values should remain unchanged
      expect(source.value).toBe(1);
      expect(target.result).toBe(2);

      unsubscribe();
    });

    it('should handle rapid successive updates without conflicts', () => {
      const source = anchor({ value: 0 }) as StateBindingRef<number>;
      const target = anchor({ result: 0 });

      const unsubscribe = binding<number, typeof source>(source, target, 'result');

      // Perform rapid updates
      source.value = 1;
      source.value = 2;
      source.value = 3;
      target.result = 4;
      target.result = 5;
      source.value = 6;

      // Final values should be consistent
      expect(source.value).toBe(6);
      expect(target.result).toBe(6);

      unsubscribe();
    });

    it('should not update when values are already equal', () => {
      const source = anchor({ value: 5 }) as StateBindingRef<number>;
      const target = anchor({ result: 5 });
      const targetHandler = vi.fn();

      const unsubscribeTarget = subscribe(target, targetHandler);
      const unsubscribe = binding<number, typeof source>(source, target, 'result');

      // Since values were already equal, no update should occur
      expect(targetHandler).toHaveBeenCalledTimes(1); // Only init call

      // Update with same value
      source.value = 5; // Same as current value
      expect(targetHandler).toHaveBeenCalledTimes(1); // Still only init call

      unsubscribe();
      unsubscribeTarget();
    });
  });
});
