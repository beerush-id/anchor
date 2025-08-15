import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, logger } from '@anchor/core';

describe('Anchor Core - Array Methods', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(logger as never as typeof console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
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
});
