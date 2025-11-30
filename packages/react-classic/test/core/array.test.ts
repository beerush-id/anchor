import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useFlatList, useOrderedList } from '../../src/array';

describe('Anchor React - Array', () => {
  describe('useOrderedList', () => {
    it('should create an ordered list with initial value', () => {
      const initialArray = [3, 1, 2];
      const compareFn = (a: number, b: number) => a - b;

      const { result } = renderHook(() => useOrderedList(initialArray, compareFn));

      const [value, ref, setter] = result.current;

      expect(value).toEqual([1, 2, 3]); // Should be sorted
      expect(ref.value).toEqual([1, 2, 3]);
      expect(typeof setter).toBe('function');
    });

    it('should maintain order when elements are added', () => {
      const initialArray = [3, 1, 2];
      const compareFn = (a: number, b: number) => a - b;

      const { result } = renderHook(() => useOrderedList(initialArray, compareFn));

      act(() => {
        result.current[1].value.push(0);
      });

      expect(result.current[0]).toEqual([0, 1, 2, 3]);
    });

    it('should use provided options', () => {
      const initialArray = [3, 1, 2];
      const compareFn = (a: number, b: number) => a - b;

      const { result } = renderHook(() => useOrderedList(initialArray, compareFn, { immutable: true }));

      const [value, ref] = result.current;

      expect(value).toEqual([1, 2, 3]);
      expect(ref.value).toEqual([1, 2, 3]);
    });
  });

  describe('useFlatList', () => {
    it('should create a flat list with initial value', () => {
      const initialArray = [1, 2, 3];

      const { result } = renderHook(() => useFlatList(initialArray));

      const [value, ref, setter] = result.current;

      expect(value).toEqual([1, 2, 3]);
      expect(ref.value).toEqual([1, 2, 3]);
      expect(typeof setter).toBe('function');
    });

    it('should update when elements are added', () => {
      const initialArray = [1, 2, 3];

      const { result } = renderHook(() => useFlatList(initialArray));

      act(() => {
        result.current[1].value.push(4);
      });

      expect(result.current[0]).toEqual([1, 2, 3, 4]);
    });

    it('should update when elements are modified', () => {
      const initialArray = [1, 2, 3];

      const { result } = renderHook(() => useFlatList(initialArray));

      act(() => {
        result.current[1].value[1] = 5;
      });

      expect(result.current[0]).toEqual([1, 5, 3]);
    });

    it('should use provided options', () => {
      const initialArray = [1, 2, 3];

      const { result } = renderHook(() => useFlatList(initialArray, { immutable: true }));

      const [value, ref] = result.current;

      expect(value).toEqual([1, 2, 3]);
      expect(ref.value).toEqual([1, 2, 3]);
    });
  });
});
