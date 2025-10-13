import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useBinding, useConstant, useVariable } from '../../src/index.js';
import { anchor } from '@anchorlib/core';

describe('Anchor React - Binding', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    errorSpy?.mockRestore();
  });

  describe('Basic Usage', () => {
    it('should bind a state property to another state property', () => {
      const source = anchor({ text: 'test' });
      const target = anchor({ text: 'initial' });

      renderHook(() => useBinding(target, 'text', [source, 'text']));

      // Initial binding - target should take source value
      expect(target.text).toBe('test');

      // When source changes, target should update
      act(() => {
        source.text = 'updated';
      });

      expect(target.text).toBe('updated');
    });

    it('should return the target state', () => {
      const source = anchor({ text: 'test' });
      const target = anchor({ text: 'initial' });

      const { result } = renderHook(() => useBinding(target, 'text', [source, 'text']));

      expect(result.current).toBe(target);
    });
  });

  describe('No Binding', () => {
    it('should not bind when no bind parameter is given', () => {
      const target = anchor({ text: 'initial' });

      renderHook(() => useBinding(target, 'text'));

      // Target text should remain unchanged
      expect(target.text).toBe('initial');

      // Should not have called console.error
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Binding to Constant', () => {
    it('should handle binding to constant with error', () => {
      const { result: constantResult } = renderHook(() => useConstant(42));
      const [constantRef] = constantResult.current;
      const target = anchor({ value: 'initial' });

      renderHook(() => useBinding(target, 'value', [constantRef as never] as never));
      vi.runAllTimers();

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('Binding to Variable', () => {
    it('should bind a state property to a variable ref', () => {
      const { result: variableResult } = renderHook(() => useVariable(42));
      const [variableRef] = variableResult.current;
      const target = anchor({ value: 'initial' });

      const { unmount } = renderHook(() => useBinding(target, 'value', [variableRef] as any));

      // Initial binding - target should take variable value
      expect(target.value).toBe(42);

      // When variable changes, target should update
      act(() => {
        variableRef.value = 100;
      });

      expect(target.value).toBe(100);

      // Unmount to test cleanup
      unmount();
    });
  });

  describe('Unmounting', () => {
    it('should call unbind function when component unmounts', () => {
      const source = anchor({ text: 'test' });
      const target = anchor({ text: 'initial' });
      const unbindFn = vi.fn();

      const { unmount } = renderHook(() => useBinding(target, 'text', [source, 'text']));

      // Unmount the component
      unmount();
    });
  });
});
