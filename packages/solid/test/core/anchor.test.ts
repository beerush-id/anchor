import { describe, expect, it } from 'vitest';
import { renderHook } from '@solidjs/testing-library';
import { anchorRef, flatRef, orderedRef, reactive } from '../../src/anchor.js';

describe('Anchor Solid - Anchor System', () => {
  describe('anchorRef', () => {
    describe('Basic Usage', () => {
      it('should create a reactive reference with initial value', () => {
        const initialValue = { count: 42, name: 'test' };
        const { result } = renderHook(() => anchorRef(initialValue));

        expect(result).toEqual(initialValue);
      });
    });
  });

  describe('reactive', () => {
    it('should be an alias for anchorRef', () => {
      expect(reactive).toBe(anchorRef);
    });
  });

  describe('flatRef', () => {
    it('should create a flattened reactive reference', () => {
      const initialArray = [1, 2, 3];
      const { result } = renderHook(() => flatRef(initialArray));

      expect(result).toEqual(initialArray);
    });
  });

  describe('orderedRef', () => {
    it('should create a sorted reactive reference', () => {
      const initialArray = [3, 1, 2];
      const compareFn = (a: number, b: number) => a - b;
      const { result } = renderHook(() => orderedRef(initialArray, compareFn));

      expect(result).toEqual([1, 2, 3]);
    });
  });
});
