import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMicrobatch, useMicrotask, useRefTrap, useShortId, useSnapshot, useStableRef } from '../../src/hooks';
import { anchor, microbatch, microtask, outsideObserver, shortId } from '@anchorlib/core';

// Mock the anchor core functions
vi.mock('@anchorlib/core', async () => {
  const actual = await vi.importActual('@anchorlib/core');
  return {
    ...actual,
    shortId: vi.fn(() => 'mock-id'),
    microtask: vi.fn((timeout?: number) => vi.fn()),
    microbatch: vi.fn((delay?: number) => vi.fn()),
    outsideObserver: vi.fn((fn) => fn()),
    anchor: {
      snapshot: vi.fn((state) => state),
    },
  };
});

describe('Anchor React - Hooks', () => {
  describe('useShortId', () => {
    it('should generate a short id using the shortId function', () => {
      const { result } = renderHook(() => useShortId());

      expect(result.current).toBe('mock-id');
      expect(shortId).toHaveBeenCalled();
    });

    it('should return the same id on re-renders', () => {
      const { result, rerender } = renderHook(() => useShortId());

      const firstId = result.current;
      rerender();
      const secondId = result.current;

      expect(firstId).toBe(secondId);
    });
  });

  describe('useRefTrap', () => {
    it('should create a ref with initial value', () => {
      const handler = vi.fn((value) => value);
      const { result } = renderHook(() => useRefTrap('initial', handler));

      expect(result.current.current).toBe('initial');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should call handler when setting value', () => {
      const handler = vi.fn((value) => `handled-${value}`);
      const { result } = renderHook(() => useRefTrap('initial', handler));

      act(() => {
        result.current.current = 'updated';
      });

      expect(handler).toHaveBeenCalledWith('updated');
      expect(result.current.current).toBe('handled-updated');
    });

    it('should maintain ref stability across re-renders', () => {
      const handler = vi.fn((value) => value);
      const { result, rerender } = renderHook(() => useRefTrap('initial', handler));

      const firstRef = result.current;
      rerender();
      const secondRef = result.current;

      expect(firstRef).toBe(secondRef);
    });
  });

  describe('useMicrotask', () => {
    it('should return a microtask function from useRef', () => {
      const mockMicrotask = vi.fn();
      vi.mocked(microtask).mockReturnValue([mockMicrotask, mockMicrotask]);

      const { result } = renderHook(() => useMicrotask());

      expect(result.current[0]).toBe(mockMicrotask);
      expect(microtask).toHaveBeenCalled();
    });

    it('should pass timeout parameter to microtask function', () => {
      const timeout = 100;
      renderHook(() => useMicrotask(timeout));

      expect(microtask).toHaveBeenCalledWith(timeout);
    });

    it('should maintain function stability across re-renders', () => {
      const mockMicrotask = vi.fn();
      vi.mocked(microtask).mockReturnValue([mockMicrotask, mockMicrotask]);

      const { result, rerender } = renderHook(() => useMicrotask());

      const firstFn = result.current;
      rerender();
      const secondFn = result.current;

      expect(firstFn).toBe(secondFn);
    });
  });

  describe('useMicrobatch', () => {
    it('should return a microbatch function from useRef', () => {
      const mockMicrobatch = vi.fn();
      vi.mocked(microbatch).mockReturnValue([mockMicrobatch, mockMicrobatch]);

      const { result } = renderHook(() => useMicrobatch());

      expect(result.current[0]).toBe(mockMicrobatch);
      expect(microbatch).toHaveBeenCalled();
    });

    it('should pass delay parameter to microbatch function', () => {
      const delay = 50;
      renderHook(() => useMicrobatch(delay));

      expect(microbatch).toHaveBeenCalledWith(delay);
    });

    it('should maintain function stability across re-renders', () => {
      const mockMicrobatch = vi.fn();
      vi.mocked(microbatch).mockReturnValue([mockMicrobatch, mockMicrobatch]);

      const { result, rerender } = renderHook(() => useMicrobatch());

      const firstFn = result.current;
      rerender();
      const secondFn = result.current;

      expect(firstFn).toBe(secondFn);
    });
  });

  describe('useStableRef', () => {
    it('should create a stable ref with initial value', () => {
      const { result } = renderHook(() => useStableRef('initial', ['dep1']));

      expect(result.current.value).toBe('initial');
      expect(result.current.deps).toEqual(new Set(['dep1']));
      expect(result.current.stable).toBe(true);
    });

    it('should support function initializer', () => {
      const initializer = vi.fn(() => 'computed');
      const { result } = renderHook(() => useStableRef(initializer, ['dep1']));

      expect(initializer).toHaveBeenCalled();
      expect(result.current.value).toBe('computed');
    });

    it('should update value when dependencies change', () => {
      const { result, rerender } = renderHook(({ deps, init }) => useStableRef(init, deps), {
        initialProps: { init: 'foo', deps: ['dep1'] },
      });

      const firstResult = result.current;
      expect(firstResult.value).toBe('foo');

      rerender({ deps: ['dep2'], init: 'bar' });
      const secondResult = result.current;

      expect(firstResult).toBe(secondResult); // Same object reference
      expect(secondResult.deps).toEqual(new Set(['dep2']));
      expect(secondResult.value).toEqual('bar');
    });

    it('should update value when dependencies change', () => {
      const initializer = vi.fn(() => 'computed');
      const { result, rerender } = renderHook(({ deps }) => useStableRef(initializer, deps), {
        initialProps: { deps: ['dep1'] },
      });

      const firstResult = result.current;
      expect(initializer).toHaveBeenCalledTimes(1);

      rerender({ deps: ['dep2'] });
      const secondResult = result.current;

      expect(initializer).toHaveBeenCalledTimes(2);
      expect(firstResult).toBe(secondResult); // Same object reference
      expect(secondResult.deps).toEqual(new Set(['dep2']));
    });

    it('should not update value when dependencies are the same', () => {
      const initializer = vi.fn(() => 'computed');
      const { result, rerender } = renderHook(({ deps }) => useStableRef(initializer, deps), {
        initialProps: { deps: ['dep1', 'dep2'] },
      });

      const firstResult = result.current;
      expect(initializer).toHaveBeenCalledTimes(1);

      rerender({ deps: ['dep1', 'dep2'] }); // Same deps
      const secondResult = result.current;

      expect(initializer).toHaveBeenCalledTimes(1); // Not called again
      expect(firstResult).toBe(secondResult);
    });
  });

  describe('useSnapshot', () => {
    it('should create a snapshot of a reactive state', () => {
      const state = { count: 1, name: 'test' };
      const snapshot = { count: 1, name: 'test' };
      vi.mocked(anchor.snapshot).mockReturnValue(snapshot);
      vi.mocked(outsideObserver).mockImplementation((fn) => fn());

      const { result } = renderHook(() => useSnapshot(state));

      expect(result.current).toBe(snapshot);
      expect(anchor.snapshot).toHaveBeenCalledWith(state);
      expect(outsideObserver).toHaveBeenCalled();
    });

    it('should create a transformed snapshot when transform function is provided', () => {
      const state = { count: 1, name: 'test' };
      const snapshot = { count: 1, name: 'test' };
      const transformed = { label: 'test: 1' };
      const transform = vi.fn(() => transformed);

      vi.mocked(anchor.snapshot).mockReturnValue(snapshot);
      vi.mocked(outsideObserver).mockImplementation((fn) => fn());

      const { result } = renderHook(() => useSnapshot(state, transform));

      expect(result.current).toBe(transformed);
      expect(anchor.snapshot).toHaveBeenCalledWith(state);
      expect(transform).toHaveBeenCalledWith(snapshot);
      expect(outsideObserver).toHaveBeenCalled();
    });
  });
});
