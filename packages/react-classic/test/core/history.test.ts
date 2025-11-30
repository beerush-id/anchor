import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useHistory } from '../../src/history';
import { anchor } from '@anchorlib/core';
import { CLEANUP_DEBOUNCE_TIME } from '../../src/constant';

describe('Anchor React - History', () => {
  let errorSpy;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
  });

  afterEach(() => {
    errorSpy?.mockRestore();
    vi.useRealTimers();
  });

  describe('useHistory', () => {
    describe('Basic Usage', () => {
      it('should create a history state for a given reactive state', () => {
        const state = anchor({ count: 42 });
        const { result } = renderHook(() => useHistory(state));

        expect(result.current).toBeDefined();
        expect(typeof result.current.backward).toBe('function');
        expect(typeof result.current.forward).toBe('function');
        expect(typeof result.current.destroy).toBe('function');
        expect(typeof result.current.clear).toBe('function');
        expect(typeof result.current.reset).toBe('function');
        expect(Array.isArray(result.current.backwardList)).toBe(true);
        expect(Array.isArray(result.current.forwardList)).toBe(true);
        expect(result.current.canBackward).toBe(false);
        expect(result.current.canForward).toBe(false);
        expect(result.current.canReset).toBe(false);
      });

      it('should maintain history for state changes', async () => {
        const state = anchor({ count: 42 });
        const { result } = renderHook(() => useHistory(state));

        // Initially should not be able to go backward
        expect(result.current.canBackward).toBe(false);

        // Make a change to the state
        act(() => {
          state.count = 100;
        });

        // Advance timers to process the history change
        await vi.advanceTimersByTimeAsync(100);

        // Should now be able to go backward
        expect(result.current.canBackward).toBe(true);
        expect(result.current.backwardList.length).toBe(1);

        // Go backward to previous state
        act(() => {
          result.current.backward();
        });

        // State should be back to original value
        expect(state.count).toBe(42);
        expect(result.current.canBackward).toBe(false);
        expect(result.current.canForward).toBe(true);
        expect(result.current.forwardList.length).toBe(1);
      });

      it('should handle history options', async () => {
        const state = anchor({ count: 42 });
        const options = { maxHistory: 5, debounce: 50 };
        const { result } = renderHook(() => useHistory(state, options));

        expect(result.current).toBeDefined();

        // Make a change to the state
        act(() => {
          state.count = 100;
        });

        // Advance timers to process the history change
        await vi.advanceTimersByTimeAsync(50);

        // Should now be able to go backward
        expect(result.current.canBackward).toBe(true);
      });
    });

    describe('Multiple States', () => {
      it('should manage history separately for different states', async () => {
        const state1 = anchor({ count: 42 });
        const state2 = anchor({ name: 'test' });
        const { result: result1 } = renderHook(() => useHistory(state1));
        const { result: result2 } = renderHook(() => useHistory(state2));

        // Change first state
        act(() => {
          state1.count = 100;
        });

        // Change second state
        act(() => {
          state2.name = 'updated';
        });

        // Advance timers to process the history changes
        await vi.advanceTimersByTimeAsync(100);

        // First history should only track first state
        expect(result1.current.canBackward).toBe(true);
        act(() => {
          result1.current.backward();
        });
        expect(state1.count).toBe(42);
        expect(state2.name).toBe('updated'); // Second state unchanged

        // Second history should only track second state
        expect(result2.current.canBackward).toBe(true);
        act(() => {
          result2.current.backward();
        });
        expect(state2.name).toBe('test');
        expect(state1.count).toBe(42); // First state unchanged
      });
    });

    describe('Options Changes', () => {
      it('should recreate history when options change', () => {
        const state = anchor({ count: 42 });
        const { result, rerender } = renderHook(({ s, opts }) => useHistory(s, opts), {
          initialProps: {
            s: state,
            opts: undefined,
          },
        });

        const initialHistory = result.current;

        // Rerender with new options
        rerender({ s: state, opts: { maxHistory: 5 } });

        // History should be recreated
        expect(result.current).toBeDefined();
        expect(result.current).not.toBe(initialHistory);
      });
    });

    describe('Forward and Backward Navigation', () => {
      it('should correctly navigate forward and backward through history', async () => {
        const state = anchor({ count: 42 });
        const { result } = renderHook(() => useHistory(state));

        // Make multiple changes
        act(() => {
          state.count = 100;
        });

        // Advance timers to process the history changes
        await vi.advanceTimersByTimeAsync(100);

        act(() => {
          state.count = 200;
        });

        // Advance timers to process the history changes
        await vi.advanceTimersByTimeAsync(100);

        // Should be able to go backward twice
        expect(result.current.canBackward).toBe(true);
        expect(result.current.backwardList.length).toBe(2);

        // Go back to first change
        act(() => {
          result.current.backward();
        });

        expect(state.count).toBe(100);
        expect(result.current.canBackward).toBe(true);
        expect(result.current.canForward).toBe(true);

        // Go back to original state
        act(() => {
          result.current.backward();
        });

        expect(state.count).toBe(42);
        expect(result.current.canBackward).toBe(false);
        expect(result.current.canForward).toBe(true);

        // Go forward to first change
        act(() => {
          result.current.forward();
        });

        expect(state.count).toBe(100);
        expect(result.current.canBackward).toBe(true);
        expect(result.current.canForward).toBe(true);

        // Go forward to second change
        act(() => {
          result.current.forward();
        });

        expect(state.count).toBe(200);
        expect(result.current.canBackward).toBe(true);
        expect(result.current.canForward).toBe(false);
      });
    });

    describe('Clear and Reset', () => {
      it('should clear history', async () => {
        const state = anchor({ count: 42 });
        const { result } = renderHook(() => useHistory(state));

        // Make a change
        act(() => {
          state.count = 100;
        });

        // Advance timers to process the history change
        await vi.advanceTimersByTimeAsync(100);

        // Should have history
        expect(result.current.canBackward).toBe(true);

        // Clear history
        act(() => {
          result.current.clear();
        });

        // Should have no history
        expect(result.current.canBackward).toBe(false);
        expect(result.current.canForward).toBe(false);
        expect(result.current.backwardList.length).toBe(0);
        expect(result.current.forwardList.length).toBe(0);
      });

      it('should reset history when resettable option is enabled', async () => {
        const state = anchor({ count: 42 });
        const { result } = renderHook(() => useHistory(state, { resettable: true }));

        // Make a change
        act(() => {
          state.count = 100;
        });

        // Advance timers to process the history change
        await vi.advanceTimersByTimeAsync(100);

        // Should be able to reset
        expect(result.current.canReset).toBe(true);

        // Reset to initial state
        act(() => {
          result.current.reset();
        });

        // Should be back to initial value
        expect(state.count).toBe(42);
        expect(result.current.canReset).toBe(false);
        expect(result.current.canBackward).toBe(false);
        expect(result.current.canForward).toBe(false);
      });
    });

    describe('Cleanup', () => {
      it('should cleanup history on unmount', async () => {
        const state = anchor({ count: 42 });
        const { unmount } = renderHook(() => useHistory(state));

        // Make a change
        act(() => {
          state.count = 100;
        });

        // Advance timers to process the history change
        await vi.advanceTimersByTimeAsync(100);

        // Unmount the component
        unmount();

        // Advance timers to trigger cleanup
        vi.advanceTimersByTime(CLEANUP_DEBOUNCE_TIME);
      });
    });
  });
});
