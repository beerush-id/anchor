import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mutable } from '../../src/index.js';
import { anchor } from '../../src/index.js';

describe('Anchor Core - Write Contract Complex Scenarios', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('Mixed Data Types', () => {
    it('should handle objects with mixed data types', () => {
      const readonly = anchor.immutable({
        stringProp: 'initial',
        numberProp: 1,
        booleanProp: true,
        arrayProp: [1, 2, 3],
        objectProp: { nested: 'value' },
        mapProp: new Map([['key', 'value']]),
        setProp: new Set([1, 2, 3]),
        dateProp: new Date('2023-01-01'),
      });

      const writable = anchor.writable(readonly);

      // Modify all properties on readonly (should be trapped)
      (readonly as Mutable<typeof readonly>).stringProp = 'readonly_string';
      (readonly as Mutable<typeof readonly>).numberProp = 2;
      (readonly as Mutable<typeof readonly>).booleanProp = false;
      (readonly.arrayProp as Mutable<typeof readonly.arrayProp>).push(4);
      (readonly.objectProp as Mutable<typeof readonly.objectProp>).nested = 'readonly_nested';
      (readonly.mapProp as Mutable<typeof readonly.mapProp>).set('key2', 'value2');
      (readonly.setProp as Mutable<typeof readonly.setProp>).add(4);

      expect(errorSpy).toHaveBeenCalledTimes(7);

      // Modify all properties on writable (should be passed)
      writable.stringProp = 'writable_string';
      writable.numberProp = 3;
      writable.booleanProp = true;

      // Nested mutation on writable (should be trapped)
      (writable.arrayProp as Mutable<typeof readonly.arrayProp>).push(5);
      (writable.objectProp as Mutable<typeof readonly.objectProp>).nested = 'writable_nested';
      (writable.mapProp as Mutable<typeof readonly.mapProp>).set('key3', 'value3');
      (writable.setProp as Mutable<typeof readonly.setProp>).add(5);

      expect(readonly.stringProp).toBe('writable_string');
      expect(readonly.numberProp).toBe(3);
      expect(readonly.booleanProp).toBe(true);
      expect(readonly.arrayProp).toEqual([1, 2, 3]);
      expect(readonly.objectProp.nested).toBe('value');
      expect(readonly.mapProp.size).toBe(1);
      expect(readonly.setProp.size).toBe(3);

      expect(writable.stringProp).toBe('writable_string');
      expect(writable.numberProp).toBe(3);
      expect(writable.booleanProp).toBe(true);
      expect(writable.arrayProp).toEqual([1, 2, 3]);
      expect(writable.objectProp.nested).toBe('value');
      expect(writable.mapProp.size).toBe(1);
      expect(writable.setProp.size).toBe(3);
    });
  });

  describe('Performance and Memory', () => {
    it('should not create memory leaks with multiple writable instances', () => {
      const readonly = anchor.immutable({ a: 1, b: 2 });

      // Create multiple writable instances
      const writable1 = anchor.writable(readonly);
      const writable2 = anchor.writable(readonly);
      const writable3 = anchor.writable(readonly, ['a']);
      const writable4 = anchor.writable(readonly, ['b']);

      // Perform mutations
      writable1.a = 10;
      writable2.b = 20;
      writable3.a = 30;
      (writable4 as Mutable<typeof readonly>).a = 40; // Should be trapped

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(readonly.a).toBe(30);
      expect(readonly.b).toBe(20);

      // Check that all instances point to the same underlying object
      expect(writable1).toEqual(writable2);
      expect(writable2).toEqual(writable3);
      expect(writable3).toEqual(writable4);
    });
  });

  describe('Contract Validation', () => {
    it('should properly validate property contracts', () => {
      const readonly = anchor.immutable({ a: 1, b: 2 });
      // Use symbol as a contract which doesn't exist on the object
      const symbol = Symbol('test');
      const writable = anchor.writable(readonly, [symbol as never]);

      // All operations should be trapped
      (writable as Mutable<typeof readonly>).a = 10;
      (writable as Mutable<typeof readonly>).b = 20;

      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(readonly.a).toBe(1);
      expect(readonly.b).toBe(2);
    });

    it('should handle contracts with inherited properties', () => {
      class TestClass {
        a = 1;
        b = 2;
      }

      const readonly = anchor.immutable(new TestClass());
      const writable = anchor.writable(readonly, ['a']);

      // This should be trapped
      (writable as Mutable<typeof readonly>).b = 20;

      // This should be passed
      writable.a = 10;

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(readonly.a).toBe(10);
      expect(readonly.b).toBe(2);
    });
  });
});
