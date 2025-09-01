import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { type ComponentType } from 'react';
import { anchor } from '@anchor/core';
import { type AnchoredProps, cleanProps, observed, setDevMode, useObserverNode } from '../src/index.js';
import { mockObserverProp } from '../mocks/observable.js';

// Mock component for testing
const TestComponent: ComponentType<{ value: number } & AnchoredProps> = (props) => {
  return <div data-testid="test-value">{props.value}</div>;
};

describe('Anchor React - Observable', () => {
  setDevMode(false, false);

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Observer Hook', () => {
    it('should create an observer and return Unobserve component and version number', () => {
      let UnobserveComponent: ComponentType | null = null;
      let version: number | null = null;

      const TestHook = () => {
        const [Unobserve, versionValue] = useObserverNode();
        UnobserveComponent = Unobserve;
        version = versionValue;
        return null;
      };

      render(<TestHook />);

      expect(UnobserveComponent).toBeTypeOf('function');
      expect(version).toBe(1); // Initial version
    });

    it('should increment version when observed state changes', async () => {
      let versionValue = 0;

      const state = anchor({ count: 0 });

      const TestComponentWithObserver = () => {
        const [, version] = useObserverNode();
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

      const incrementButton = screen.getByTestId('increment');
      await act(async () => {
        incrementButton.click();
      });

      expect(versionValue).toBe(2);
    });

    it('should cleanup observer on unmount', () => {
      const destroySpy = vi.fn();

      const TestComponentWithObserver = () => {
        useObserverNode();
        mockObserverProp('destroy', destroySpy);
        return <div>Test</div>;
      };

      vi.advanceTimersByTime(10);

      const { unmount: unmount1 } = render(<TestComponentWithObserver />);
      unmount1();

      expect(destroySpy).toHaveBeenCalled();
    });
  });

  describe('Observed HoC', () => {
    it('should create an observed component that passes _state_version prop', () => {
      const ObservedComponent = observed(TestComponent);

      expect(ObservedComponent.displayName).toBe('Observed(TestComponent)');

      render(<ObservedComponent value={42} />);
      const element = screen.getByTestId('test-value');
      expect(element.textContent).toBe('42');
    });

    it('should update component when observed state changes', async () => {
      const state = anchor({ count: 0 });

      const CounterComponent: ComponentType<{ label: string } & AnchoredProps> = (props) => {
        return (
          <div>
            <span data-testid="count">{state.count}</span>
            <span data-testid="version">{props._state_version}</span>
          </div>
        );
      };

      const ObservedCounter = observed(CounterComponent);

      render(<ObservedCounter label="Counter" />);

      expect(screen.getByTestId('count').textContent).toBe('0');
      expect(screen.getByTestId('version').textContent).toBe('1');

      await act(async () => {
        state.count = 1;
      });

      expect(screen.getByTestId('count').textContent).toBe('1');
      expect(screen.getByTestId('version').textContent).toBe('2');
    });

    it('should set displayName correctly', () => {
      const TestComponentWithDisplayName: ComponentType<AnchoredProps> = () => <div>Test</div>;
      TestComponentWithDisplayName.displayName = 'CustomDisplayName';

      const Observed1 = observed(TestComponentWithDisplayName);
      const Observed2 = observed(TestComponent, 'CustomName');

      expect(Observed1.displayName).toBe('Observed(CustomDisplayName)');
      expect(Observed2.displayName).toBe('Observed(CustomName)');
    });

    it('should handle component without displayName or name', () => {
      const AnonymousComponent: ComponentType<AnchoredProps> = () => <div>Test</div>;
      Object.defineProperty(AnonymousComponent, 'name', { value: '' });

      const ObservedComponent = observed(AnonymousComponent);
      expect(ObservedComponent.displayName).toBe('Observed(Component)');
    });
  });

  describe('Utilities', () => {
    it('should remove _state_version property from props', () => {
      const props = {
        id: 'test',
        value: 42,
        _state_version: 3,
      };

      const cleaned = cleanProps(props);

      expect(cleaned).toEqual({
        id: 'test',
        value: 42,
      });
      expect(cleaned).not.toHaveProperty('_state_version');
    });

    it('should work with empty props', () => {
      const props = { _state_version: 1 };
      const cleaned = cleanProps(props);
      expect(cleaned).toEqual({});
    });

    it('should work when _state_version is the only property', () => {
      const props = { _state_version: 5 };
      const cleaned = cleanProps(props);
      expect(Object.keys(cleaned)).toHaveLength(0);
    });
  });

  describe('Integration', () => {
    it('should work with complex state changes', async () => {
      const state = anchor({
        user: {
          name: 'John',
          age: 30,
          hobbies: ['reading', 'coding'],
        },
      });

      const UserComponent: ComponentType<AnchoredProps> = (props) => {
        return (
          <div>
            <h1 data-testid="name">{state.user.name}</h1>
            <p data-testid="age">{state.user.age}</p>
            <ul>
              {state.user.hobbies.map((hobby, index) => (
                <li key={index} data-testid={`hobby-${index}`}>
                  {hobby}
                </li>
              ))}
            </ul>
            <span data-testid="version">{props._state_version}</span>
          </div>
        );
      };

      const ObservedUser = observed(UserComponent);
      render(<ObservedUser />);

      expect(screen.getByTestId('name').textContent).toBe('John');
      expect(screen.getByTestId('age').textContent).toBe('30');
      expect(screen.getByTestId('hobby-0').textContent).toBe('reading');
      expect(screen.getByTestId('hobby-1').textContent).toBe('coding');
      expect(screen.getByTestId('version').textContent).toBe('1');

      // Update name
      await act(async () => {
        state.user.name = 'Jane';
      });

      expect(screen.getByTestId('name').textContent).toBe('Jane');
      expect(screen.getByTestId('version').textContent).toBe('2');

      // Add hobby
      await act(async () => {
        state.user.hobbies.push('swimming');
      });

      expect(screen.getByTestId('hobby-2').textContent).toBe('swimming');
      expect(screen.getByTestId('version').textContent).toBe('3');
    });

    it('should properly cleanup multiple observers', () => {
      const destroySpy1 = vi.fn();
      const destroySpy2 = vi.fn();
      const destroySpies = [destroySpy1, destroySpy2];

      const TestComponentWithObserver = () => {
        useObserverNode();
        mockObserverProp('destroy', destroySpies.shift());
        return <div>Test</div>;
      };

      const { unmount } = render(
        <>
          <TestComponentWithObserver />
          <TestComponentWithObserver />
        </>
      );

      unmount();

      expect(destroySpy1).toHaveBeenCalled();
      expect(destroySpy2).toHaveBeenCalled();
    });
  });
});
