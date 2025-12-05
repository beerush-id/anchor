import { mutable } from '@anchorlib/core';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type BindableProps, setup } from '../src/index.js';
import { createLifecycle } from '../src/lifecycle.js';
import { applyAttributes, escapeAttributes, flattenStyles, nodeRef } from '../src/node';
import '../src/client/index';

describe('Anchor React - Node', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
  });

  describe('nodeRef', () => {
    it('should create a node reference', () => {
      const factory = () => ({ className: 'test' });
      let ref: BindableProps | undefined;

      const Component = setup(() => {
        ref = nodeRef(factory);
        return <></>;
      });

      render(<Component />);

      expect(ref).toBeDefined();
      expect(typeof ref).toBe('object');
      expect(typeof ref?.current).toBe('undefined'); // Initially undefined
      expect(typeof ref?.attributes).toBe('object');
    });

    it('should update when current element is set', () => {
      const classRef = mutable('mounted');
      const lifecycle = createLifecycle();
      const factory = (node?: HTMLElement) => ({
        className: node ? classRef.value : 'initial',
      });

      const ref = lifecycle.render(() => nodeRef(factory));

      // Create a mock element
      const element = document.createElement('div');
      ref.current = element;

      expect(ref.current).toBe(element);
      expect(ref.attributes.className).toBe('mounted');

      classRef.value = 'updated';
      expect(ref.attributes.className).toBe('updated');

      lifecycle.cleanup();
    });

    it('should handle void returns and destroy', () => {
      const state = mutable(0);
      const factory = (node: unknown) => {
        expect(node).toBeUndefined();
        expect(state.value).toBeGreaterThan(-1);
        // Void return.
      };
      const ref = nodeRef(factory);

      state.value++;

      expect(() => ref.destroy()).not.toThrow();
    });
  });

  describe('escapeAttributes', () => {
    beforeEach(() => {
      vi.stubGlobal('window', undefined);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should process attributes for server-side rendering', () => {
      const props = {
        className: 'test',
        onClick: () => {},
        value: 'input-value',
      };

      const escaped = escapeAttributes(props);

      // In server environment, event handlers should be removed
      expect(escaped).toEqual({
        className: 'test',
        value: 'input-value',
        defaultValue: 'input-value',
      });
    });

    it('should handle attributes without value attribute', () => {
      const props = {
        className: 'test',
        onClick: () => {},
      };

      const escaped = escapeAttributes(props);

      expect(escaped).toEqual({
        className: 'test',
      });
    });
  });

  describe('applyAttributes', () => {
    it('should apply attributes to an element', () => {
      const element = document.createElement('div');
      const props = {
        className: 'test',
        id: 'test-id',
      };

      applyAttributes(element, props);

      expect(element.className).toBe('test');
      expect(element.id).toBe('test-id');
    });

    it('should short circuit with invalid element', () => {
      expect(() => applyAttributes(null as never, {})).not.toThrow();
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

      applyAttributes(element, props);

      expect(element.style.color).toBe('red');
      expect(element.style.fontSize).toBe('16px');
    });

    it('should handle attributes removal', () => {
      const element = document.createElement('div');
      const prevProps = {
        style: {
          color: 'red',
        },
        'data-id': 'test',
      };

      applyAttributes(element, prevProps);

      expect(element.style.color).toBe('red');
      expect(element.getAttribute('data-id')).toBe('test');

      applyAttributes(element, {} as typeof prevProps, prevProps);

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

      applyAttributes(element, props, props);
      expect(element.setAttribute).not.toHaveBeenCalled();

      applyAttributes(element, { ...props, 'data-test': 'test' } as typeof props, props);
      expect(element.setAttribute).toHaveBeenCalledTimes(1);
    });

    it('should handle event handler skipping', () => {
      const element = document.createElement('div');
      Object.defineProperty(element, 'setAttribute', {
        value: vi.fn(),
      });

      const props = { onClick: vi.fn(), onChange: vi.fn() };
      applyAttributes(element, { onChange: vi.fn() } as typeof props, props);

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
      applyAttributes(element, props);

      // Apply updated styles removing fontSize
      applyAttributes(
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
