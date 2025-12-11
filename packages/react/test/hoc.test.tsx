import { mutable } from '@anchorlib/core';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render as renderView, setup, snippet, template } from '../src/hoc.js';
import '../src/client/index';

describe('Anchor React - HOC', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
    warnSpy.mockRestore();
  });

  describe('setup', () => {
    it('should create a setup component', () => {
      const TestComponent = () => 'Test Component';
      const SetupComponent = setup(TestComponent, 'TestComponent');

      expect(SetupComponent).toBeDefined();
      expect(typeof SetupComponent).toBe('object');
    });

    it('should handle non-function components', () => {
      vi.useFakeTimers();

      const NotAFunction = 'not-a-function' as any;
      const ErrorComponent = setup(NotAFunction, 'ErrorComponent');
      const AnotherError = setup(NotAFunction);

      vi.runAllTimers();

      render(<ErrorComponent />);
      render(<AnotherError />);

      expect(ErrorComponent).toBeDefined();
      expect(AnotherError).toBeDefined();
      expect(AnotherError.displayName).toBe('Error(Anonymous)');

      expect(errSpy).toHaveBeenCalled();
      expect(typeof ErrorComponent).toBe('function');
    });

    it('should preserve displayName', () => {
      const TestComponent = () => 'Test Component';
      TestComponent.displayName = 'CustomDisplayName';
      const SetupComponent = setup(TestComponent);

      expect(SetupComponent.displayName).toBe('CustomDisplayName');
    });

    it('should render setup component correctly', () => {
      const TestComponent = () => 'Test Component';
      const SetupComponent = setup(TestComponent);

      const { container } = render(<SetupComponent />);
      expect(container.textContent).toBe('Test Component');
    });

    it('should only re-render when props change', () => {
      let renderCount = 0;
      const TestComponent = (props: { value?: string }) => {
        renderCount++;

        return renderView(() => <span>Test Component: {props.value || 'default'}</span>);
      };

      const SetupComponent = setup(TestComponent);

      const { rerender } = render(<SetupComponent value="first" />);
      expect(renderCount).toBe(1);
      expect(screen.getByText('Test Component: first')).toBeDefined();

      // Re-render with same props (should not cause re-render)
      rerender(<SetupComponent value="first" />);
      expect(renderCount).toBe(1);

      // Re-render with different props (should not cause re-render)
      act(() => {
        rerender(<SetupComponent value="second" />);
      });
      expect(renderCount).toBe(1);
      expect(screen.getByText('Test Component: second')).toBeDefined();
    });
  });

  describe('template/snippet', () => {
    it('should create a template component', () => {
      const TestTemplate = template(() => 'Test Template', 'TestTemplate');

      expect(TestTemplate).toBeDefined();
      expect(typeof TestTemplate).toBe('object');
    });

    it('should handle non-function renderers', () => {
      vi.useFakeTimers();

      const NotAFunction = 'not-a-function' as any;
      const ErrorTemplate = template(NotAFunction, 'ErrorTemplate');
      const AnotherError = template(NotAFunction);
      vi.runAllTimers();

      render(<ErrorTemplate />);

      expect(ErrorTemplate).toBeDefined();
      expect(AnotherError).toBeDefined();
      expect(AnotherError.displayName).toBe('Error(Anonymous)');

      expect(errSpy).toHaveBeenCalled();
      expect(typeof ErrorTemplate).toBe('function');

      vi.useRealTimers();
    });

    it('should preserve displayName', () => {
      const TestTemplate = template(() => 'Test Template');
      TestTemplate.displayName = 'CustomTemplate';

      expect(TestTemplate.displayName).toBe('CustomTemplate');
    });

    it('should render template component correctly', () => {
      const TestTemplate = template(() => 'Test Template');

      const { container } = render(<TestTemplate />);
      expect(container.textContent).toBe('Test Template');
    });

    it('should log error when declaring snippet outside of component', () => {
      vi.useFakeTimers();

      const TestTemplate = snippet(() => 'Test Template');

      const { container } = render(<TestTemplate />);
      expect(container.textContent).toBe('Test Template');

      vi.runAllTimers();

      expect(errSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should log warning when declaring template inside a component', () => {
      vi.useFakeTimers();

      const TestComponent = setup(() => {
        const Template = template(() => 'Test Template');
        return <Template />;
      });

      const { container } = render(<TestComponent />);
      expect(container.textContent).toBe('Test Template');

      vi.runAllTimers();

      expect(warnSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should re-render when observed state changes', () => {
      let renderCount = 0;
      const count = mutable(0);

      const TestComponent = setup(() => {
        const Template = snippet(() => {
          renderCount++;
          return `Count: ${count.value}`;
        });

        return <Template />;
      });

      const { rerender } = render(<TestComponent />);
      expect(screen.getByText('Count: 0')).toBeDefined();
      expect(renderCount).toBe(1);

      // Change state - should trigger re-render of view only
      act(() => {
        count.value++;
      });

      rerender(<TestComponent />);
      // The setup component should not re-render, but the view should
      expect(renderCount).toBe(2);
    });
  });

  describe('Integration', () => {
    it('should work with setup and template together', () => {
      const count = mutable(0);

      const TestComponent = setup(() => {
        const Template = snippet(() => (
          <div>
            <span>Count: {count.value}</span>
            <button onClick={() => count.value++}>Increment</button>
          </div>
        ));

        return <Template />;
      }, 'Counter');

      expect(TestComponent).toBeDefined();
      expect(typeof TestComponent).toBe('object');
    });

    it('should render and update correctly with setup and view', () => {
      const count = mutable(0);

      const TestComponent = setup(() => {
        const Template = snippet(() => (
          <div>
            <span data-testid="count">Count: {count.value}</span>
            <button data-testid="increment" onClick={() => count.value++}>
              Increment
            </button>
          </div>
        ));

        return <Template />;
      }, 'Counter');

      render(<TestComponent />);

      // Initial render
      expect(screen.getByText('Count: 0')).toBeDefined();

      // Click button to increment
      const button = screen.getByTestId('increment');
      act(() => {
        button.click();
      });

      // Should update to Count: 1
      expect(screen.getByText('Count: 1')).toBeDefined();
    });
  });
});
