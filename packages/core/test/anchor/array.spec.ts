import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor } from '../../src/index.js';

describe('Anchor Core - Array Methods', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('Array Methods', () => {
    it('should handle array push operation', () => {
      const state = anchor([1, 2]);
      const length = state.push(3);
      expect(length).toBe(3);
      expect(state.length).toBe(3);
      expect(state[2]).toBe(3);
    });

    it('should handle array pop operation', () => {
      const state = anchor([1, 2, 3]);
      const lastItem = state.pop();
      expect(lastItem).toBe(3);
      expect(state.length).toBe(2);
    });

    it('should handle array unshift operation', () => {
      const state = anchor([1, 2]);
      const length = state.unshift(0);
      expect(length).toBe(3);
      expect(state[0]).toBe(0);
      expect(state[1]).toBe(1);
    });

    it('should handle array shift operation', () => {
      const state = anchor([1, 2, 3]);
      const firstItem = state.shift();
      expect(firstItem).toBe(1);
      expect(state.length).toBe(2);
      expect(state[0]).toBe(2);
    });

    it('should handle array splice operation', () => {
      const state = anchor([1, 2, 3, 4, 5]);
      const removed = state.splice(2, 2, 6, 7);
      expect(removed).toEqual([3, 4]);
      expect(state).toEqual([1, 2, 6, 7, 5]);
    });

    it('should handle array sort operation', () => {
      const state = anchor([3, 1, 4, 1, 5]);
      state.sort();
      expect(state).toEqual([1, 1, 3, 4, 5]);
    });

    it('should handle array reverse operation', () => {
      const state = anchor([1, 2, 3, 4, 5]);
      state.reverse();
      expect(state).toEqual([5, 4, 3, 2, 1]);
    });

    it('should handle array fill operation', () => {
      const state = anchor([1, 2, 3, 4, 5]);
      state.fill(0, 1, 3);
      expect(state).toEqual([1, 0, 0, 4, 5]);
    });

    it('should handle array copyWithin operation', () => {
      const state = anchor([1, 2, 3, 4, 5]);
      state.copyWithin(0, 3, 4);
      expect(state).toEqual([4, 2, 3, 4, 5]);
    });
  });

  describe('Ordered Array Methods', () => {
    it('should maintain order when pushing items to an ordered array', () => {
      const state = anchor.ordered([1, 3, 5], (a, b) => a - b);

      // Push a smaller item
      state.push(0);
      expect(state).toEqual([0, 1, 3, 5]);

      // Push a middle item
      state.push(4);
      expect(state).toEqual([0, 1, 3, 4, 5]);

      // Push a larger item
      state.push(6);
      expect(state).toEqual([0, 1, 3, 4, 5, 6]);

      // Push duplicate item
      state.push(3);
      expect(state).toEqual([0, 1, 3, 3, 4, 5, 6]);
    });

    it('should maintain order with string values', () => {
      const state = anchor.ordered(['apple', 'cherry', 'fig'], (a, b) => a.localeCompare(b));

      state.push('banana');
      expect(state).toEqual(['apple', 'banana', 'cherry', 'fig']);

      state.push('grape');
      expect(state).toEqual(['apple', 'banana', 'cherry', 'fig', 'grape']);

      state.push('avocado');
      expect(state).toEqual(['apple', 'avocado', 'banana', 'cherry', 'fig', 'grape']);
    });

    it('should maintain order with objects', () => {
      const state = anchor.ordered(
        [
          { id: 1, name: 'Alice' },
          { id: 3, name: 'Charlie' },
        ],
        (a, b) => a.id - b.id
      );

      state.push({ id: 2, name: 'Bob' });
      expect(state).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ]);

      state.push({ id: 0, name: 'Zero' });
      expect(state).toEqual([
        { id: 0, name: 'Zero' },
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ]);
    });

    it('should handle edge cases with ordered arrays', () => {
      // Empty array
      const emptyState = anchor.ordered([], (a: number, b: number) => a - b);
      emptyState.push(1);
      expect(emptyState).toEqual([1]);

      // Single item array
      const singleState = anchor.ordered([2], (a, b) => a - b);
      singleState.push(1);
      expect(singleState).toEqual([1, 2]);

      singleState.push(3);
      expect(singleState).toEqual([1, 2, 3]);
    });

    it('should work with complex comparison functions', () => {
      // Sort by string length, then alphabetically
      const state = anchor.ordered(['abc', 'de', 'f'], (a, b) => {
        if (a.length !== b.length) {
          return a.length - b.length;
        }
        return a.localeCompare(b);
      });

      state.push('abcd');
      expect(state).toEqual(['f', 'de', 'abc', 'abcd']);

      state.push('xy');
      expect(state).toEqual(['f', 'de', 'xy', 'abc', 'abcd']);
    });

    it('should use sort instead of binary insert for large batches', () => {
      // This tests the heuristic that switches to using sort for large batches
      const state = anchor.ordered([10, 30, 50], (a, b) => a - b);

      // Add 6 items (more than the HEURISTIC_THRESHOLD of 5)
      state.push(5, 15, 25, 35, 45, 55);

      // Should still be ordered correctly
      expect(state).toEqual([5, 10, 15, 25, 30, 35, 45, 50, 55]);
    });

    it('should return correct length when pushing to ordered array', () => {
      const state = anchor.ordered([1, 3], (a, b) => a - b);
      const length1 = state.push(2);
      expect(length1).toBe(3);

      const length2 = state.push(0, 4);
      expect(length2).toBe(5);

      expect(state).toEqual([0, 1, 2, 3, 4]);
    });
  });
});
