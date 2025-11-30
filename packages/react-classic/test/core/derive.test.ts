import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useBind, useDerived, useDerivedRef, usePipe, useValue, useValueIs } from '../../src/index.js';
import { anchor } from '@anchorlib/core';

describe('Anchor React - Derive', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy?.mockRestore();
  });

  describe('useDerived', () => {
    describe('Basic Usage', () => {
      it('should derive value from reactive state', () => {
        const initialValue = { count: 42, name: 'test' };
        const state = anchor(initialValue);
        const { result } = renderHook(() => useDerived(state));

        expect(result.current).toEqual(initialValue);
      });

      it('should derive value with transform function', () => {
        const initialValue = { count: 42, name: 'test' };
        const state = anchor(initialValue);
        const transform = (current: typeof initialValue) => current.count;
        const { result } = renderHook(() => useDerived(state, transform));

        expect(result.current).toBe(42);
      });

      it('should update derived value when state changes', () => {
        const initialValue = { count: 42, name: 'test' };
        const state = anchor(initialValue);
        const { result } = renderHook(() => useDerived(state));

        expect(result.current).toEqual(initialValue);

        act(() => {
          state.count = 100;
        });

        expect(result.current).toEqual({ count: 100, name: 'test' });
      });

      it('should handle non-reactive state with error', () => {
        const plainObject = { count: 42, name: 'test' };
        renderHook(() => useDerived(plainObject));

        expect(errorSpy).toHaveBeenCalled();
      });

      it('should derive with recursive option', () => {
        const initialValue = {
          user: {
            name: 'John',
            profile: {
              age: 30,
            },
          },
        };
        const state = anchor(initialValue);
        const { result } = renderHook(() => useDerived(state, true));

        expect(result.current).toEqual(initialValue);
      });
    });
  });

  describe('usePipe', () => {
    describe('Basic Usage', () => {
      it('should pipe changes from source to target state', () => {
        const sourceValue = { count: 42 };
        const targetValue = { count: 0 };

        const source = anchor(sourceValue);
        const target = anchor(targetValue);

        renderHook(() => usePipe(source, target));

        // On initialization, source should be piped to target
        expect(target.count).toBe(42);

        // When source changes, target should update
        act(() => {
          source.count = 100;
        });

        expect(target.count).toBe(100);
      });

      it('should pipe changes with transform function', () => {
        const sourceValue = { count: 42 };
        const targetValue = { value: 0 };

        const source = anchor(sourceValue);
        const target = anchor(targetValue);

        const transform = (source: typeof sourceValue) => ({ value: source.count * 2 });
        renderHook(() => usePipe(source, target, transform));

        // On initialization, source should be piped to target with transform
        expect(target.value).toBe(84);

        // When source changes, target should update with transformed value
        act(() => {
          source.count = 100;
        });

        expect(target.value).toBe(200);
      });

      it('should not pipe when source or target is null', () => {
        const sourceValue = { count: 42 };
        const source = anchor(sourceValue);

        // Test with null target
        renderHook(() => usePipe(source, null as never));

        // Test with null source
        renderHook(() => usePipe(null as never, source));

        // Should not throw errors
        expect(errorSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('useBind', () => {
    describe('Basic Usage', () => {
      it('should create bidirectional binding between states', () => {
        const leftValue = { count: 42 };
        const rightValue = { count: 0 };

        const left = anchor(leftValue);
        const right = anchor(rightValue);

        renderHook(() => useBind(left, right));

        // On initialization, the states should be bound
        expect(left.count).toBe(42);
        expect(right.count).toBe(42); // Right should be updated to match left

        // When left changes, right should update
        act(() => {
          left.count = 100;
        });

        expect(right.count).toBe(100);

        // When right changes, left should update
        act(() => {
          right.count = 200;
        });

        expect(left.count).toBe(200);
      });

      it('should create bidirectional binding with transform functions', () => {
        const leftValue = { count: 42 };
        const rightValue = { value: 0 };

        const left = anchor(leftValue);
        const right = anchor(rightValue);

        const transformLeft = (left: typeof leftValue) => ({ value: left.count * 2 });
        const transformRight = (right: typeof rightValue) => ({ count: right.value / 2 });

        renderHook(() => useBind(left, right, transformLeft, transformRight));

        // On initialization, left count 42 should be transformed to right value 84
        expect(left.count).toBe(42);
        expect(right.value).toBe(84);

        // When left changes, right should update with transformed value
        act(() => {
          left.count = 100;
        });

        expect(right.value).toBe(200);

        // When right changes, left should update with transformed value
        act(() => {
          right.value = 400;
        });

        expect(left.count).toBe(200);
      });
    });
  });

  describe('useValue', () => {
    describe('Basic Usage', () => {
      it('should derive specific property value from reactive state', () => {
        const initialValue = { count: 42, name: 'test' };
        const state = anchor(initialValue);
        const { result } = renderHook(() => useValue(state, 'count'));

        expect(result.current).toBe(42);
      });

      it('should update derived property value when state changes', () => {
        const initialValue = { count: 42, name: 'test' };
        const state = anchor(initialValue);
        const { result } = renderHook(() => useValue(state, 'count'));

        expect(result.current).toBe(42);

        act(() => {
          state.count = 100;
        });

        expect(result.current).toBe(100);
      });

      it('should handle non-reactive state with error', () => {
        const plainObject = { count: 42, name: 'test' };
        renderHook(() => useValue(plainObject as any, 'count'));

        expect(errorSpy).toHaveBeenCalled();
      });
    });
  });

  describe('useValueIs', () => {
    describe('Basic Usage', () => {
      it('should check if property value equals expected value', () => {
        const initialValue = { count: 42, name: 'test' };
        const state = anchor(initialValue);
        const { result } = renderHook(() => useValueIs(state, 'count', 42));

        expect(result.current).toBe(true);
      });

      it('should update comparison result when state changes', () => {
        const initialValue = { count: 42, name: 'test' };
        const state = anchor(initialValue);
        const { result, rerender } = renderHook(({ key, expect }) => useValueIs(state, key, expect), {
          initialProps: { key: 'count' as const, expect: 42 },
        });

        expect(result.current).toBe(true);

        act(() => {
          state.count = 100;
        });

        // Rerender to get updated result
        rerender({ key: 'count', expect: 42 });

        expect(result.current).toBe(false);
      });

      it('should handle non-reactive state with error', () => {
        const plainObject = { count: 42, name: 'test' };
        renderHook(() => useValueIs(plainObject as any, 'count', 42));

        expect(errorSpy).toHaveBeenCalled();
      });

      it('should re-render with updated dependencies', () => {
        const initialValue = { count: 42, name: 'test' };
        const state = anchor(initialValue);
        const { result, rerender } = renderHook(({ s, k, e }) => useValueIs(s, k, e), {
          initialProps: {
            s: state,
            k: 'count' as const,
            e: 42,
          },
        });

        // Initially should be true
        expect(result.current).toBe(true);

        // Change expected value
        rerender({ s: state, k: 'count', e: 100 });

        // Should now be false
        expect(result.current).toBe(false);

        // Change state to match new expected value
        act(() => {
          state.count = 100;
        });

        // Should now be true again
        expect(result.current).toBe(true);
      });
    });
  });

  describe('useDerivedRef', () => {
    describe('Basic Usage', () => {
      it('should create a derived ref that calls handler on state changes', () => {
        const initialValue = { count: 42, name: 'test' };
        const state = anchor(initialValue);
        const handler = vi.fn();
        const { result } = renderHook(() => useDerivedRef(state, handler));

        // Handler should be called initially
        expect(handler).toHaveBeenCalledWith(initialValue, null);
        expect(result.current).toBeDefined();
        expect(typeof result.current).toBe('object');
        expect(result.current).toHaveProperty('current');
      });

      it('should call handler when ref value is set', () => {
        const initialValue = { count: 42, name: 'test' };
        const state = anchor(initialValue);
        const handler = vi.fn();
        const { result } = renderHook(() => useDerivedRef(state, handler));

        // Reset calls from initial call
        handler.mockClear();

        // Set ref value
        act(() => {
          result.current.current = 'test-value';
        });

        // Handler should be called with state and new ref value
        expect(handler).toHaveBeenCalledWith(initialValue, 'test-value');
      });

      it('should call handler when state changes', () => {
        const initialValue = { count: 42, name: 'test' };
        const state = anchor(initialValue);
        const handler = vi.fn();
        renderHook(() => useDerivedRef(state, handler));

        // Reset calls from initial call
        handler.mockClear();

        // Change state
        act(() => {
          state.count = 100;
        });

        // Handler should be called with new state
        expect(handler).toHaveBeenCalledWith({ count: 100, name: 'test' }, null);
      });
    });
  });
});
