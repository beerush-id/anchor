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

  describe('Map Contract', () => {
    it('should allow to mutate Map without contract', () => {
      const readonly = anchor.immutable(
        new Map([
          ['a', 1],
          ['b', 2],
        ])
      );
      const writable = anchor.writable(readonly);

      (readonly as Mutable<typeof readonly>).set('c', 3); // Should be trapped
      writable.set('d', 4); // Should be passed

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(readonly.get('d')).toBe(4);
      expect(writable.get('d')).toBe(4);
      expect(readonly.size).toBe(3);
      expect(writable.size).toBe(3);
    });

    it('should allow to mutate Map with specific method contract', () => {
      const readonly = anchor.immutable(
        new Map([
          ['a', 1],
          ['b', 2],
        ])
      );
      const writable = anchor.writable(readonly, ['set']);

      (readonly as Mutable<typeof readonly>).set('c', 3); // Should be trapped
      writable.set('d', 4); // Should be passed
      (writable as Mutable<typeof readonly>).delete('a'); // Should be trapped

      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(readonly.get('d')).toBe(4);
      expect((writable as Mutable<typeof readonly>).get('d')).toBe(4);
      expect(readonly.has('a')).toBe(true); // Delete was trapped
      expect((writable as Mutable<typeof readonly>).has('a')).toBe(true); // Delete was trapped
    });

    it('should allow to use multiple Map methods with contract', () => {
      const readonly = anchor.immutable(
        new Map([
          ['a', 1],
          ['b', 2],
        ])
      );
      const writable = anchor.writable(readonly, ['set', 'delete']);

      writable.set('c', 3); // Should be passed
      writable.delete('a'); // Should be passed

      // These should be trapped
      (readonly as Mutable<typeof readonly>).clear();
      (writable as Mutable<typeof readonly>).clear();

      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(readonly.size).toBe(2);
      expect((writable as Mutable<typeof readonly>).size).toBe(2);
      expect(readonly.get('a')).toBeUndefined();
      expect((writable as Mutable<typeof readonly>).get('a')).toBeUndefined();
      expect((writable as Mutable<typeof readonly>).get('c')).toBe(3);
    });

    it('should allow to use clear method with contract', () => {
      const readonly = anchor.immutable(
        new Map([
          ['a', 1],
          ['b', 2],
        ])
      );
      const writable = anchor.writable(readonly, ['clear']);

      // These should be trapped
      (readonly as Mutable<typeof readonly>).set('c', 3);
      (writable as Mutable<typeof readonly>).set('d', 4);
      (readonly as Mutable<typeof readonly>).delete('a');
      (writable as Mutable<typeof readonly>).delete('b');

      // This should be passed
      writable.clear();

      expect(errorSpy).toHaveBeenCalledTimes(4);
      expect(readonly.size).toBe(0);
      expect((writable as Mutable<typeof readonly>).size).toBe(0);
    });

    it('should handle all Map methods with full contract', () => {
      const readonly = anchor.immutable(
        new Map([
          ['a', 1],
          ['b', 2],
        ])
      );
      const writable = anchor.writable(readonly, ['set', 'delete', 'clear']);

      // All these should be passed
      writable.set('c', 3);
      writable.set('d', 4);
      writable.delete('a');
      writable.clear();

      expect(errorSpy).toHaveBeenCalledTimes(0);
      expect(readonly.size).toBe(0);
      expect(writable.size).toBe(0);
    });

    it('should correctly return values from Map methods', () => {
      const readonly = anchor.immutable(new Map([['x', 10]]));
      const writable = anchor.writable(readonly);

      // set returns the Map itself
      expect(writable.set('y', 20)).toBe(writable);

      // delete returns boolean
      expect(writable.delete('x')).toBe(true);
      expect(writable.delete('z')).toBe(false); // non-existent key

      // clear returns undefined
      expect(writable.clear()).toBeUndefined();
    });

    it('should preserve Map order with contracts', () => {
      const readonly = anchor.immutable(
        new Map([
          ['a', 1],
          ['b', 2],
        ])
      );
      const writable = anchor.writable(readonly, ['set', 'delete']);

      writable.set('c', 3);
      writable.delete('a');
      writable.set('d', 4);

      const keys = [...writable.keys()];
      expect(keys).toEqual(['b', 'c', 'd']);
    });

    it('should handle empty Map with contracts', () => {
      const readonly = anchor.immutable(new Map());
      const writable = anchor.writable(readonly, ['set', 'clear']);

      expect(readonly.size).toBe(0);
      expect(writable.size).toBe(0);

      writable.set('a', 1);
      expect(readonly.size).toBe(1);
      expect(writable.size).toBe(1);

      writable.clear();
      expect(readonly.size).toBe(0);
      expect(writable.size).toBe(0);
    });

    it('should trap mutations on readonly Map with any contract', () => {
      const readonly = anchor.immutable(new Map([['a', 1]]));
      anchor.writable(readonly, ['set']);

      // All these should be trapped
      (readonly as Mutable<typeof readonly>).set('b', 2);
      (readonly as Mutable<typeof readonly>).delete('a');
      (readonly as Mutable<typeof readonly>).clear();

      expect(errorSpy).toHaveBeenCalledTimes(3);
      expect(readonly.size).toBe(1);
      expect(readonly.get('a')).toBe(1);
      expect(readonly.get('b')).toBeUndefined();
    });
  });
});
