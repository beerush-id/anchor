import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { getNextDeps, getRefState, isRef, useConstant, useVariable } from '../../src/ref';
import { captureStack } from '@anchorlib/core';

// Mock captureStack to test error cases
vi.mock('@anchorlib/core', async () => {
  const actual = await vi.importActual('@anchorlib/core');
  return {
    ...actual,
    captureStack: {
      violation: {
        general: vi.fn(),
      },
    },
  };
});

describe('Anchor React - Ref System', () => {
  describe('useVariable', () => {
    describe('Basic', () => {
      it('should create a variable ref with initial value', () => {
        const { result } = renderHook(() => useVariable(42));
        const [ref] = result.current;

        expect(ref.value).toBe(42);
      });

      it('should update variable ref value', () => {
        const { result } = renderHook(() => useVariable(42));
        const [ref, update] = result.current;

        act(() => {
          update(100);
        });

        expect(ref.value).toBe(100);
      });

      it('should not update if value is the same', () => {
        const { result } = renderHook(() => useVariable(42));
        const [ref, update] = result.current;

        const oldValue = ref.value;

        act(() => {
          update(42); // Same value
        });

        expect(ref.value).toBe(oldValue);
      });

      it('should re-render with new init', () => {
        const { result, rerender } = renderHook(({ init, constant }) => useVariable(init, constant as true), {
          initialProps: { init: 42, constant: false },
        });
        const [ref] = result.current;
        expect(ref.value).toBe(42);

        rerender({ init: 100, constant: true });
        expect(ref.value).toBe(100);
      });
    });

    describe('Function Initializer', () => {
      it('should create a variable ref with function initializer', () => {
        const initializer = vi.fn(() => 'test-value');
        const { result } = renderHook(() => useVariable(initializer));
        const [ref] = result.current;

        expect(initializer).toHaveBeenCalled();
        expect(ref.value).toBe('test-value');
      });

      it('should update when dependencies change', () => {
        const compute = vi.fn((current) => (current ? current + 1 : 1));
        const { result, rerender } = renderHook(({ deps }) => useVariable(compute, deps), {
          initialProps: { deps: [1] },
        });

        const [ref1] = result.current;
        expect(ref1.value).toBe(1);
        expect(compute).toHaveBeenCalledTimes(1);

        rerender({ deps: undefined });
        const [ref2] = result.current;
        expect(ref2.value).toBe(2);
        expect(compute).toHaveBeenCalledTimes(2);
      });

      it('should not update when dependencies are the same', () => {
        const compute = vi.fn((current) => (current ? current + 1 : 1));
        const { result, rerender } = renderHook(({ deps }) => useVariable(compute, deps), {
          initialProps: { deps: [1, 'a'] },
        });

        const [ref1] = result.current;
        expect(ref1.value).toBe(1);
        expect(compute).toHaveBeenCalledTimes(1);

        rerender({ deps: [1, 'a'] }); // Same deps
        const [ref2] = result.current;
        expect(ref2.value).toBe(1);
        expect(compute).toHaveBeenCalledTimes(1); // Not called again
      });
    });

    describe('Constant Mode', () => {
      it('should create a constant ref with initial value', () => {
        const { result } = renderHook(() => useVariable(42, true));
        const [ref] = result.current;

        expect(ref.value).toBe(42);
        // Should only return the ref, not an update function
        expect(result.current).toHaveLength(1);
      });

      it('should create a constant ref with function initializer', () => {
        const initializer = vi.fn(() => 'constant-value');
        const { result } = renderHook(() => useVariable(initializer, [], true));
        const [ref] = result.current;

        expect(initializer).toHaveBeenCalled();
        expect(ref.value).toBe('constant-value');
        // Should only return the ref, not an update function
        expect(result.current).toHaveLength(1);
      });

      it('should call captureStack when trying to update constant ref through setter', () => {
        const { result } = renderHook(() => useVariable(42, true));
        const [ref] = result.current;

        // Reset the mock to clear previous calls
        vi.mocked(captureStack.violation.general).mockClear();

        // Try to set value on constant ref - this should trigger a violation
        (ref as any).value = 100;

        // Expect captureStack.violation.general to have been called
        expect(captureStack.violation.general).toHaveBeenCalled();
      });
    });
  });

  describe('useConstant', () => {
    describe('Basic', () => {
      it('should create a constant ref with initial value', () => {
        const { result } = renderHook(() => useConstant(42));
        const [ref] = result.current;

        expect(ref.value).toBe(42);
        // Should only return the ref, not an update function
        expect(result.current).toHaveLength(1);
      });

      it('should create a constant ref with function initializer', () => {
        const initializer = vi.fn(() => 'computed-constant');
        const { result } = renderHook(() => useConstant(initializer, [1, 2]));
        const [ref] = result.current;

        expect(initializer).toHaveBeenCalled();
        expect(ref.value).toBe('computed-constant');
        // Should only return the ref, not an update function
        expect(result.current).toHaveLength(1);
      });

      it('should update when dependencies change', () => {
        const compute = vi.fn(() => 'computed-value');
        const { result, rerender } = renderHook(({ deps }) => useConstant(compute, deps), {
          initialProps: { deps: [1] },
        });

        const [ref1] = result.current;
        expect(ref1.value).toBe('computed-value');
        expect(compute).toHaveBeenCalledTimes(1);

        rerender({ deps: [2] });
        const [ref2] = result.current;
        expect(ref2.value).toBe('computed-value');
        expect(compute).toHaveBeenCalledTimes(2);
      });

      it('should call captureStack when trying to update constant ref through setter', () => {
        const { result } = renderHook(() => useConstant(42));
        const [ref] = result.current;

        // Reset the mock to clear previous calls
        vi.mocked(captureStack.violation.general).mockClear();

        // Try to set value on constant ref - this should trigger a violation
        (ref as any).value = 100;

        // Expect captureStack.violation.general to have been called
        expect(captureStack.violation.general).toHaveBeenCalled();
      });
    });
  });

  describe('Helper Functions', () => {
    describe('getNextDeps', () => {
      it('should return next deps when lengths are different', () => {
        const prev = [1, 2];
        const next = [1, 2, 3];

        expect(getNextDeps(prev, next)).toBe(next);
      });

      it('should return next deps when values are different', () => {
        const prev = [1, 2, 3];
        const next = [1, 2, 4];

        expect(getNextDeps(prev, next)).toBe(next);
      });

      it('should return undefined when deps are the same', () => {
        const prev = [1, 2, 3];
        const next = [1, 2, 3];

        expect(getNextDeps(prev, next)).toBeUndefined();
      });
    });

    describe('isRef', () => {
      it('should return true for variable refs', () => {
        const { result } = renderHook(() => useVariable(42));
        const [ref] = result.current;

        expect(isRef(ref)).toBe(true);
      });

      it('should return true for constant refs', () => {
        const { result } = renderHook(() => useConstant(42));
        const [ref] = result.current;

        expect(isRef(ref)).toBe(true);
      });

      it('should return false for non-ref values', () => {
        expect(isRef(42)).toBe(false);
        expect(isRef('string')).toBe(false);
        expect(isRef({})).toBe(false);
        expect(isRef([])).toBe(false);
      });
    });

    describe('getRefState', () => {
      it('should return internal state for refs', () => {
        const { result } = renderHook(() => useVariable(42));
        const [ref] = result.current;

        const state = getRefState(ref);
        expect(state).toBeDefined();
        expect(state.value).toBe(42);
      });

      it('should return the value itself for non-refs', () => {
        const value = 42;
        const result = getRefState(value);
        expect(result).toBe(value);
      });
    });
  });
});
