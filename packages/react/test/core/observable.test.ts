import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  RENDERER_INIT_VERSION,
  setDevMode,
  useObservedList,
  useObservedRef,
  useObserver,
  useObserverRef,
} from '../../src/index.js';
import { anchor, setDebugger } from '@anchorlib/core';

describe('Anchor React - Observable', () => {
  let errorSpy;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy?.mockRestore();
  });

  describe('useObserverRef', () => {
    describe('Basic Usage', () => {
      it('should create an observer and version counter', () => {
        const { result } = renderHook(() => useObserverRef());

        const [observer, version] = result.current;

        expect(observer).toBeDefined();
        expect(typeof observer).toBe('object');
        expect(version).toBe(RENDERER_INIT_VERSION);
      });

      it('should increment version when observer is notified', async () => {
        vi.useFakeTimers();
        const logger = vi.fn();
        setDevMode(true);
        setDebugger(logger);

        const state = anchor({ count: 42 });
        const { result, rerender } = renderHook(({ state }) => useObserverRef([state]), {
          initialProps: { state },
        });

        const [observer, version] = result.current;
        expect(version).toBe(RENDERER_INIT_VERSION);
        const count = observer.run(() => state.count);
        expect(count).toBe(42);

        // Trigger a change in the observed state
        act(() => {
          state.count = 100;
        });

        vi.runAllTimers();

        // Version should have incremented
        const [, newVersion] = result.current;
        expect(state.count).toBe(100);
        expect(newVersion).toBe(RENDERER_INIT_VERSION + 1);

        // Re-render with new deps to reset the observer.
        rerender({ state: anchor({ count: 0 }) });
        expect(result.current[1]).toBe(RENDERER_INIT_VERSION + 1);

        act(() => {
          state.count = 200; // Should no langer being tracked.
        });

        expect(result.current[1]).toBe(RENDERER_INIT_VERSION + 1);

        setDevMode(false);
        setDebugger(undefined);
        vi.useRealTimers();
      });

      it('should handle dependencies correctly', () => {
        const state1 = anchor({ count: 42 });
        const state2 = anchor({ name: 'test' });
        const { result } = renderHook(() => useObserverRef([state1, state2], 'TestObserver'));

        const [observer, version] = result.current;

        expect(observer).toBeDefined();
        expect(observer.name).toBe('TestObserver');
        expect(version).toBe(RENDERER_INIT_VERSION);
      });
    });
  });

  describe('useObserver', () => {
    describe('Basic Usage', () => {
      it('should compute and return observed value', () => {
        const state = anchor({ count: 42 });
        const observe = () => state.count * 2;
        const { result } = renderHook(() => useObserver(observe));

        expect(result.current).toBe(84);
      });

      it('should recompute value when dependencies change', () => {
        const state = anchor({ count: 42 });
        const observe = () => state.count * 2;
        const { result } = renderHook(() => useObserver(observe));

        expect(result.current).toBe(84);

        act(() => {
          state.count = 100;
        });

        expect(result.current).toBe(200);
      });

      it('should handle additional dependencies', () => {
        const state = anchor({ count: 42 });
        const multiplier = 3;
        const observe = () => state.count * multiplier;
        const { result } = renderHook(() => useObserver(observe, [multiplier]));

        expect(result.current).toBe(126);

        // Change the reactive state
        act(() => {
          state.count = 100;
        });

        expect(result.current).toBe(300);
      });
    });
  });

  describe('useObservedRef', () => {
    describe('Basic Usage', () => {
      it('should create a constant ref with computed value', () => {
        const state = anchor({ count: 42 });
        const observe = () => state.count * 2;
        const { result } = renderHook(() => useObservedRef(observe));

        expect(result.current).toBeDefined();
        expect(result.current.value).toBe(84);
        expect(typeof result.current).toBe('object');
        expect(result.current).toHaveProperty('value');
      });

      it('should update ref value when dependencies change', () => {
        const state = anchor({ count: 42 });
        const observe = () => state.count * 2;
        const { result } = renderHook(() => useObservedRef(observe));

        expect(result.current.value).toBe(84);

        act(() => {
          state.count = 100;
        });

        expect(result.current.value).toBe(200);
      });

      it('should handle additional dependencies', () => {
        const state = anchor({ count: 42 });
        const multiplier = 3;
        const observe = () => state.count * multiplier;
        const { result } = renderHook(() => useObservedRef(observe, [multiplier]));

        expect(result.current.value).toBe(126);

        // Change the reactive state
        act(() => {
          state.count = 100;
        });

        expect(result.current.value).toBe(300);
      });
    });
  });

  describe('useObservedList', () => {
    describe('Basic Usage', () => {
      it('should derive list with index keys from reactive array', () => {
        const state = anchor([{ name: 'Alice' }, { name: 'Bob' }]);
        const { result } = renderHook(() => useObservedList(state));

        expect(result.current).toEqual([
          { key: 0, value: { name: 'Alice' } },
          { key: 1, value: { name: 'Bob' } },
        ]);
      });

      it('should derive list with custom keys from reactive array', () => {
        const state = anchor([
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ]);
        const { result } = renderHook(() => useObservedList(state, 'id'));

        expect(result.current).toEqual([
          { key: 1, value: { id: 1, name: 'Alice' } },
          { key: 2, value: { id: 2, name: 'Bob' } },
        ]);
      });

      it('should update list when array state changes', () => {
        const state = anchor([{ name: 'Alice' }]);
        const { result, rerender } = renderHook(() => useObservedList(state));

        expect(result.current).toEqual([{ key: 0, value: { name: 'Alice' } }]);

        act(() => {
          state.push({ name: 'Bob' });
        });

        rerender();

        expect(result.current).toEqual([
          { key: 0, value: { name: 'Alice' } },
          { key: 1, value: { name: 'Bob' } },
        ]);
      });
    });
  });
});
