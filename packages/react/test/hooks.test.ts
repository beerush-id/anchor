import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEffect, createMemo, createRef, createState } from '../src/hooks';

describe('Anchor React - Hooks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createState', () => {
    it('should create state with initial value on server', () => {
      // On server, createState behaves synchronously without reactivity
      const result = createState('initial');

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toBe('initial');
      expect(typeof result[1]).toBe('function');
    });

    it('should behave as synchronous function on server', () => {
      const result = createState(0);
      const [, setValue] = result;

      // On server, calling setter doesn't cause re-renders
      setValue(5);

      // Still returns the initial value since there's no reactivity
      expect(result[0]).toBe(0);
    });

    it('should accept function initializer', () => {
      const result = createState(() => 'initialized');

      expect(result[0]).toBe('initialized');
    });
  });

  describe('createEffect', () => {
    it('should not run effects on server', () => {
      const effectFn = vi.fn();

      // On server, createEffect should not execute
      createEffect(effectFn);

      expect(effectFn).not.toHaveBeenCalled();
    });

    it('should be safe to call on server without errors', () => {
      const effectFn = vi.fn().mockImplementation(() => () => {});

      // Should not throw on server
      expect(() => createEffect(effectFn)).not.toThrow();
    });
  });

  describe('createRef', () => {
    it('should create ref with initial value on server', () => {
      const result = createRef('initial');

      expect(result).toEqual({ current: 'initial' });
    });

    it('should allow updating ref value on server', () => {
      const result = createRef('initial');

      result.current = 'updated';

      expect(result.current).toBe('updated');
    });
  });

  describe('createMemo', () => {
    it('should compute and return memoized value on server', () => {
      const computeFn = vi.fn().mockReturnValue('computed');
      const result = createMemo(computeFn, []);

      expect(result).toBe('computed');
      expect(computeFn).toHaveBeenCalledTimes(1);
    });

    it('should not recompute without dependencies on server', () => {
      const [state, setState] = createState(0);
      const computeFn = vi.fn().mockReturnValue(state);
      const result = createMemo(computeFn, []);

      setState(1);

      expect(result).toBe(0);
      // Compute function only called once because there are no dependencies
      expect(computeFn).toHaveBeenCalledTimes(1);
    });

    it('should compute based on dependencies on server', () => {
      const computeFn = vi.fn().mockImplementation((dep) => `computed:${dep}`);
      const result = createMemo(() => computeFn('dep1'), ['dep1']);

      expect(result).toBe('computed:dep1');
      expect(computeFn).toHaveBeenCalledTimes(1);
    });
  });
});
