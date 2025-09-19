import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAction } from '../../src/action';
import { CLEANUP_DEBOUNCE_TIME } from '../../src/constant';

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
      const action2 = vi.fn(() => undefined);
      const { result } = renderHook(() => useAction('initial', action1));

      act(() => {
        result.current.current = 'updated';
      });

      expect(action1).toHaveBeenCalledWith('updated');
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
});
