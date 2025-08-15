import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mutable } from '@anchor/core';
import { anchor } from '@anchor/core';

describe('Anchor - Write Contract', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // errorSpy = vi.spyOn(console, 'error');
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('Object Contract', () => {
    it('should allow to mutate property of object', () => {
      const readonly = anchor.immutable({ a: 1, b: 2 });
      const writable = anchor.writable(readonly);

      (readonly as Mutable<typeof readonly>).a = 2; // Should be trapped.
      (readonly as Mutable<typeof readonly>).b = 3; // Should be trapped.

      writable.a = 4; // Should be passed.
      writable.b = 5; // Should be passed.

      expect(errorSpy).toHaveBeenCalledTimes(2); // Triggered by mutation on readonly object.

      expect(readonly.a).toBe(4);
      expect(writable.a).toBe(4);
      expect(readonly.b).toBe(5);
      expect(writable.b).toBe(5);
    });

    it('should allow to mutate specific property of object', () => {
      const readonly = anchor.immutable({ a: 1, b: 2 });
      const writable = anchor.writable(readonly, ['a']);

      (readonly as Mutable<typeof readonly>).a = 2; // Should be trapped.
      (readonly as Mutable<typeof readonly>).b = 5; // Should be trapped.

      writable.a = 3; // Should be passed.
      (writable as Mutable<typeof readonly>).b = 4; // Should be trapped.

      expect(errorSpy).toHaveBeenCalledTimes(3);

      expect(readonly.a).toBe(3);
      expect(writable.a).toBe(3);
      expect(readonly.b).toBe(2);
      expect((writable as Mutable<typeof readonly>).b).toBe(2);
    });

    it('should allow to mutate multiple properties of object', () => {
      const readonly = anchor.immutable({ a: 1, b: 2, c: 3 });
      const writable = anchor.writable(readonly, ['a', 'b']);

      anchor.assign(readonly, { a: 2, b: 3 });
      anchor.assign(writable, { a: 4, b: 5 });
      anchor.assign(writable as typeof readonly, { c: 6 });

      expect(errorSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledTimes(3);
      expect(readonly).toEqual({ a: 4, b: 5, c: 3 });
      expect(writable).toEqual({ a: 4, b: 5, c: 3 });
    });

    it('should allow to delete properties of object with contract', () => {
      const readonly = anchor.immutable({ a: 1, b: 2, c: 3 });
      const writable = anchor.writable(readonly, ['a', 'b']);

      // These should be trapped
      delete (readonly as Partial<Mutable<typeof readonly>>).a;
      delete (readonly as Partial<Mutable<typeof readonly>>).b;

      // This should work
      delete (writable as Partial<typeof writable>).a;
      // This should be trapped
      delete (writable as Partial<Mutable<typeof readonly>>).c;

      expect(errorSpy).toHaveBeenCalledTimes(3);
      expect(readonly).toEqual({ b: 2, c: 3 });
      expect(writable).toEqual({ b: 2, c: 3 });
    });
  });
});
