import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAnchor, useInherit, useRaw } from '../../src/anchor.js';

describe('Anchor React - Anchor System', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy?.mockRestore();
  });

  describe('useAnchor', () => {
    describe('Basic Usage', () => {
      it('should create an anchor state with initial value', () => {
        const initialValue = { count: 42, name: 'test' };
        const { result } = renderHook(() => useAnchor(initialValue));

        const [value, ref, setter] = result.current;

        expect(value).toEqual(initialValue);
        expect(ref.value).toEqual(initialValue);
        expect(typeof setter).toBe('function');
      });

      it('should update state value using setter function', () => {
        const initialValue = { count: 0 };
        const { result } = renderHook(() => useAnchor(initialValue));

        const [, ref, setter] = result.current;

        setter({ count: 10 });
        expect(ref.value).toEqual({ count: 10 });
      });

      it('should maintain referential stability of ref and setter', () => {
        const { result, rerender } = renderHook(() => useAnchor({ count: 0 }));

        const [, firstRef, firstSetter] = result.current;

        rerender();

        const [, secondRef, secondSetter] = result.current;

        expect(firstRef).toBe(secondRef);
        expect(firstSetter).toBe(secondSetter);
      });
    });

    describe('With Options', () => {
      it('should create immutable state when immutable option is true', () => {
        const initialValue = { count: 0 };
        const { result } = renderHook(() => useAnchor(initialValue, { immutable: true }));

        const [value, ref, setter] = result.current;

        expect(value).toEqual(initialValue);
        expect(ref.value).toEqual(initialValue);
        expect(typeof setter).toBe('function');
      });

      it('should work with cloned option', () => {
        const initialValue = { items: [1, 2, 3] };
        const { result } = renderHook(() => useAnchor(initialValue, { cloned: true }));

        const [value, ref, setter] = result.current;

        expect(value).toEqual(initialValue);
        expect(ref.value).toEqual(initialValue);
        expect(typeof setter).toBe('function');
      });
    });
  });

  describe('useRaw', () => {
    describe('Basic Usage', () => {
      it('should create a raw anchor state with initial value', () => {
        const initialValue = { count: 42 };
        const { result } = renderHook(() => useRaw(initialValue));

        const [value, ref, setter] = result.current;

        expect(value).toEqual(initialValue);
        expect(ref.value).toEqual(initialValue);
        expect(typeof setter).toBe('function');
      });

      it('should update raw state value using setter function', () => {
        const initialValue = { count: 0 };
        const { result } = renderHook(() => useRaw(initialValue));

        const [, ref, setter] = result.current;

        act(() => {
          setter({ count: 5 });
        });

        expect(ref.value).toEqual({ count: 5 });
      });
    });

    describe('With Options', () => {
      it('should create raw state with options', () => {
        const initialValue = { count: 0 };
        const { result } = renderHook(() => useRaw(initialValue, { cloned: true }));

        const [value, ref, setter] = result.current;

        expect(value).toEqual(initialValue);
        expect(ref.value).toEqual(initialValue);
        expect(typeof setter).toBe('function');
      });
    });
  });

  describe('useInherit', () => {
    describe('Basic Usage', () => {
      it('should inherit specific properties from a reactive state', () => {
        // Create a source state first
        const { result: sourceResult } = renderHook(() =>
          useAnchor({
            name: 'John',
            age: 30,
            email: 'john@example.com',
          })
        );

        const [sourceState] = sourceResult.current;

        // Test useInherit
        const { result } = renderHook(() => useInherit(sourceState, ['name', 'age']));

        expect(result.current).toEqual({
          name: 'John',
          age: 30,
        });
        expect(result.current.name).toBe('John');
        expect(result.current.age).toBe(30);
        expect((result.current as any).email).toBeUndefined();
      });

      it('should update inherited properties when source state changes', async () => {
        // Create a source state first
        const { result: sourceResult } = renderHook(() =>
          useAnchor({
            name: 'John',
            age: 30,
            email: 'john@example.com',
          })
        );

        const [sourceState] = sourceResult.current;

        // Test useInherit
        const { result: inheritResult } = renderHook(() => useInherit(sourceState, ['name', 'age']));

        // Initial values
        expect(inheritResult.current).toEqual({
          name: 'John',
          age: 30,
        });

        // Update the source state
        act(() => {
          sourceState.name = 'Jane';
          sourceState.age = 25;
          sourceState.email = 'jane@example.com';
        });

        // The inherited state should also update
        expect(inheritResult.current).toEqual({
          name: 'Jane',
          age: 25,
        });
      });

      it('should only update when inherited properties change', async () => {
        // Create a source state first
        const { result: sourceResult } = renderHook(() =>
          useAnchor({
            name: 'John',
            age: 30,
            email: 'john@example.com',
          })
        );

        const [sourceState] = sourceResult.current;

        // Test useInherit for only the email property
        const { result: inheritResult } = renderHook(() => useInherit(sourceState, ['email']));

        // Initial values
        expect(inheritResult.current.email).toBe('john@example.com');

        // Update a property that is NOT inherited
        act(() => {
          Object.assign(sourceState, {
            name: 'Jane',
            age: 25,
            email: 'john@example.com', // same email
          });
        });

        // Email should remain the same
        expect(inheritResult.current.email).toBe('john@example.com');

        // Update the inherited property
        act(() => {
          Object.assign(sourceState, {
            name: 'Jane',
            age: 25,
            email: 'jane@example.com', // different email
          });
        });

        // Email should update
        expect(inheritResult.current.email).toBe('jane@example.com');
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty picks array', () => {
        const { result: sourceResult } = renderHook(() =>
          useAnchor({
            name: 'John',
            age: 30,
          })
        );

        const [sourceState] = sourceResult.current;

        const { result } = renderHook(() => useInherit(sourceState, []));

        expect(result.current).toEqual({});
      });

      it('should handle non-existent properties', () => {
        const { result: sourceResult } = renderHook(() =>
          useAnchor({
            name: 'John',
            age: 30,
          })
        );

        const [sourceState] = sourceResult.current;

        // Try to inherit a property that doesn't exist
        const { result } = renderHook(() => useInherit(sourceState, ['name', 'nonexistent' as any]));

        expect(result.current).toEqual({
          name: 'John',
          nonexistent: undefined,
        });
      });

      it('should handle non-existent state', () => {
        // Try to inherit a property that doesn't exist
        const { result } = renderHook(() => useInherit({ name: 'Jane' }, ['name', 'nonexistent' as any]));

        expect(errorSpy).toHaveBeenCalled();
      });
    });
  });
});
