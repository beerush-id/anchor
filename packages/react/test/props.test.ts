import { effect, mutable } from '@anchorlib/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { $use, bind } from '../src/binding';
import { callback, getProps, proxyProps, withProps } from '../src/props';

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
      const proxiedProps = proxyProps(testProps);

      expect(proxiedProps).toBeDefined();
      expect(typeof proxiedProps).toBe('object');
    });

    it('should log error when spreading props in a reactive boundary', () => {
      vi.useFakeTimers();

      const testProps = { test: 'value' };
      const proxiedProps = proxyProps(testProps);

      const cleanup = effect(() => {
        expect({ ...proxiedProps }).toEqual({});
      });
      expect({ ...proxiedProps }).toEqual(testProps);

      vi.runAllTimers();

      expect(proxiedProps).toBeDefined();
      expect(typeof proxiedProps).toBe('object');
      expect(errSpy).toHaveBeenCalledTimes(1);

      cleanup();

      vi.useRealTimers();
    });

    it('should handle binding references in props', () => {
      const source = mutable({ test: 'test' });
      const binding = bind(source, 'test');
      const testProps = { value: binding };
      const proxiedProps = proxyProps(testProps);

      expect(proxiedProps.value).toBe('test');
    });

    it('should handle mutable ref binding references in props', () => {
      const source = mutable('test');
      const binding = bind(source);
      const testProps = { value: binding };
      const proxiedProps = proxyProps(testProps);

      expect(proxiedProps.value).toBe('test');
    });

    it('should handle mutable references in props', () => {
      const source = mutable('test');
      const testProps = { value: source };
      const proxiedProps = proxyProps(testProps);

      expect(proxiedProps.value).toBe('test');
    });

    it('should handle $use() references in props', () => {
      const source = mutable('test');
      const testProps = { value: $use(source) };
      const proxiedProps = proxyProps(testProps);

      expect(proxiedProps.value).toBe('test');
    });

    it('should handle $use() references with function in props', () => {
      const source = mutable('test');
      const testProps = { value: $use(() => source.value) };
      const proxiedProps = proxyProps(testProps);

      expect(proxiedProps.value).toBe('test');
    });

    it('should handle $use() references with null in props', () => {
      const testProps = { value: $use(null as never) };
      const proxiedProps = proxyProps(testProps);

      expect(proxiedProps.value).toBeUndefined();
    });

    it('should propagate mutation to binding ref', () => {
      const source = mutable({ test: 'test' });
      const binding = bind(source, 'test');
      const props = proxyProps({ value: binding });

      expect(props.value).toBe('test');
      props.value = 'newValue';
      expect(props.value).toBe('newValue');
      expect(source.test).toBe('newValue');
    });

    it('should propagate mutation to mutable ref', () => {
      const source = mutable('test');
      const binding = bind(source);
      const props = proxyProps({ value: binding });

      expect(props.value).toBe('test');
      props.value = 'newValue';
      expect(props.value).toBe('newValue');
      expect(source.value).toBe('newValue');
    });

    it('should propagate mutation to mutable ref', () => {
      const source = mutable('test');
      const props = proxyProps({ value: source });

      expect(props.value).toBe('test');
      props.value = 'newValue' as never;
      expect(props.value).toBe('newValue');
      expect(source.value).toBe('newValue');
    });

    it('should only mutate the props itself', () => {
      const source = mutable('test');
      const props = proxyProps({ value: source.value });

      expect(props.value).toBe('test');
      props.value = 'newValue';
      expect(props.value).toBe('newValue');
      expect(source.value).toBe('test');
    });

    it('should prevent assignment to event handler props', () => {
      vi.useFakeTimers();

      const onClick = vi.fn();
      const testProps = { onClick };
      const proxiedProps = proxyProps(testProps);

      proxiedProps.onClick = (() => {}) as never;
      vi.runAllTimers();

      expect(proxiedProps.onClick).toBe(onClick);
      expect(errSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should provide $omit method to exclude specific props', () => {
      const testProps = { a: 1, b: 2, c: 3 };
      const proxiedProps = proxyProps(testProps);

      const omittedProps = proxiedProps.$omit(['b']);

      // Only non-omitted properties should exist
      expect(omittedProps.a).toBe(1);
      expect((omittedProps as typeof testProps).b).toBe(2);
      expect(omittedProps.c).toBe(3);

      // Check the actual object keys
      const keys = Object.keys(omittedProps);
      expect(keys).toContain('a');
      expect(keys).not.toContain('b');
      expect(keys).toContain('c');
    });

    it('should provide $pick method to include specific props', () => {
      const testProps = { a: 1, b: 2, c: 3 };
      const proxiedProps = proxyProps(testProps);

      const pickedProps = proxiedProps.$pick(['a', 'c']);

      // Only picked properties should exist
      expect(pickedProps.a).toBe(1);
      expect((pickedProps as typeof testProps).b).toBe(2);
      expect(pickedProps.c).toBe(3);

      // Check the actual object keys
      const keys = Object.keys(pickedProps);
      expect(keys).toContain('a');
      expect(keys).not.toContain('b');
      expect(keys).toContain('c');
    });

    it('should handle $omit and $pick with binding references', () => {
      const source = mutable('test');
      const binding = bind(source);
      const testProps = { value: binding, other: 'static' };
      const proxiedProps = proxyProps(testProps);

      // Test $omit
      const omittedProps = proxiedProps.$omit(['other']);
      // Binding should be resolved, other should be omitted
      expect(omittedProps.value).toBe('test');
      expect((omittedProps as typeof testProps).other).toBe('static');

      // Check the actual object keys
      const omittedKeys = Object.keys(omittedProps);
      expect(omittedKeys).toContain('value');
      expect(omittedKeys).not.toContain('other');

      // Test $pick
      const pickedProps = proxiedProps.$pick(['value']);
      // Binding should be resolved, other should not be included
      expect(pickedProps.value).toBe('test');
      expect((pickedProps as typeof testProps).other).toBe('static');

      // Check the actual object keys
      const pickedKeys = Object.keys(pickedProps);
      expect(pickedKeys).toContain('value');
      expect(pickedKeys).not.toContain('other');

      expect(() => {
        proxiedProps.$omit();
      }).not.toThrow();

      expect(() => {
        proxiedProps.$pick();
      }).not.toThrow();
    });

    it('should handle mutations through $omit and $pick objects', () => {
      const source = mutable('test');
      const binding = bind(source);
      const testProps = { value: binding };
      const proxiedProps = proxyProps(testProps);

      const omittedProps = proxiedProps.$omit([]);

      expect(omittedProps.value).toBe('test');
      omittedProps.value = 'newValue';
      expect(omittedProps.value).toBe('newValue');
      expect(source.value).toBe('newValue');

      const pickedProps = proxiedProps.$pick(['value']);
      expect(pickedProps.value).toBe('newValue');
      pickedProps.value = 'newerValue';
      expect(pickedProps.value).toBe('newerValue');
    });
  });
});
