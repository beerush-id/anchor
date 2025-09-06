import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, derive } from '../../src/index.js';

describe('Anchor Core - Set Operations', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Set Operations', () => {
    it('should handle Set add operations', () => {
      const set = new Set([1, 2]);
      const state = anchor({ set });

      // Add new value
      state.set.add(3);
      expect(state.set.has(3)).toBe(true);
      expect(state.set.size).toBe(3);

      // Try to add existing value (should not change size)
      state.set.add(1);
      expect(state.set.size).toBe(3);
    });

    it('should handle Set add operation with an existing state as value', () => {
      const user = anchor({ name: 'John' });
      const set = anchor(new Set([{ name: 'Jane' }]));

      set.add(user);

      expect(set.size).toBe(2);
      expect(set.has(user)).toBe(true);
      expect(set.has(anchor.get(user))).toBe(true);
    });

    it('should handle Set delete operations', () => {
      const set = new Set([1, 2, 3]);
      const state = anchor({ set });

      const result = state.set.delete(2);
      expect(result).toBe(true);
      expect(state.set.has(2)).toBe(false);
      expect(state.set.size).toBe(2);

      // Try to delete non-existing value
      const result2 = state.set.delete(10);
      expect(result2).toBe(false);
    });

    it('should handle Set delete operation with an existing state as value', () => {
      const user = anchor({ name: 'John' });
      const set = anchor(new Set([{ name: 'Jane' }]));

      set.add(user);

      expect(set.size).toBe(2);
      expect(set.has(user)).toBe(true);
      expect(set.has(anchor.get(user))).toBe(true);

      set.delete(user);
      expect(set.size).toBe(1);
      expect(set.has(user)).toBe(false);
      expect(set.has(anchor.get(user))).toBe(false);
    });

    it('should handle Set clear operations', () => {
      const set = new Set([1, 2, 3]);
      const state = anchor({ set });

      state.set.clear();
      expect(state.set.size).toBe(0);
      expect(state.set.has(1)).toBe(false);
      expect(state.set.has(2)).toBe(false);
      expect(state.set.has(3)).toBe(false);
    });

    it('should handle Set forEach operations with reactive updates', () => {
      const set = new Set([1, 2]);
      const state = anchor({ set });
      const handler = vi.fn();
      const unsubscribe = derive(state, handler);

      const values: number[] = [];
      state.set.forEach((value) => values.push(value));
      expect(values).toEqual([1, 2]);

      // Add a value and check that forEach works with new values
      state.set.add(3);
      expect(handler).toHaveBeenCalledTimes(2); // init + add

      const newValues: number[] = [];
      state.set.forEach((value) => newValues.push(value));
      expect(newValues).toEqual([1, 2, 3]);

      unsubscribe();
    });

    it('should handle Set has operations', () => {
      const set = new Set([1, 2]);
      const state = anchor({ set });

      expect(state.set.has(1)).toBe(true);
      expect(state.set.has(3)).toBe(false);

      state.set.add(3);
      expect(state.set.has(3)).toBe(true);
    });
  });

  describe('Direct Map and Set Anchoring', () => {
    it('should anchor Set directly', () => {
      const set = new Set([1, 2]);
      const state = anchor(set);

      expect(state).toBeInstanceOf(Set);
      expect(state.has(1)).toBe(true);

      state.add(3);
      expect(state.has(3)).toBe(true);
      expect(state.size).toBe(3);
    });
  });
});
