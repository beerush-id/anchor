import { mutable } from '@anchorlib/core';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type BindableProps, setup } from '../src/index.js';
import { createLifecycle } from '../src/lifecycle.js';
import { applyProps, escapeProps, flattenStyles, propsRef } from '../src/node';

describe('Anchor React - Node', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
  });

  describe('propsRef', () => {
    it('should warn when calling propsRef outside of component', () => {
      vi.useFakeTimers();

      const factory = vi.fn();
      propsRef(factory);
      vi.runAllTimers();

      expect(factory).toHaveBeenCalled();
      expect(errSpy).toHaveBeenCalled();
    });

    it('should create a props reference', () => {
      const factory = () => ({ className: 'test' });
      let ref: BindableProps | undefined;

      const Component = setup(() => {
        ref = propsRef(factory);
        return <></>;
      });

      render(<Component />);

      expect(ref).toBeDefined();
      expect(typeof ref).toBe('object');
      expect(typeof ref?.current).toBe('undefined'); // Initially undefined
      expect(typeof ref?.props).toBe('object');
    });

    it('should update when current element is set', () => {
      const classRef = mutable('mounted');
      const lifecycle = createLifecycle();
      const factory = (node?: HTMLElement) => ({
        className: node ? classRef.value : 'initial',
      });

      const ref = lifecycle.render(() => propsRef(factory));

      // Create a mock element
      const element = document.createElement('div');
      ref.current = element;

      expect(ref.current).toBe(element);
      expect(ref.props.className).toBe('mounted');

      classRef.value = 'updated';
      expect(ref.props.className).toBe('updated');

      lifecycle.cleanup();
    });

    it('should destroy cleanly', () => {
      const factory = () => ({ className: 'test' });
      const ref = propsRef(factory);

      expect(() => ref.destroy()).not.toThrow();
    });
  });

  describe('escapeProps', () => {
    beforeEach(() => {
      vi.stubGlobal('window', undefined);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should process props for server-side rendering', () => {
      const props = {
        className: 'test',
        onClick: () => {},
        value: 'input-value',
      };

      const escaped = escapeProps(props);

      // In server environment, event handlers should be removed
      expect(escaped).toEqual({
        className: 'test',
        value: 'input-value',
        defaultValue: 'input-value',
      });
    });

    it('should handle props without value attribute', () => {
      const props = {
        className: 'test',
        onClick: () => {},
      };

      const escaped = escapeProps(props);

      expect(escaped).toEqual({
        className: 'test',
      });
    });
  });

  describe('applyProps', () => {
    it('should apply props to an element', () => {
      const element = document.createElement('div');
      const props = {
        className: 'test',
        id: 'test-id',
      };

      applyProps(element, props);

      expect(element.className).toBe('test');
      expect(element.id).toBe('test-id');
    });

    it('should short circuit with invalid element', () => {
      expect(() => applyProps(null as never, {})).not.toThrow();
    });

    it('should handle style objects', () => {
      const element = document.createElement('div');
      const props = {
        style: {
          '--base-color': 'blue',
          color: 'red',
          fontSize: '16px',
        },
      };

      applyProps(element, props);

      expect(element.style.color).toBe('red');
      expect(element.style.fontSize).toBe('16px');
    });

    it('should handle props removal', () => {
      const element = document.createElement('div');
      const prevProps = {
        style: {
          color: 'red',
        },
        'data-id': 'test',
      };

      applyProps(element, prevProps);

      expect(element.style.color).toBe('red');
      expect(element.getAttribute('data-id')).toBe('test');

      applyProps(element, {} as typeof prevProps, prevProps);

      expect(element.getAttribute('style')).toBeNull();
      expect(element.style.color).toBe('');
      expect(element.getAttribute('data-id')).toBeNull();
    });

    it('should handle same value assignment', () => {
      const element = document.createElement('div');
      Object.defineProperty(element, 'setAttribute', {
        value: vi.fn(),
      });

      const props = { 'data-id': 'test' };

      applyProps(element, props, props);
      expect(element.setAttribute).not.toHaveBeenCalled();

      applyProps(element, { ...props, 'data-test': 'test' } as typeof props, props);
      expect(element.setAttribute).toHaveBeenCalledTimes(1);
    });

    it('should handle event handler skipping', () => {
      const element = document.createElement('div');
      Object.defineProperty(element, 'setAttribute', {
        value: vi.fn(),
      });

      const props = { onClick: vi.fn(), onChange: vi.fn() };
      applyProps(element, { onChange: vi.fn() } as typeof props, props);

      expect(element.setAttribute).not.toHaveBeenCalled();
    });

    it('should handle style removal', () => {
      const element = document.createElement('div');

      // Apply initial styles
      const props = {
        style: {
          color: 'red',
          backgroundColor: 'blue',
          fontSize: '16px',
        },
      };
      applyProps(element, props);

      // Apply updated styles removing fontSize
      applyProps(
        element,
        {
          style: {
            color: 'blue',
            backgroundColor: 'blue',
          },
        } as typeof props,
        props
      );

      expect(element.style.color).toBe('blue');
    });
  });

  describe('flattenStyles', () => {
    it('should convert style object to CSS string', () => {
      const styles = {
        color: 'red',
        fontSize: '16px',
        backgroundColor: 'blue',
      };

      const cssString = flattenStyles(styles);

      expect(cssString).toContain('color: red;');
      expect(cssString).toContain('font-size: 16px;');
      expect(cssString).toContain('background-color: blue;');
    });

    it('should handle numeric values', () => {
      const styles = {
        zIndex: 10,
        opacity: 0.5,
      };

      const cssString = flattenStyles(styles);

      expect(cssString).toContain('z-index: 10;');
      expect(cssString).toContain('opacity: 0.5;');
    });
  });
});
