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

  describe('Array Contract', () => {
    it('should allow to mutate array', () => {
      const readonly = anchor.immutable([1, 2, 3]);
      const writable = anchor.writable(readonly);

      (readonly as Mutable<typeof readonly>).push(4);
      writable.push(5);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(readonly).toEqual([1, 2, 3, 5]);
      expect(writable).toEqual([1, 2, 3, 5]);

      (readonly as Mutable<typeof readonly>).shift();
      writable.shift();

      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(readonly).toEqual([2, 3, 5]);
      expect(writable).toEqual([2, 3, 5]);
    });

    it('should allow to mutate array using specific method', () => {
      const readonly = anchor.immutable([1, 2, 3]);
      const writable = anchor.writable(readonly, ['push']);

      (readonly as Mutable<typeof readonly>).push(4); // Should be trapped.
      (readonly as Mutable<typeof readonly>).shift(); // Should be trapped.

      writable.push(5); // Should be passed.
      (writable as Mutable<typeof readonly>).shift(); // Should be trapped.

      expect(errorSpy).toHaveBeenCalledTimes(3);
      expect(readonly).toEqual([1, 2, 3, 5]);
      expect(writable).toEqual([1, 2, 3, 5]);
    });

    it('should allow to use multiple array methods with contract', () => {
      const readonly = anchor.immutable([1, 2, 3]);
      const writable = anchor.writable(readonly, ['push', 'pop', 'shift']);

      writable.push(4); // Should be passed
      writable.shift(); // Should be passed
      writable.pop(); // Should be passed

      // These should be trapped
      (readonly as Mutable<typeof readonly>).unshift(0);
      (writable as Mutable<typeof readonly>).unshift(0);

      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(readonly).toEqual([2, 3]);
      expect(writable).toEqual([2, 3]);
    });

    it('should preserve array behavior with contract', () => {
      const readonly = anchor.immutable([1, 2, 3]);
      const writable = anchor.writable(readonly, ['splice', 'sort']);

      // Test splice
      const spliced = writable.splice(1, 1, 5);
      expect(spliced).toEqual([2]);
      expect(writable).toEqual([1, 5, 3]);

      // Test sort
      writable.sort();
      expect(writable).toEqual([1, 3, 5]);

      // These should be trapped
      (readonly as Mutable<typeof readonly>).reverse();
      (writable as Mutable<typeof readonly>).reverse();

      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(readonly).toEqual([1, 3, 5]);
      expect(writable).toEqual([1, 3, 5]);
    });
  });

  describe('All Array Mutation Methods', () => {
    it('should support all array mutation methods without contract', () => {
      const readonly = anchor.immutable([1, 2, 3, 4, 5]);
      const writable = anchor.writable(readonly);

      // Test push
      const pushResult = writable.push(6, 7);
      expect(pushResult).toBe(7); // New length
      expect(writable).toEqual([1, 2, 3, 4, 5, 6, 7]);

      // Test pop
      const popResult = writable.pop();
      expect(popResult).toBe(7); // Popped element
      expect(writable).toEqual([1, 2, 3, 4, 5, 6]);

      // Test shift
      const shiftResult = writable.shift();
      expect(shiftResult).toBe(1); // Shifted element
      expect(writable).toEqual([2, 3, 4, 5, 6]);

      // Test unshift
      const unshiftResult = writable.unshift(0, 1);
      expect(unshiftResult).toBe(7); // New length
      expect(writable).toEqual([0, 1, 2, 3, 4, 5, 6]);

      // Test splice (remove 3 elements from index 2, insert 9, 10)
      const spliceResult = writable.splice(2, 3, 9, 10);
      expect(spliceResult).toEqual([2, 3, 4]); // Removed elements
      expect(writable).toEqual([0, 1, 9, 10, 5, 6]);

      // Test fill
      const fillResult = writable.fill(8, 2, 4);
      expect(fillResult).toEqual(writable); // Returns the array itself
      expect(writable).toEqual([0, 1, 8, 8, 5, 6]);

      // Test reverse
      const reverseResult = writable.reverse();
      expect(reverseResult).toEqual(writable); // Returns the array itself
      expect(writable).toEqual([6, 5, 8, 8, 1, 0]);

      // Test sort
      const sortResult = writable.sort();
      expect(sortResult).toEqual(writable); // Returns the array itself
      expect(writable).toEqual([0, 1, 5, 6, 8, 8]);

      // Verify readonly has the same values
      expect(readonly).toEqual(writable);

      // Check that mutations on readonly were trapped
      (readonly as Mutable<typeof readonly>).push(9);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(readonly).toEqual([0, 1, 5, 6, 8, 8]); // Unchanged
    });

    it('should support specific array methods with contract', () => {
      const readonly = anchor.immutable(['a', 'b', 'c']);
      const writable = anchor.writable(readonly, ['push', 'pop', 'push']);

      // These should be trapped
      (readonly as Mutable<typeof readonly>).shift();
      (writable as Mutable<typeof readonly>).unshift('x');
      (writable as Mutable<typeof readonly>).splice(1, 1);

      // These should pass
      writable.push('d');
      const popped = writable.pop();

      expect(errorSpy).toHaveBeenCalledTimes(3);
      expect(readonly).toEqual(['a', 'b', 'c']);
      expect(popped).toBe('d');
    });
  });

  describe('Array Method Return Values', () => {
    it('should return correct values from array methods', () => {
      const readonly = anchor.immutable([1, 2, 3, 4, 5]);
      const writable = anchor.writable(readonly);

      // push returns new length
      expect(writable.push(6)).toBe(6); // [1, 2, 3, 4, 5, 6]

      // pop returns removed element
      expect(writable.pop()).toBe(6); // [1, 2, 3, 4, 5]

      // shift returns removed element
      expect(writable.shift()).toBe(1); // [2, 3, 4, 5]

      // unshift returns new length
      expect(writable.unshift(0)).toBe(5); // [0, 2, 3, 4, 5]

      // fill returns the array
      expect(writable.fill(9, 0, 1)).toBe(writable); // [9, 2, 3, 4, 5]
      expect(writable[0]).toBe(9);

      // sort returns the array
      const sorted = writable.sort((a, b) => a - b); // [2, 3, 4, 5, 9]
      expect(sorted).toBe(writable);
      expect(sorted).toEqual([2, 3, 4, 5, 9]);
      expect(writable).toEqual([2, 3, 4, 5, 9]);

      // reverse returns the array
      const reversed = writable.reverse(); // [9, 5, 4, 3, 2]
      expect(reversed).toBe(writable);
      expect(writable).toEqual([9, 5, 4, 3, 2]);

      // splice returns removed elements
      expect(writable.splice(1, 2, 10, 11)).toEqual([5, 4]);
      expect(writable).toEqual([9, 10, 11, 3, 2]);
    });
  });

  describe('Array Method Edge Cases', () => {
    it('should handle empty arrays', () => {
      const readonly = anchor.immutable<number[]>([]);
      const writable = anchor.writable(readonly);

      expect(writable.push(1)).toBe(1);
      expect(writable).toEqual([1]);

      expect(writable.pop()).toBe(1);
      expect(writable).toEqual([]);

      expect(writable.shift()).toBeUndefined();
      expect(writable).toEqual([]);

      expect(writable.unshift(2)).toBe(1);
      expect(writable).toEqual([2]);
    });

    it('should handle single element arrays', () => {
      const readonly = anchor.immutable([42]);
      const writable = anchor.writable(readonly);

      expect(writable.pop()).toBe(42);
      expect(writable).toEqual([]);

      expect(writable.shift()).toBeUndefined(); // Already empty
      expect(writable).toEqual([]);

      writable.push(1);
      expect(writable.unshift(2)).toBe(2);
      expect(writable).toEqual([2, 1]);
    });

    it('should handle large arrays', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => i);
      const readonly = anchor.immutable(largeArray);
      const writable = anchor.writable(readonly); // [0, 1, 2, 3, 4, 5, ..., 998, 999] (1000)

      // Test various operations on large array
      expect(writable.push(1000)).toBe(1001); // [0, 1, 2, 3, 4, 5, ..., 999, 1000] (1001)
      expect(writable[writable.length - 1]).toBe(1000);
      expect(writable[writable.length - 2]).toBe(999);

      expect(writable.unshift(-1)).toBe(1002); // [-1, 0, 1, 2, 3, 4, 5, ..., 999, 1000] (1002)
      expect(writable[0]).toBe(-1);
      expect(writable[1]).toBe(0);

      expect(writable.shift()).toBe(-1); // [0, 1, 2, 3, 4, 5, ..., 999, 1000] (1001)
      expect(writable[0]).toBe(0);

      expect(writable.pop()).toBe(1000); // [0, 1, 2, 3, 4, 5, ..., 998, 999] (1000)

      // Check specific elements
      expect(writable[0]).toBe(0);
      expect(writable[999]).toBe(999); // Last index same as value, since value start from 0.
      expect(writable.length).toBe(1000);
    });
  });

  describe('Array Method Contract Edge Cases', () => {
    it('should handle contracts with non-mutating array methods', () => {
      const readonly = anchor.immutable([3, 1, 4, 1, 5]);
      // concat, slice, and indexOf are not mutating methods, so contract should not affect them
      // But we're testing what happens if they are mistakenly included in contract
      const writable = anchor.writable(readonly, ['concat' as never, 'slice' as never]);

      // These should still be trapped because concat and slice are not in ARRAY_MUTATIONS
      (writable as Mutable<typeof readonly>).push(9);
      (writable as Mutable<typeof readonly>).pop();

      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(readonly).toEqual([3, 1, 4, 1, 5]); // No changes
    });

    it('should handle contracts with duplicate method names', () => {
      const readonly = anchor.immutable([1, 2, 3]);
      const writable = anchor.writable(readonly, ['push', 'push', 'pop', 'push']);

      // These should be trapped
      (writable as Mutable<typeof readonly>).shift();

      // These should pass
      writable.push(4); // [1, 2, 3, 4]
      const popped = writable.pop(); // [1, 2, 3]

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(readonly).toEqual([1, 2, 3]); // Only push and pop worked
      expect(popped).toBe(4);
    });
  });
});
