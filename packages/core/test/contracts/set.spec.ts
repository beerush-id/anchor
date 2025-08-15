import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mutable } from '@anchor/core';
import { anchor } from '@anchor/core';

describe('Anchor Core - Write Contract', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // errorSpy = vi.spyOn(console, 'error');
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('Set Contract', () => {
    it('should allow to mutate Set without contract', () => {
      const readonly = anchor.immutable(new Set([1, 2, 3]));
      const writable = anchor.writable(readonly);

      (readonly as Mutable<typeof readonly>).add(4); // Should be trapped
      writable.add(5); // Should be passed

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(readonly.has(5)).toBe(true);
      expect(writable.has(5)).toBe(true);
      expect(readonly.size).toBe(4);
      expect(writable.size).toBe(4);
    });

    it('should allow to mutate Set with specific method contract', () => {
      const readonly = anchor.immutable(new Set([1, 2, 3]));
      const writable = anchor.writable(readonly, ['add']);

      (readonly as Mutable<typeof readonly>).add(4); // Should be trapped
      writable.add(5); // Should be passed
      (writable as Mutable<typeof readonly>).delete(1); // Should be trapped

      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(readonly.has(5)).toBe(true);
      expect((writable as Mutable<typeof readonly>).has(5)).toBe(true);
      expect(readonly.has(1)).toBe(true); // Delete was trapped
      expect((writable as Mutable<typeof readonly>).has(1)).toBe(true); // Delete was trapped
    });

    it('should allow to use multiple Set methods with contract', () => {
      const readonly = anchor.immutable(new Set([1, 2, 3]));
      const writable = anchor.writable(readonly, ['add', 'delete']);

      writable.add(4); // Should be passed
      writable.delete(1); // Should be passed

      // These should be trapped
      (readonly as Mutable<typeof readonly>).clear();
      (writable as Mutable<typeof readonly>).clear();

      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(readonly.size).toBe(3);
      expect((writable as Mutable<typeof readonly>).size).toBe(3);
      expect(readonly.has(1)).toBe(false);
      expect((writable as Mutable<typeof readonly>).has(1)).toBe(false);
      expect((writable as Mutable<typeof readonly>).has(4)).toBe(true);
    });
  });
});
