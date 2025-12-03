import { mutable } from '@anchorlib/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bind } from '../src/binding';
import { callback, getProps, setupProps, withProps } from '../src/props';

describe('Anchor React - Props', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
  });

  describe('withProps', () => {
    it('should execute function with provided props', () => {
      const testProps = { test: 'value' };
      const testFn = vi.fn().mockReturnValue('result');

      const result = withProps(testProps, testFn);

      expect(result).toBe('result');
      expect(testFn).toHaveBeenCalled();
    });

    it('should set and restore props context', () => {
      const testProps = { test: 'value' };
      let capturedProps: typeof testProps | undefined;

      withProps(testProps, () => {
        capturedProps = getProps();
      });

      expect(capturedProps).toEqual(testProps);
    });
  });

  describe('getProps', () => {
    it('should return undefined when no props are set', () => {
      const props = getProps();
      expect(props).toBeUndefined();
    });

    it('should return props when set in context', () => {
      const testProps = { test: 'value' };
      let capturedProps: typeof testProps | undefined;

      withProps(testProps, () => {
        capturedProps = getProps();
      });

      expect(capturedProps).toEqual(testProps);
    });
  });

  describe('callback', () => {
    it('should return undefined in non-browser environment (server)', () => {
      vi.stubGlobal('window', undefined);

      const testCallback = vi.fn();
      const result = callback(testCallback);

      // In server environment, callbacks should return undefined
      expect(result).toBeUndefined();

      vi.unstubAllGlobals();
    });

    it('should return the callback function on client', () => {
      const testCallback = vi.fn();
      const result = callback(testCallback);

      // On server, should not execute the callback
      expect(testCallback).not.toHaveBeenCalled();
      expect(result).toBe(testCallback);
    });
  });

  describe('setupProps', () => {
    it('should create a proxy for props', () => {
      const testProps = { test: 'value' };
      const proxiedProps = setupProps(testProps);

      expect(proxiedProps).toBeDefined();
      expect(typeof proxiedProps).toBe('object');
    });

    it('should handle binding references in props', () => {
      const source = mutable('test');
      const binding = bind(source);
      const testProps = { value: binding };
      const proxiedProps = setupProps(testProps);

      expect(proxiedProps.value).toBe('test');
    });

    it('should handle mutable references in props', () => {
      const source = mutable('test');
      const testProps = { value: source };
      const proxiedProps = setupProps(testProps);

      expect(proxiedProps.value).toBe('test');
    });

    it('should propagate mutation to binding ref', () => {
      const source = mutable('test');
      const binding = bind(source);
      const props = setupProps({ value: binding });

      expect(props.value).toBe('test');
      props.value = 'newValue';
      expect(props.value).toBe('newValue');
      expect(source.value).toBe('newValue');
    });

    it('should propagate mutation to mutable ref', () => {
      const source = mutable('test');
      const props = setupProps({ value: source });

      expect(props.value).toBe('test');
      props.value = 'newValue';
      expect(props.value).toBe('newValue');
      expect(source.value).toBe('newValue');
    });

    it('should only mutate the props itself', () => {
      const source = mutable('test');
      const props = setupProps({ value: source.value });

      expect(props.value).toBe('test');
      props.value = 'newValue';
      expect(props.value).toBe('newValue');
      expect(source.value).toBe('test');
    });

    it('should prevent assignment to event handler props', () => {
      vi.useFakeTimers();

      const onClick = vi.fn();
      const testProps = { onClick };
      const proxiedProps = setupProps(testProps);

      proxiedProps.onClick = () => {};
      vi.runAllTimers();

      expect(proxiedProps.onClick).toBe(onClick);
      expect(errSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});
