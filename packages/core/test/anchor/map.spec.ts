import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, derive } from '../../src/index.js';

describe('Anchor Core - Map Operations', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Map Operations', () => {
    it('should handle Map set operations', () => {
      const map = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      const state = anchor({ map });

      // Test setting new key-value pair
      state.map.set('b', 2);
      expect(state.map.get('b')).toBe(2);

      // Test updating existing key
      state.map.set('a', 10);
      expect(state.map.get('a')).toBe(10);
      expect(state.map.size).toBe(2);
    });

    it('should handle Map delete operations', () => {
      const map = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      const state = anchor({ map });

      const result = state.map.delete('a');
      expect(result).toBe(true);
      expect(state.map.has('a')).toBe(false);
      expect(state.map.size).toBe(1);
    });

    it('should handle Map clear operations', () => {
      const map = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      const state = anchor({ map });

      state.map.clear();
      expect(state.map.size).toBe(0);
      expect(state.map.has('a')).toBe(false);
      expect(state.map.has('b')).toBe(false);
    });

    it('should handle Map forEach operations with reactive updates', () => {
      const map = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      const state = anchor({ map });
      const handler = vi.fn();
      const unsubscribe = derive(state, handler);

      const values: number[] = [];
      state.map.forEach((value) => values.push(value));
      expect(values).toEqual([1, 2]);

      // Update a value and check that forEach still works
      state.map.set('a', 10);
      expect(handler).toHaveBeenCalledTimes(2); // init + set

      unsubscribe();
    });
  });

  describe('Direct Map and Set Anchoring', () => {
    it('should anchor Map directly', () => {
      const map = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      const state = anchor(map);

      expect(state).toBeInstanceOf(Map);
      expect(state.get('a')).toBe(1);

      state.set('c', 3);
      expect(state.get('c')).toBe(3);
      expect(state.size).toBe(3);
    });
  });
});
