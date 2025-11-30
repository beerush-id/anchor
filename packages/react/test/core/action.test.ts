import { anchor } from '@anchorlib/core';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAction, useActions } from '../../src/action';
import { CLEANUP_DEBOUNCE_TIME } from '../../src/constant';
import type { ActionRef } from '../../src/types';

describe('Anchor React - Action', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic', () => {
    it('should create an action ref without initial value', () => {
      const action = vi.fn(() => undefined);
      const { result } = renderHook(() => useAction(action));

      expect(result.current.current).toBe(null);
      expect(action).not.toHaveBeenCalled(); // Action is not called during initialization

      // Action is called when we set the value
      act(() => {
        result.current.current = 'test';
      });

      expect(result.current.current).toBe('test');
      expect(action).toHaveBeenCalledWith('test');
    });

    it('should create an action ref with initial value', () => {
      const action = vi.fn(() => undefined);
      const { result } = renderHook(() => useAction('initial', action));

      expect(result.current.current).toBe('initial');
      expect(action).not.toHaveBeenCalled(); // Action is NOT called during initialization even with initial value

      // Action is called when we set the value
      act(() => {
        result.current.current = 'updated';
      });

      expect(result.current.current).toBe('updated');
      expect(action).toHaveBeenCalledWith('updated');
    });

    it('should update action ref value and call action', () => {
      const action = vi.fn(() => undefined);
      const { result } = renderHook(() => useAction('initial', action));

      expect(action).not.toHaveBeenCalled(); // Action not called during initialization

      act(() => {
        result.current.current = 'updated';
      });

      expect(result.current.current).toBe('updated');
      expect(action).toHaveBeenCalledWith('updated');
    });

    it('should not call action when setting the same value', () => {
      const action = vi.fn(() => undefined);
      const { result } = renderHook(() => useAction('initial', action));

      expect(action).not.toHaveBeenCalled();

      act(() => {
        result.current.current = 'initial'; // Same value
      });

      expect(action).not.toHaveBeenCalled(); // Still not called

      act(() => {
        result.current.current = 'updated'; // Different value
      });

      expect(action).toHaveBeenCalledWith('updated');
    });
  });

  describe('Cleanup', () => {
    it('should call cleanup function when value changes', () => {
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();
      const action = vi
        .fn()
        .mockImplementationOnce(() => cleanup1)
        .mockImplementationOnce(() => cleanup2);

      const { result } = renderHook(() => useAction('initial', action));

      // Set first value - no previous cleanup
      act(() => {
        result.current.current = 'updated' as never;
      });

      expect(cleanup1).not.toHaveBeenCalled();
      expect(action).toHaveBeenNthCalledWith(1, 'updated');

      // Set second value - first cleanup should be called
      act(() => {
        result.current.current = 'final' as never;
      });

      expect(cleanup1).toHaveBeenCalled();
      expect(action).toHaveBeenNthCalledWith(2, 'final');
    });

    it('should call cleanup function when state changes', () => {
      const cleanup1 = vi.fn();

      const state = anchor({ count: 1 });
      let count = 0;
      const action = vi
        .fn()
        .mockImplementationOnce(() => {
          count = state.count;
          return cleanup1;
        })
        .mockImplementationOnce(() => {
          count = state.count;
          return cleanup1;
        });
      const { result } = renderHook(() => useAction(action));

      // Count should be 0 before setting a value.
      expect(count).toBe(0);

      // Set first value - no previous cleanup
      act(() => {
        result.current.current = 'updated' as never;
      });

      expect(count).toBe(1);
      expect(cleanup1).not.toHaveBeenCalled();
      expect(action).toHaveBeenNthCalledWith(1, 'updated');

      state.count++;

      expect(count).toBe(2);
      expect(cleanup1).toHaveBeenCalledTimes(1);
      expect(action).toHaveBeenNthCalledWith(2, 'updated');
    });

    it('should call cleanup function on unmount', () => {
      const cleanup = vi.fn();
      const action = vi.fn(() => cleanup);
      const { result, unmount } = renderHook(() => useAction('initial', action));

      // Set a value to trigger the action and set the destroy function
      act(() => {
        result.current.current = 'test';
      });

      expect(cleanup).not.toHaveBeenCalled();

      unmount();
      vi.advanceTimersByTime(CLEANUP_DEBOUNCE_TIME);

      expect(cleanup).toHaveBeenCalled();
    });

    it('should not call cleanup on unmount if no value was set', () => {
      const cleanup = vi.fn();
      const action = vi.fn(() => cleanup);
      const { unmount } = renderHook(() => useAction(action));

      // Unmount without setting any value
      unmount();
      vi.advanceTimersByTime(CLEANUP_DEBOUNCE_TIME);

      // Cleanup should not be called because no destroy function was set
      expect(cleanup).not.toHaveBeenCalled();
    });

    it('should handle undefined cleanup functions', () => {
      const action1 = vi.fn(() => undefined);
      const { result } = renderHook(() => useAction('initial', action1));

      act(() => {
        result.current.current = 'updated';
      });

      expect(action1).toHaveBeenCalledWith('updated');
    });

    it('should handle destroy call without defined callback', () => {
      const action1 = vi.fn(() => undefined);
      const { result } = renderHook(() => useAction(action1));

      act(() => {
        result.current.current = 'updated';
      });

      expect(action1).toHaveBeenCalledWith('updated');

      act(() => {
        result.current.destroy();
      });
      expect(result.current.current).toBe(null);
    });

    it('should handle destroy call with a defined callback', () => {
      const cleanup = vi.fn();
      const action = vi.fn(() => cleanup);
      const { result } = renderHook(() => useAction(action));

      act(() => {
        result.current.current = 'updated';
      });

      expect(action).toHaveBeenCalledWith('updated');

      act(() => {
        result.current.destroy();
      });
      expect(result.current.current).toBe(null);
      expect(cleanup).toHaveBeenCalled();
    });
  });

  describe('Action Function', () => {
    it('should handle action function as first parameter', () => {
      const action = vi.fn(() => undefined);
      const { result } = renderHook(() => useAction(action));

      expect(result.current.current).toBe(null);
      expect(action).not.toHaveBeenCalled();

      act(() => {
        result.current.current = 'test';
      });

      expect(result.current.current).toBe('test');
      expect(action).toHaveBeenCalledWith('test');
    });

    it('should call previous cleanup when action returns new cleanup', () => {
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();
      const action = vi
        .fn()
        .mockImplementationOnce(() => cleanup1)
        .mockImplementationOnce(() => cleanup2);

      const { result } = renderHook(() => useAction('initial', action));

      // First update
      act(() => {
        result.current.current = 'updated' as never;
      });

      expect(cleanup1).not.toHaveBeenCalled(); // No previous cleanup
      expect(action).toHaveBeenNthCalledWith(1, 'updated');

      // Second update - first cleanup should be called
      act(() => {
        result.current.current = 'final' as never;
      });

      expect(cleanup1).toHaveBeenCalled();
      expect(action).toHaveBeenNthCalledWith(2, 'final');
    });
  });

  describe('Actions Combination', () => {
    it('should combine multiple action refs into a single action ref', () => {
      const action1 = vi.fn(() => undefined);
      const action2 = vi.fn(() => undefined);

      const { result: actionResult1 } = renderHook(() => useAction(action1));
      const { result: actionResult2 } = renderHook(() => useAction(action2));

      const { result } = renderHook(() => useActions(actionResult1.current, actionResult2.current));

      expect(result.current.current).toBe(null);

      act(() => {
        result.current.current = 'test-value';
      });

      expect(result.current.current).toBe('test-value');
      expect(actionResult1.current.current).toBe('test-value');
      expect(actionResult2.current.current).toBe('test-value');
      expect(action1).toHaveBeenCalledWith('test-value');
      expect(action2).toHaveBeenCalledWith('test-value');
    });

    it('should update all actions when setting value on combined action', () => {
      const action1 = vi.fn(() => undefined);
      const action2 = vi.fn(() => undefined);
      const action3 = vi.fn(() => undefined);

      const { result: actionResult1 } = renderHook(() => useAction('initial1', action1));
      const { result: actionResult2 } = renderHook(() => useAction('initial2', action2));
      const { result: actionResult3 } = renderHook(() => useAction('initial3', action3));

      const { result } = renderHook(() =>
        useActions(actionResult1.current, actionResult2.current, actionResult3.current)
      );

      // Combined action starts with null regardless of individual action values
      expect(result.current.current).toBe(null);

      act(() => {
        result.current.current = 'synced-value';
      });

      // All actions should now have the same value
      expect(result.current.current).toBe('synced-value');
      expect(actionResult1.current.current).toBe('synced-value');
      expect(actionResult2.current.current).toBe('synced-value');
      expect(actionResult3.current.current).toBe('synced-value');
    });

    it('should call destroy on all actions when combined action is destroyed', () => {
      const destroy1 = vi.fn();
      const destroy2 = vi.fn();
      const destroy3 = vi.fn();

      const actionRef1 = { current: null, destroy: destroy1 };
      const actionRef2 = { current: null, destroy: destroy2 };
      const actionRef3 = { current: null, destroy: destroy3 };

      const { result } = renderHook(() => useActions(actionRef1, actionRef2, actionRef3));

      // Initially, no destroy functions should be called
      expect(destroy1).not.toHaveBeenCalled();
      expect(destroy2).not.toHaveBeenCalled();
      expect(destroy3).not.toHaveBeenCalled();

      // Call destroy on the combined action
      act(() => {
        result.current.destroy();
      });

      // All destroy functions should be called
      expect(destroy1).toHaveBeenCalled();
      expect(destroy2).toHaveBeenCalled();
      expect(destroy3).toHaveBeenCalled();
      expect(result.current.current).toBe(null);
    });

    it('should handle actions without destroy methods', () => {
      const action1 = vi.fn(() => undefined);

      const { result: actionResult1 } = renderHook(() => useAction(action1));
      const actionRef2 = { current: null }; // No destroy method

      const { result } = renderHook(() => useActions(actionResult1.current, actionRef2 as ActionRef<null>));

      expect(result.current.current).toBe(null);

      act(() => {
        result.current.current = 'test';
      });

      expect(result.current.current).toBe('test');
      expect(actionResult1.current.current).toBe('test');
      expect(actionRef2.current).toBe('test');

      // Should not throw when destroying
      expect(() => {
        act(() => {
          result.current.destroy();
        });
      }).not.toThrow();
    });
  });
});
