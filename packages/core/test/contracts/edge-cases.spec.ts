import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mutable } from '../../src/index.js';
import { anchor } from '../../src/index.js';

describe('Anchor Core - Write Contract', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // errorSpy = vi.spyOn(console, 'error');
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('Error Cases and Edge Scenarios', () => {
    it('should handle non-reactive state gracefully', () => {
      const plainObject = { a: 1, b: 2 };
      const writable = anchor.writable(plainObject);

      // Should be the same object since it's not reactive
      expect(writable).toBe(plainObject);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle empty contracts', () => {
      const readonly = anchor.immutable({ a: 1, b: 2 });
      const writable = anchor.writable(readonly, []);

      // All mutations should be trapped since no properties are allowed
      (writable as Mutable<typeof readonly>).a = 3;
      (writable as Mutable<typeof readonly>).b = 4;

      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(readonly.a).toBe(1);
      expect(readonly.b).toBe(2);
    });

    it('should handle non-existent property contracts', () => {
      const readonly = anchor.immutable({ a: 1, b: 2 });
      const writable = anchor.writable(readonly, ['c' as never]); // 'c' doesn't exist

      // All mutations should be trapped since 'c' doesn't exist on the object
      (writable as Mutable<typeof readonly>).a = 3;
      (writable as Mutable<typeof readonly>).b = 4;

      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(readonly.a).toBe(1);
      expect(readonly.b).toBe(2);
    });

    it('should handle array with non-existent method contracts', () => {
      const readonly = anchor.immutable([1, 2, 3]);
      const writable = anchor.writable(readonly, ['nonExistentMethod' as never]);

      // All mutations should be trapped since 'nonExistentMethod' doesn't exist
      (writable as Mutable<typeof readonly>).push(4);
      (writable as Mutable<typeof readonly>).pop();

      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(readonly).toEqual([1, 2, 3]);
    });

    it('should handle Map with non-existent method contracts', () => {
      const readonly = anchor.immutable(
        new Map([
          ['a', 1],
          ['b', 2],
        ])
      );
      const writable = anchor.writable(readonly, ['nonExistentMethod' as never]);

      // All mutations should be trapped since 'nonExistentMethod' doesn't exist
      (writable as Mutable<typeof readonly>).set('c', 3);
      (writable as Mutable<typeof readonly>).delete('a');

      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(readonly.size).toBe(2);
      expect(readonly.get('a')).toBe(1);
    });

    it('should handle Set with non-existent method contracts', () => {
      const readonly = anchor.immutable(new Set([1, 2, 3]));
      const writable = anchor.writable(readonly, ['nonExistentMethod' as never]);

      // All mutations should be trapped since 'nonExistentMethod' doesn't exist
      (writable as Mutable<typeof readonly>).add(4);
      (writable as Mutable<typeof readonly>).delete(1);

      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(readonly.size).toBe(3);
      expect(readonly.has(1)).toBe(true);
    });
  });
});
