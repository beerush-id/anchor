import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { type ComponentType, useState } from 'react';
import { anchor } from '@anchor/core';
import { type AnchoredProps, cleanProps, observed, useObserver } from '../src/index.js';

// Mock component for testing
const TestComponent: ComponentType<{ value: number } & AnchoredProps> = (props) => {
  return <div data-testid="test-value">{props.value}</div>;
};

describe('Anchor React - Observable Edge Cases', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('useObserver edge cases', () => {
    it('should handle multiple rapid state updates', async () => {
      const state = anchor({ count: 0 });
      let versionValue = 0;

      const TestComponentWithObserver = () => {
        const [, version] = useObserver();
        versionValue = version;

        return (
          <div>
            <span data-testid="version">{version}</span>
            <button
              data-testid="increment"
              onClick={() => {
                state.count++;
              }}>
              Increment
            </button>
          </div>
        );
      };

      render(<TestComponentWithObserver />);

      expect(versionValue).toBe(1);

      // Rapidly update state multiple times
      const incrementButton = screen.getByTestId('increment');
      await act(async () => {
        incrementButton.click();
        incrementButton.click();
        incrementButton.click();
      });

      // Should have updated, but exact count may vary based on batching
      expect(versionValue).toBeGreaterThan(1);
    });

    it('should handle nested observed components', () => {
      const state = anchor({ count: 0 });

      const InnerComponent: ComponentType<AnchoredProps> = (props) => {
        return <span data-testid="inner-count">{state.count}</span>;
      };

      const ObservedInner = observed(InnerComponent);

      const OuterComponent: ComponentType<AnchoredProps> = () => {
        return (
          <div>
            <span data-testid="outer-count">{state.count}</span>
            <ObservedInner />
          </div>
        );
      };

      const ObservedOuter = observed(OuterComponent);

      render(<ObservedOuter />);

      expect(screen.getByTestId('outer-count').textContent).toBe('0');
      expect(screen.getByTestId('inner-count').textContent).toBe('0');

      act(() => {
        state.count = 5;
      });

      expect(screen.getByTestId('outer-count').textContent).toBe('5');
      expect(screen.getByTestId('inner-count').textContent).toBe('5');
    });

    it('should handle conditional rendering of observed components', () => {
      const state = anchor({ show: false, count: 0 });

      const ConditionalComponent: ComponentType<AnchoredProps> = () => {
        return <span data-testid="conditional-count">{state.count}</span>;
      };

      const ObservedConditional = observed(ConditionalComponent);

      const ParentComponent: ComponentType = () => {
        const [show, setShow] = useState(false);

        return (
          <div>
            <button data-testid="toggle" onClick={() => setShow(!show)}>
              Toggle
            </button>
            {show && state.show && <ObservedConditional />}
            <button
              data-testid="show-condition"
              onClick={() => {
                state.show = true;
              }}>
              Show Condition
            </button>
          </div>
        );
      };

      render(<ParentComponent />);

      // Component should not be rendered initially
      expect(screen.queryByTestId('conditional-count')).toBeNull();

      // Set state to show component
      act(() => {
        state.show = true;
      });

      // Component still shouldn't be rendered because of React state
      expect(screen.queryByTestId('conditional-count')).toBeNull();

      // Toggle React state to show component
      const toggleButton = screen.getByTestId('toggle');
      act(() => {
        toggleButton.click();
      });

      // Now component should be rendered
      expect(screen.getByTestId('conditional-count')).not.toBeNull();
      expect(screen.getByTestId('conditional-count').textContent).toBe('0');

      // Update count
      act(() => {
        state.count = 10;
      });

      expect(screen.getByTestId('conditional-count').textContent).toBe('10');
    });
  });

  describe('observed HOC edge cases', () => {
    it('should handle components with no props', () => {
      const state = anchor({ count: 0 });

      const NoPropsComponent: ComponentType<AnchoredProps> = () => {
        return <div data-testid="no-props">Count: {state.count}</div>;
      };

      const ObservedNoProps = observed(NoPropsComponent);

      render(<ObservedNoProps />);

      expect(screen.getByTestId('no-props').textContent).toBe('Count: 0');

      act(() => {
        state.count = 5;
      });

      expect(screen.getByTestId('no-props').textContent).toBe('Count: 5');
    });

    it('should preserve component displayName', () => {
      const ComponentWithDisplayName: ComponentType<AnchoredProps> = () => {
        return <div>Test</div>;
      };

      ComponentWithDisplayName.displayName = 'ComponentWithDisplayName';

      const ObservedWithDisplayName = observed(ComponentWithDisplayName);

      expect(ObservedWithDisplayName.displayName).toBe('Observed(ComponentWithDisplayName)');
    });

    it('should handle components that throw errors', () => {
      const ErrorComponent: ComponentType<AnchoredProps> = () => {
        throw new Error('Test error');
      };

      const ObservedError = observed(ErrorComponent);

      expect(() => render(<ObservedError />)).toThrow('Test error');
    });
  });

  describe('cleanProps edge cases', () => {
    it('should handle props with null or undefined values', () => {
      const propsWithNulls = {
        value: null,
        text: undefined,
        _state_version: 1,
        count: 0,
      };

      const cleaned = cleanProps(propsWithNulls);

      expect(cleaned).toEqual({
        value: null,
        text: undefined,
        count: 0,
      });
      expect(cleaned).not.toHaveProperty('_state_version');
    });

    it('should handle props with special object types', () => {
      const date = new Date();
      const regex = /test/;

      const propsWithSpecialObjects = {
        date,
        regex,
        _state_version: 1,
      };

      const cleaned = cleanProps(propsWithSpecialObjects);

      expect(cleaned).toEqual({
        date,
        regex,
      });
      expect(cleaned).not.toHaveProperty('_state_version');
    });
  });

  describe('integration edge cases', () => {
    it('should handle state updates during render', () => {
      const state = anchor({ count: 0 });

      const ComponentWithRenderUpdate: ComponentType<AnchoredProps> = () => {
        // This is generally not recommended, but we should handle it gracefully
        if (state.count === 0) {
          state.count = 1;
        }

        return <div data-testid="render-update">{state.count}</div>;
      };

      const ObservedComponent = observed(ComponentWithRenderUpdate);

      // Wrap in act to handle state updates during render
      act(() => {
        render(<ObservedComponent />);
      });

      // Should handle the update without infinite loop
      expect(screen.getByTestId('render-update').textContent).toBe('1');
    });
  });
});
